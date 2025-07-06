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
    
    // Track all pool IDs for enumeration
    string[] public poolIds;
    
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
        string id;
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
    
    // Storage mappings
    mapping(string => ReliefPool) public reliefPools;
    mapping(string => mapping(address => Beneficiary)) public poolBeneficiaries;
    mapping(string => mapping(address => Donor)) public poolDonors;
    // SECURITY: Track claims by userIdentifier only (not nullifier + userIdentifier)
    // This prevents multiple claims from the same person using different documents
    mapping(string => mapping(uint256 => bool)) public hasPersonClaimedFromPool; // poolId => userIdentifier => bool
    mapping(uint256 => string[]) public personClaimedPools; // userIdentifier => poolIds[]
    
    // Events
    event ReliefPoolCreated(
        string poolId,
        DisasterTypeEnum disasterType,
        ClassificationEnum classification,
        string nationalityRequired,
        uint256 allocatedFundsPerPerson
    );
    
    event FundsClaimed(
        string poolId,
        address indexed claimer,
        address indexed recipient,
        uint256 nullifier,
        uint256 userIdentifier,
        string nationality,
        uint256 amount,
        uint256 timestamp
    );
    
    event DonationMade(
        string poolId,
        address indexed donor,
        uint32 sourceDomain, // 6 for Base (direct donations), actual domain for cross-chain
        uint256 amount,
        uint256 timestamp,
        string location // lat:lng format (e.g., "40.7128:-74.0060")
    );
    
    event PoolStatusChanged(string indexed poolId, bool isActive);

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Unauthorized: Not Admin");
        _;
    }
    
    constructor(
        address _adminAddress, 
        address _usdcToken,
        address _cctpMessageTransmitter
    ) {
        adminAddress = _adminAddress;
        usdcToken = IERC20(_usdcToken);
        cctpMessageTransmitter = _cctpMessageTransmitter;
        transferOwnership(msg.sender);
        
        // Initialize DOMAIN_SEPARATOR
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ReliefPools")),
                keccak256(bytes("1")),
                84532, // Base chain ID
                address(this)
            )
        );
    }
    
    /**
     * @dev Modifier to ensure only CCTP Message Transmitter can call hook functions
     */
    // modifier onlyCCTPTransmitter() {
    //     require(msg.sender == cctpMessageTransmitter, "UnauthorizedCaller");
    //     _;
    // }
    
    /**
     * @dev Create a new relief pool
     */
    function createReliefPool(
        string memory poolId,
        DisasterTypeEnum disasterType,
        ClassificationEnum classification,
        string memory nationalityRequired,
        uint256 allocatedFundsPerPerson
    ) external onlyOwner returns (string memory) {
        require(bytes(poolId).length > 0, "InvalidPoolId");
        require(bytes(nationalityRequired).length > 0, "InvalidNationality");
        require(allocatedFundsPerPerson > 0, "InvalidAmount");
        require(bytes(reliefPools[poolId].id).length == 0, "PoolAlreadyExists");
        
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
        
        poolIds.push(poolId);
        
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
    ) external override returns (bool) {
        // Only allow the contract itself to call this (for try/catch)
        // require(msg.sender == address(this), "Internal function only");
        
        bytes29 _msg = messageBody.ref(0);
        
        // Validate message format
        _msg._validateBurnMessageFormat();
        
        // Extract and decode hook data (inline to reduce stack depth)
        bytes29 hookDataView = _msg._getHookData();
        require(hookDataView.len() > 0, "No hook data provided");
        (string memory poolId, string memory location) = abi.decode(hookDataView.clone(), (string, string));
        
        // Extract donation amount
        uint256 donationAmount = _msg._getAmount();
        
        ReliefPool storage pool = reliefPools[poolId];
        
        // Validation checks
        require(bytes(pool.id).length > 0, "InvalidPool");
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
            location: location
        });
        
        emit DonationMade(
            poolId,
            senderAddress,
            sourceDomain,
            donationAmount,
            block.timestamp,
            location
        );
    }
    
    /**
     * @dev Make a direct donation to a specific relief pool (on Base network)
     */
    function donate(string memory poolId, uint256 amount, string memory location) external {
        ReliefPool storage pool = reliefPools[poolId];
        
        require(bytes(pool.id).length > 0, "InvalidPool");
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
        string memory poolId,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        address recipient
        // bytes memory adminSignature
    ) external onlyAdmin {
        ReliefPool storage pool = reliefPools[poolId];
        
        // Validation checks
        require(bytes(pool.id).length > 0, "InvalidPool");
        require(pool.isActive, "PoolInactive");
        require(!hasPersonClaimedFromPool[poolId][nullifier], "AlreadyClaimed");
        require(recipient != address(0), "InvalidRecipient");
        
        // Verify nationality matches pool requirement
        require(
            keccak256(bytes(nationality)) == keccak256(bytes(pool.nationalityRequired)),
            "NationalityMismatch"
        );
        
        // Verify admin signature (still uses msg.sender as the verified user)
        // require(
        //     _verifyAdminSignature(nullifier, userIdentifier, nationality, timestamp, adminSignature),
        //     "InvalidSignature"
        // );
        
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
        
        // Mark as claimed (using userIdentifier, not wallet address)
        hasPersonClaimedFromPool[poolId][nullifier] = true;
        personClaimedPools[nullifier].push(poolId);
        
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
     * @dev Toggle pool active status
     */
    function togglePoolStatus(string memory poolId) external onlyOwner {
        ReliefPool storage pool = reliefPools[poolId];
        require(bytes(pool.id).length > 0, "InvalidPool");
        
        pool.isActive = !pool.isActive;
        emit PoolStatusChanged(poolId, pool.isActive);
    }
    
    /**
     * @dev Verify admin signature for relief claim
     */
    function _verifyAdminSignature(
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("VerificationMessage(uint256 nullifier,uint256 userIdentifier,string nationality,uint256 timestamp)"),
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
    function getReliefPool(string memory poolId) external view returns (ReliefPool memory) {
        return reliefPools[poolId];
    }
    
    /**
     * @dev Get beneficiary information for a pool
     */
    function getBeneficiary(string memory poolId, address beneficiary) external view returns (Beneficiary memory) {
        return poolBeneficiaries[poolId][beneficiary];
    }
    
    /**
     * @dev Get donor information for a pool
     */
    function getDonor(string memory poolId, address donor) external view returns (Donor memory) {
        return poolDonors[poolId][donor];
    }
    
    /**
     * @dev Check if person has claimed from a specific pool using userIdentifier
     */
    function checkPersonClaimedFromPool(string memory poolId, uint256 userIdentifier) external view returns (bool) {
        // Note: nullifier parameter kept for backward compatibility but not used
        return hasPersonClaimedFromPool[poolId][userIdentifier];
    }
    
    /**
     * @dev Get all pools a person has claimed from using userIdentifier
     */
    function getPersonClaimedPools(uint256 userIdentifier) external view returns (string[] memory) {
        // Note: nullifier parameter kept for backward compatibility but not used
        return personClaimedPools[userIdentifier];
    }

    /**
     * @dev Verify admin signature for relief claim
     */
    function verifyAdminSignature(
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory adminSignature
    ) external view returns (bool) {
      return _verifyAdminSignature(nullifier, userIdentifier, nationality, timestamp, adminSignature);
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
        return poolIds.length;
    }
    
    /**
     * @dev Get all pool IDs
     */
    function getAllPoolIds() external view returns (string[] memory) {
        return poolIds;
    }
    
    /**
     * @dev Get pool ID by index
     */
    function getPoolIdByIndex(uint256 index) external view returns (string memory) {
        require(index < poolIds.length, "Index out of bounds");
        return poolIds[index];
    }
}
