// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ReliefPools is Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;
    
    address public adminAddress;
    IERC20 public immutable usdcToken;
    
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
    bytes32 public constant DOMAIN_SEPARATOR = keccak256(
        abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("ReliefPools")),
            keccak256(bytes("1")),
            8453, // Base chain ID
            address(this)
        )
    );
    
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
        uint256 amount,
        uint256 timestamp
    );
    
    event PoolStatusChanged(uint256 indexed poolId, bool isActive);
    
    // Custom errors
    error InvalidPool();
    error PoolInactive();
    error InvalidSignature();
    error AlreadyClaimed();
    error NationalityMismatch();
    error InsufficientFunds();
    error InvalidAmount();
    error InvalidNationality();
    error InvalidRecipient();
    
    constructor(address _adminAddress, address _usdcToken) Ownable(_adminAddress) {
        adminAddress = _adminAddress;
        usdcToken = IERC20(_usdcToken);
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
        if (bytes(nationalityRequired).length == 0) revert InvalidNationality();
        if (allocatedFundsPerPerson == 0) revert InvalidAmount();
        
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
        if (pool.id != poolId) revert InvalidPool();
        if (!pool.isActive) revert PoolInactive();
        if (hasPersonClaimedFromPool[poolId][personHash]) revert AlreadyClaimed();
        if (recipient == address(0)) revert InvalidRecipient();
        
        // Verify nationality matches pool requirement
        if (keccak256(bytes(nationality)) != keccak256(bytes(pool.nationalityRequired))) {
            revert NationalityMismatch();
        }
        
        // Verify admin signature (still uses msg.sender as the verified user)
        if (!_verifyAdminSignature(msg.sender, nullifier, userIdentifier, nationality, timestamp, adminSignature)) {
            revert InvalidSignature();
        }
        
        // Check if pool has sufficient funds
        uint256 claimAmount = pool.allocatedFundsPerPerson;
        if (usdcToken.balanceOf(address(this)) < claimAmount) revert InsufficientFunds();
        
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
        claimRelief(poolId, nullifier, userIdentifier, nationality, timestamp, msg.sender, adminSignature);
    }
    
    /**
     * @dev Make a donation to a specific relief pool
     */
    function donate(uint256 poolId, uint256 amount) external {
        ReliefPool storage pool = reliefPools[poolId];
        
        if (pool.id != poolId) revert InvalidPool();
        if (!pool.isActive) revert PoolInactive();
        if (amount == 0) revert InvalidAmount();
        
        // Transfer USDC from donor to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update pool state
        pool.totalDonors++;
        pool.totalAmountDonated += amount;
        
        // Record donor
        poolDonors[poolId][msg.sender] = Donor({
            id: pool.totalDonors,
            walletAddress: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        });
        
        emit DonationMade(poolId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Toggle pool active status
     */
    function togglePoolStatus(uint256 poolId) external onlyOwner {
        ReliefPool storage pool = reliefPools[poolId];
        if (pool.id != poolId) revert InvalidPool();
        
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
