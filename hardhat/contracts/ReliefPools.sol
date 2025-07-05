// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-0.7/access/Ownable.sol";
import "@openzeppelin/contracts-0.7/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-0.7/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.7/token/ERC20/SafeERC20.sol";
import "./BurnMessageV2.sol";
import "./TypedMemView.sol";

// CCTP v2 Interface for handling cross-chain messages
interface IMessageHandlerV2 {
    /**
     * @notice Handles an incoming unfinalized message from an IReceiverV2
     * @dev Unfinalized messages have finality threshold values less than 2000
     * @param sourceDomain The source domain of the message
     * @param sender The sender of the message
     * @param finalityThresholdExecuted The finality threshold at which the message was attested to
     * @param messageBody The raw bytes of the message body
     * @return success True, if successful; false, if not.
     */
    function handleReceiveUnfinalizedMessage(
        uint32 sourceDomain,
        bytes32 sender,
        uint32 finalityThresholdExecuted,
        bytes calldata messageBody
    ) external returns (bool);

    function handleReceiveFinalizedMessage(
        uint32 sourceDomain,
        bytes32 sender,
        uint32 finalityThresholdExecuted,
        bytes calldata messageBody
    ) external returns (bool);
}

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ReliefPools is Ownable, IMessageHandlerV2 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;
    using BurnMessageV2 for bytes29;
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    
    address public adminAddress;
    IERC20 public immutable usdcToken;
    address public cctpMessageTransmitter; // CCTP Message Transmitter address
    
    uint256 public poolCounter;
    
    struct Beneficiary {
        uint256 nullifier;
        uint256 userIdentifier; // Self Protocol unique user id
        address walletAddress;
        uint256 amount; // usdc claimed
        uint256 timestamp;
    }

    struct Donor {
        uint256 id; // donor can claim twice, so we need to track the id per unique donation
        address walletAddress;
        uint256 amount; // usdc donated
        uint256 timestamp;
        bool isCrossChain; // whether this donation came via CCTP
        uint32 sourceDomain; // CCTP source domain (6 for Base direct donations, actual domain for cross-chain)
        string location; // lat:lng format (e.g., "40.7128:-74.0060")
    }

    enum DisasterTypeEnum {
        Earthquake,
        Flood,
        Wildfire,
        Warzone
    }

    enum ClassificationEnum {
        Critical,
        HighPriority
    }

    struct ReliefPool {
        uint256 id;
        DisasterTypeEnum disasterType;
        ClassificationEnum classification;
        string nationalityRequired; // ex. "Sudanese"
        uint256 allocatedFundsPerPerson; // 100 usdc
        uint256 totalBeneficiaries;
        uint256 totalDonors;
        uint256 totalAmountClaimed;
        uint256 totalAmountDonated;
        bool isActive;
    }
    
    // Domain separator for EIP-712 signatures
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // TypeHash for verification message (must match IdentityVerifier)
    bytes32 public constant VERIFICATION_MESSAGE_TYPEHASH = keccak256(
        "VerificationMessage(address userAddress,uint256 nullifier,uint256 userIdentifier,string nationality,uint256 timestamp)"
    );
    
    // Storage mappings
    mapping(uint256 => ReliefPool) public reliefPools;
    mapping(uint256 => mapping(address => Beneficiary)) public poolBeneficiaries;
    mapping(uint256 => mapping(address => Donor)) public poolDonors;
    mapping(uint256 => mapping(bytes32 => bool)) public hasPersonClaimedFromPool; // poolId => personHash => bool
    mapping(bytes32 => uint256[]) public personClaimedPools; // personHash => poolIds[]
    
    // Events
    event ReliefPoolCreated(
        uint256 indexed poolId,
        DisasterTypeEnum disasterType,
        ClassificationEnum classification,
        string nationalityRequired,
        uint256 allocatedFundsPerPerson
    );
    
    event FundsClaimed(
        uint256 indexed poolId,
        address indexed claimer,
        address indexed recipient,
        uint256 nullifier,
        uint256 userIdentifier,
        string nationality,
        uint256 amount,
        uint256 timestamp
    );
    
    event DonationMade(
        uint256 indexed poolId,
        address indexed donor,
        uint32 sourceDomain, // 6 for Base (direct donations), actual domain for cross-chain
        uint256 amount,
        uint256 timestamp,
        string location // lat:lng format (e.g., "40.7128:-74.0060")
    );
    
    event PoolStatusChanged(uint256 indexed poolId, bool isActive);
    
    // Custom errors (using revert with reason strings in 0.7.6)
    // error InvalidPool();
    // error PoolInactive();
    // error InvalidSignature();
    // error AlreadyClaimed();
    // error NationalityMismatch(string nationality, string nationalityRequired);
    // error InsufficientFunds();
    // error InvalidAmount();
    // error InvalidNationality();
    // error InvalidRecipient();
    // error UnauthorizedCaller();
    // error InvalidMessageBody();
    
    constructor(
        address _adminAddress, 
        address _usdcToken,
        address _cctpMessageTransmitter
    ) {
        adminAddress = _adminAddress;
        usdcToken = IERC20(_usdcToken);
        cctpMessageTransmitter = _cctpMessageTransmitter;
        transferOwnership(_adminAddress);
        
        // Initialize DOMAIN_SEPARATOR
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ReliefPools")),
                keccak256(bytes("1")),
                8453, // Base chain ID
                address(this)
            )
        );
    }
    
    /**
     * @dev Modifier to ensure only CCTP Message Transmitter can call hook functions
     */
    modifier onlyCCTPTransmitter() {
        require(msg.sender == cctpMessageTransmitter, "UnauthorizedCaller");
        _;
    }
    
    /**
     * @dev Create a new relief pool
     */
    function createReliefPool(
        DisasterTypeEnum disasterType,
        ClassificationEnum classification,
        string memory nationalityRequired,
        uint256 allocatedFundsPerPerson
    ) external onlyOwner returns (uint256) {
        require(bytes(nationalityRequired).length > 0, "InvalidNationality");
        require(allocatedFundsPerPerson > 0, "InvalidAmount");
        
        uint256 poolId = poolCounter++;
        
        reliefPools[poolId] = ReliefPool({
            id: poolId,
            disasterType: disasterType,
            classification: classification,
            nationalityRequired: nationalityRequired,
            allocatedFundsPerPerson: allocatedFundsPerPerson,
            totalBeneficiaries: 0,
            totalDonors: 0,
            totalAmountClaimed: 0,
            totalAmountDonated: 0,
            isActive: true
        });
        
        emit ReliefPoolCreated(
            poolId,
            disasterType,
            classification,
            nationalityRequired,
            allocatedFundsPerPerson
        );
        
        return poolId;
    }

    // Not used for now, but required by the interface
    function handleReceiveFinalizedMessage(
        uint32 sourceDomain,
        bytes32 sender,
        uint32 finalityThresholdExecuted,
        bytes calldata messageBody
    ) external override returns (bool) {
        return true;
    }

    /**
     * @dev CCTP v2 hook function to handle cross-chain donations
     * @param sourceDomain The source domain of the message
     * @param sender The sender of the message (as bytes32)
     * @param finalityThresholdExecuted The finality threshold at which the message was attested to
     * @param messageBody The raw bytes of the message body containing poolId
     */
    function handleReceiveUnfinalizedMessage(
        uint32 sourceDomain,
        bytes32 sender,
        uint32 finalityThresholdExecuted,
        bytes calldata messageBody
    ) external override onlyCCTPTransmitter returns (bool) {
        try this._processCrossChainDonation(sourceDomain, sender, messageBody) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Internal function to process cross-chain donation
     * @param sourceDomain The source domain of the message
     * @param sender The sender of the message (as bytes32)
     * @param messageBody The raw bytes containing the burn message structure
     */
    function _processCrossChainDonation(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external {
        // Only allow the contract itself to call this (for try/catch)
        require(msg.sender == address(this), "Internal function only");
        
        bytes29 _msg = messageBody.ref(0);
        
        // Validate message format
        _msg._validateBurnMessageFormat();
        
        // Extract hook data
        bytes29 hookDataView = _msg._getHookData();
        require(hookDataView.len() > 0, "No hook data provided");
        bytes memory hookData = hookDataView.clone();
        
        // Decode hook data: poolId and location
        (uint256 poolId, string memory location) = abi.decode(hookData, (uint256, string));
        
        // Extract donation amount
        uint256 donationAmount = _msg._getAmount();
        
        ReliefPool storage pool = reliefPools[poolId];
        
        // Validation checks
        require(pool.id == poolId, "InvalidPool");
        require(pool.isActive, "PoolInactive");
        require(donationAmount > 0, "InvalidAmount");
        
        // Update pool state
        pool.totalDonors++;
        pool.totalAmountDonated += donationAmount;
        
        // Convert bytes32 sender to address (taking last 20 bytes)
        address senderAddress = address(uint160(uint256(sender)));
        
        // Record cross-chain donor
        poolDonors[poolId][senderAddress] = Donor({
            id: pool.totalDonors,
            walletAddress: senderAddress,
            amount: donationAmount,
            timestamp: block.timestamp,
            isCrossChain: true,
            sourceDomain: sourceDomain,
            location: "cross-chain" // simplified for now
        });
        
        emit DonationMade(
            poolId,
            senderAddress,
            sourceDomain,
            donationAmount,
            block.timestamp,
            "cross-chain"
        );
    }
    
    /**
     * @dev Make a direct donation to a specific relief pool (on Base network)
     */
    function donate(uint256 poolId, uint256 amount, string memory location) external {
        ReliefPool storage pool = reliefPools[poolId];
        
        require(pool.id == poolId, "InvalidPool");
        require(pool.isActive, "PoolInactive");
        require(amount > 0, "InvalidAmount");
        
        // Transfer USDC from donor to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update pool state
        pool.totalDonors++;
        pool.totalAmountDonated += amount;
        
        // Record direct donor
        poolDonors[poolId][msg.sender] = Donor({
            id: pool.totalDonors,
            walletAddress: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            isCrossChain: false,
            sourceDomain: 6, // 6 for Base chain (direct donations)
            location: location
        });
        
        emit DonationMade(
            poolId,
            msg.sender,
            6, // 6 for Base chain (direct donations)
            amount,
            block.timestamp,
            location
        );
    }
    
    /**
     * @dev Set CCTP Message Transmitter address (only owner)
     */
    function setCCTPMessageTransmitter(address _cctpMessageTransmitter) external onlyOwner {
        cctpMessageTransmitter = _cctpMessageTransmitter;
    }
    
    /**
     * @dev Claim relief funds with admin signature verification
     */
    function claimRelief(
        uint256 poolId,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        address recipient,
        bytes memory adminSignature
    ) external {
        ReliefPool storage pool = reliefPools[poolId];
        
        // Generate unique person hash from nullifier + userIdentifier
        bytes32 personHash = _generatePersonHash(nullifier, userIdentifier);
        
        // Validation checks
        require(pool.id == poolId, "InvalidPool");
        require(pool.isActive, "PoolInactive");
        require(!hasPersonClaimedFromPool[poolId][personHash], "AlreadyClaimed");
        require(recipient != address(0), "InvalidRecipient");
        
        // Verify nationality matches pool requirement
        require(
            keccak256(bytes(nationality)) == keccak256(bytes(pool.nationalityRequired)),
            "NationalityMismatch"
        );
        
        // Verify admin signature (still uses msg.sender as the verified user)
        require(
            _verifyAdminSignature(msg.sender, nullifier, userIdentifier, nationality, timestamp, adminSignature),
            "InvalidSignature"
        );
        
        // Check if pool has sufficient funds
        uint256 claimAmount = pool.allocatedFundsPerPerson;
        require(usdcToken.balanceOf(address(this)) >= claimAmount, "InsufficientFunds");
        
        // Update pool state
        pool.totalBeneficiaries++;
        pool.totalAmountClaimed += claimAmount;
        
        // Record beneficiary (using recipient address for token delivery)
        poolBeneficiaries[poolId][recipient] = Beneficiary({
            nullifier: nullifier,
            userIdentifier: userIdentifier,
            walletAddress: recipient,
            amount: claimAmount,
            timestamp: block.timestamp
        });
        
        // Mark as claimed (using person hash, not wallet address)
        hasPersonClaimedFromPool[poolId][personHash] = true;
        personClaimedPools[personHash].push(poolId);
        
        // Transfer funds to recipient
        usdcToken.safeTransfer(recipient, claimAmount);
        
        emit FundsClaimed(
            poolId,
            msg.sender,
            recipient,
            nullifier,
            userIdentifier,
            nationality,
            claimAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Claim relief funds to the same address (convenience function)
     */
    function claimReliefToSelf(
        uint256 poolId,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory adminSignature
    ) external {
        this.claimRelief(poolId, nullifier, userIdentifier, nationality, timestamp, msg.sender, adminSignature);
    }
    
    /**
     * @dev Toggle pool active status
     */
    function togglePoolStatus(uint256 poolId) external onlyOwner {
        ReliefPool storage pool = reliefPools[poolId];
        require(pool.id == poolId, "InvalidPool");
        
        pool.isActive = !pool.isActive;
        emit PoolStatusChanged(poolId, pool.isActive);
    }
    
    /**
     * @dev Generate unique person hash from nullifier and userIdentifier
     */
    function _generatePersonHash(uint256 nullifier, uint256 userIdentifier) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nullifier, userIdentifier));
    }
    
    /**
     * @dev Verify admin signature for relief claim
     */
    function _verifyAdminSignature(
        address userAddress,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                VERIFICATION_MESSAGE_TYPEHASH,
                userAddress,
                nullifier,
                userIdentifier,
                keccak256(bytes(nationality)),
                timestamp
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        address signer = digest.recover(signature);
        return signer == adminAddress;
    }
    
    /**
     * @dev Get relief pool information
     */
    function getReliefPool(uint256 poolId) external view returns (ReliefPool memory) {
        return reliefPools[poolId];
    }
    
    /**
     * @dev Get beneficiary information for a pool
     */
    function getBeneficiary(uint256 poolId, address beneficiary) external view returns (Beneficiary memory) {
        return poolBeneficiaries[poolId][beneficiary];
    }
    
    /**
     * @dev Get donor information for a pool
     */
    function getDonor(uint256 poolId, address donor) external view returns (Donor memory) {
        return poolDonors[poolId][donor];
    }
    
    /**
     * @dev Check if person has claimed from a specific pool using nullifier and userIdentifier
     */
    function checkPersonClaimedFromPool(uint256 poolId, uint256 nullifier, uint256 userIdentifier) external view returns (bool) {
        bytes32 personHash = _generatePersonHash(nullifier, userIdentifier);
        return hasPersonClaimedFromPool[poolId][personHash];
    }
    
    /**
     * @dev Get all pools a person has claimed from using nullifier and userIdentifier
     */
    function getPersonClaimedPools(uint256 nullifier, uint256 userIdentifier) external view returns (uint256[] memory) {
        bytes32 personHash = _generatePersonHash(nullifier, userIdentifier);
        return personClaimedPools[personHash];
    }
    
    /**
     * @dev Generate person hash (public function for frontend use)
     */
    function generatePersonHash(uint256 nullifier, uint256 userIdentifier) external pure returns (bytes32) {
        return _generatePersonHash(nullifier, userIdentifier);
    }

    /**
     * @dev Verify admin signature for relief claim
     */
    function verifyAdminSignature(
        address userAddress,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory adminSignature
    ) external view returns (bool) {
      return _verifyAdminSignature(userAddress, nullifier, userIdentifier, nationality, timestamp, adminSignature);
    }
    
    /**
     * @dev Get contract USDC balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        usdcToken.safeTransfer(adminAddress, amount);
    }
    
    /**
     * @dev Get total number of pools
     */
    function getTotalPools() external view returns (uint256) {
        return poolCounter;
    }
}
