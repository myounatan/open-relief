// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {AttestationId} from "@selfxyz/contracts/contracts/constants/AttestationId.sol";

contract IdentityVerifier is SelfVerificationRoot, Ownable {
    using ECDSA for bytes32;
    
    address public adminAddress;
    bytes32 public immutable configId;
    
    // Maps nullifiers to user identifiers for verification tracking
    mapping(uint256 => uint256) internal _nullifierToUserIdentifier;
    
    // Maps user identifiers to verification status
    mapping(uint256 => bool) internal _verifiedUserIdentifiers;
    
    // Maps user addresses to their verification data
    mapping(address => VerificationData) public verifiedUsers;
    
    // Maps user addresses to their admin signatures
    mapping(address => bytes) public adminSignatures;
    
    // Domain separator for EIP-712 signatures (for Base chain)
    bytes32 public constant DOMAIN_SEPARATOR = keccak256(
        abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("IdentityVerifier")),
            keccak256(bytes("1")),
            84532, // Base sepolia chain ID - signatures will be used on Base
            address(this)
        )
    );
    
    // TypeHash for verification message
    bytes32 public constant VERIFICATION_MESSAGE_TYPEHASH = keccak256(
        "VerificationMessage(address userAddress,uint256 nullifier,uint256 userIdentifier,string nationality,uint256 timestamp)"
    );
    
    struct VerificationData {
        uint256 nullifier;
        uint256 userIdentifier;
        string nationality;
        uint256 timestamp;
        bool isVerified;
    }
    
    // Events
    event UserVerified(
        address indexed userAddress,
        uint256 indexed nullifier,
        uint256 indexed userIdentifier,
        string nationality,
        uint256 timestamp
    );
    
    event AdminSignatureGenerated(
        address indexed userAddress,
        bytes signature,
        uint256 timestamp
    );
    
    // Custom errors
    error InvalidUserIdentifier();
    error RegisteredNullifier();
    error UserIdentifierAlreadyVerified();
    error UserNotVerified();
    error InvalidSignature();
    error InvalidNationality();
    
    constructor(
        address _adminAddress,
        address _identityVerificationHubV2,
        uint256 _scope,
        bytes32 _configId
    ) 
        SelfVerificationRoot(_identityVerificationHubV2, _scope)
        Ownable(_adminAddress)
    {
        adminAddress = _adminAddress;
        configId = _configId;
    }
    
    /**
     * @dev Required: Override to provide configId for verification
     */
    function getConfigId(
        bytes32 destinationChainId,
        bytes32 userIdentifier, 
        bytes memory userDefinedData
    ) public view override returns (bytes32) {
        return configId;
    }
    
    /**
     * @dev Override to handle successful verification and generate admin signature
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // Validation checks (similar to airdrop example)
        if (output.userIdentifier == 0) revert InvalidUserIdentifier();
        if (_nullifierToUserIdentifier[output.nullifier] != 0) revert RegisteredNullifier();
        if (_verifiedUserIdentifiers[output.userIdentifier]) revert UserIdentifierAlreadyVerified();
        if (bytes(output.nationality).length == 0) revert InvalidNationality();
        
        // Get the user's address from the transaction context
        address userAddress = msg.sender;
        
        // Store verification data
        _nullifierToUserIdentifier[output.nullifier] = output.userIdentifier;
        _verifiedUserIdentifiers[output.userIdentifier] = true;
        
        verifiedUsers[userAddress] = VerificationData({
            nullifier: output.nullifier,
            userIdentifier: output.userIdentifier,
            nationality: output.nationality,
            timestamp: block.timestamp,
            isVerified: true
        });
        
        // Generate admin signature automatically
        bytes memory adminSignature = _generateAdminSignature(
            userAddress,
            output.nullifier,
            output.userIdentifier,
            output.nationality,
            block.timestamp
        );
        
        // Store the signature
        adminSignatures[userAddress] = adminSignature;
        
        emit UserVerified(
            userAddress, 
            output.nullifier, 
            output.userIdentifier, 
            output.nationality, 
            block.timestamp
        );
        
        emit AdminSignatureGenerated(
            userAddress,
            adminSignature,
            block.timestamp
        );
    }
    
    /**
     * @dev Generate admin signature for verified user (internal)
     */
    function _generateAdminSignature(
        address userAddress,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp
    ) internal view returns (bytes memory) {
        // Create EIP-712 structured message
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
        
        // In a real implementation, this would be signed off-chain by the admin
        // For now, we return the digest that needs to be signed
        // The actual signing should happen off-chain with the admin's private key
        return abi.encode(digest);
    }
    
    /**
     * @dev Get admin signature for a verified user
     */
    function getAdminSignature(address userAddress) external view returns (bytes memory) {
        if (!verifiedUsers[userAddress].isVerified) revert UserNotVerified();
        return adminSignatures[userAddress];
    }
    
    /**
     * @dev Get message hash that needs to be signed by admin (for off-chain signing)
     */
    function getMessageHash(
        address userAddress,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp
    ) external pure returns (bytes32) {
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
        
        return keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
    }
    
    /**
     * @dev Verify admin signature (utility function for testing)
     */
    function verifyAdminSignature(
        address userAddress,
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory signature
    ) external view returns (bool) {
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
     * @dev Get verification data for a user
     */
    function getVerificationData(address userAddress) external view returns (VerificationData memory) {
        return verifiedUsers[userAddress];
    }
    
    /**
     * @dev Check if a user is verified
     */
    function isUserVerified(address userAddress) external view returns (bool) {
        return verifiedUsers[userAddress].isVerified;
    }
    
    /**
     * @dev Get the current config ID
     */
    function getConfigId() external view returns (bytes32) {
        return configId;
    }
    
    /**
     * @dev Get the current scope
     */
    function getScope() external view returns (uint256) {
        return scope;
    }
}
