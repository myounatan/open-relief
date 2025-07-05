// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

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
    address public reliefPoolsContract; // ReliefPools contract address for signature verification
    
    // Maps nullifiers to user identifiers for verification tracking
    mapping(uint256 => uint256) internal _nullifierToUserIdentifier;
    
    // Maps user identifiers to verification status
    mapping(uint256 => bool) internal _verifiedUserIdentifiers;
    
    // Maps nullifier to their verification data
    mapping(uint256 => VerificationData) public verifiedUsers; // nullifier => VerificationData
    
    // Maps nullifier to their admin signatures
    mapping(uint256 => bytes) public adminSignatures; // nullifier => admin signature
    
    // Maps nullifier to message hashes that need to be signed
    mapping(uint256 => bytes32) public messageHashes; // nullifier => message hash
    
    // TypeHash for verification message (must match ReliefPools)
    bytes32 public constant VERIFICATION_MESSAGE_TYPEHASH = keccak256(
        "VerificationMessage(uint256 nullifier,uint256 userIdentifier,string nationality,uint256 timestamp)"
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
        uint256 indexed nullifier,
        uint256 indexed userIdentifier,
        string nationality,
        address userAddress,
        string reliefPoolId,
        uint256 timestamp
    );
    
    event AdminSignatureGenerated(
        uint256 indexed nullifier,
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
        bytes32 _configId,
        address _reliefPoolsContract
    ) 
        SelfVerificationRoot(_identityVerificationHubV2, _scope)
        Ownable(_adminAddress)
    {
        adminAddress = _adminAddress;
        configId = _configId;
        _setScope(_scope);

        reliefPoolsContract = _reliefPoolsContract;
    }
    
    /**
     * @dev Required: Override to provide configId for verification
     */
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */, 
        bytes memory /* userDefinedData */
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
        // // Validation checks (similar to airdrop example)
        // if (output.userIdentifier == 0) revert InvalidUserIdentifier();
        // if (_nullifierToUserIdentifier[output.nullifier] != 0) revert RegisteredNullifier();
        // if (_verifiedUserIdentifiers[output.userIdentifier]) revert UserIdentifierAlreadyVerified();
        if (bytes(output.nationality).length == 0) revert InvalidNationality();
                
        // // Store verification data
        // // _nullifierToUserIdentifier[output.nullifier] = output.userIdentifier;
        // // _verifiedUserIdentifiers[output.userIdentifier] = true;
        
        verifiedUsers[output.nullifier] = VerificationData({
            nullifier: output.nullifier,
            userIdentifier: output.userIdentifier,
            nationality: output.nationality,
            timestamp: block.timestamp,
            isVerified: true
        });
        
        // Generate message hash that needs to be signed by admin off-chain
        bytes32 messageHash = _generateMessageHash(
            output.nullifier,
            output.userIdentifier,
            output.nationality,
            block.timestamp
        );
        
        // Store the message hash - admin will sign this off-chain
        messageHashes[output.nullifier] = messageHash;

        address userAddress = userIdentifierToAddress(output.userIdentifier);

        // Decode userData from 64-byte hex string back to pool ID string
        string memory poolIdString = _bytesToString(userData);
        
        // Validate that the pool ID is not empty
        require(bytes(poolIdString).length > 0, "Pool ID cannot be empty");

        emit UserVerified(
            output.nullifier, 
            output.userIdentifier, 
            output.nationality, 
            userAddress,
            poolIdString,
            block.timestamp
        );
        return;
    }
    
    /**
     * @dev Generate message hash that needs to be signed by admin (internal)
     */
    function _generateMessageHash(
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp
    ) internal view returns (bytes32) {
        // Create EIP-712 structured message
        bytes32 structHash = keccak256(
            abi.encode(
                VERIFICATION_MESSAGE_TYPEHASH,
                nullifier,
                userIdentifier,
                keccak256(bytes(nationality)),
                timestamp
            )
        );
        
        // Use ReliefPools domain separator for signature verification
        bytes32 reliefPoolsDomainSeparator = _getReliefPoolsDomainSeparator();
        
        return keccak256(
            abi.encodePacked("\x19\x01", reliefPoolsDomainSeparator, structHash)
        );
    }
    
    /**
     * @dev Get ReliefPools domain separator for signature verification
     */
    function _getReliefPoolsDomainSeparator() internal view returns (bytes32) {
        require(reliefPoolsContract != address(0), "ReliefPools contract not set");
        
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ReliefPools")),
                keccak256(bytes("1")),
                8453, // Base chain ID
                reliefPoolsContract
            )
        );
    }
    
    /**
     * @dev Set admin signature for a verified user (only admin can call)
     */
    function setAdminSignature(uint256 nullifier, bytes memory signature) external {
        require(msg.sender == adminAddress, "Unauthorized: Not Admin");
        require(verifiedUsers[nullifier].isVerified, "User not verified");
        require(signature.length == 65, "Invalid signature length");
        
        adminSignatures[nullifier] = signature;
        
        emit AdminSignatureGenerated(
            nullifier,
            signature,
            block.timestamp
        );
    }
    
    /**
     * @dev Get message hash that needs to be signed by admin
     */
    function getMessageHashToSign(uint256 nullifier) external view returns (bytes32) {
        if (!verifiedUsers[nullifier].isVerified) revert UserNotVerified();
        return messageHashes[nullifier];
    }
    
    /**
     * @dev Get admin signature for a verified user
     */
    function getAdminSignature(uint256 nullifier) external view returns (bytes memory) {
        if (!verifiedUsers[nullifier].isVerified) revert UserNotVerified();
        require(adminSignatures[nullifier].length > 0, "Signature not set");
        return adminSignatures[nullifier];
    }
    
    /**
     * @dev Get message hash that needs to be signed by admin (for off-chain signing)
     */
    function getMessageHash(
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                VERIFICATION_MESSAGE_TYPEHASH,
                nullifier,
                userIdentifier,
                keccak256(bytes(nationality)),
                timestamp
            )
        );
        
        // Use ReliefPools domain separator for signature verification
        bytes32 reliefPoolsDomainSeparator = _getReliefPoolsDomainSeparator();
        
        return keccak256(
            abi.encodePacked("\x19\x01", reliefPoolsDomainSeparator, structHash)
        );
    }
    
    /**
     * @dev Verify admin signature (utility function for testing)
     */
    function verifyAdminSignature(
        uint256 nullifier,
        uint256 userIdentifier,
        string memory nationality,
        uint256 timestamp,
        bytes memory signature
    ) external view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                VERIFICATION_MESSAGE_TYPEHASH,
                nullifier,
                userIdentifier,
                keccak256(bytes(nationality)),
                timestamp
            )
        );
        
        // Use ReliefPools domain separator for signature verification
        bytes32 reliefPoolsDomainSeparator = _getReliefPoolsDomainSeparator();
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", reliefPoolsDomainSeparator, structHash)
        );
        
        address signer = digest.recover(signature);
        return signer == adminAddress;
    }
    
    /**
     * @dev Get verification data for a user
     */
    function getVerificationData(uint256 nullifier) external view returns (VerificationData memory) {
        return verifiedUsers[nullifier];
    }
    
    /**
     * @dev Check if a user is verified
     */
    function isUserVerified(uint256 nullifier) external view returns (bool) {
        return verifiedUsers[nullifier].isVerified;
    }
    
    /**
     * @dev Get the current config ID
     */
    function getConfigId() external view returns (bytes32) {
        return configId;
    }

    /**
     * @dev Set the scope
     */
    function setScope(uint256 _scope) external onlyOwner {
        _setScope(_scope);
    }
    
    /**
     * @dev Set the ReliefPools contract address for signature verification
     */
    function setReliefPoolsContract(address _reliefPoolsContract) external onlyOwner {
        reliefPoolsContract = _reliefPoolsContract;
    }

    /**
     * @dev Convert userIdentifier to address
     */
    function userIdentifierToAddress(uint256 userIdentifier) public pure returns (address) {
        return address(uint160(userIdentifier));
    }

    /**
     * @dev Get the address associated with a verified user's nullifier
     */
    function getVerifiedUserAddress(uint256 nullifier) external view returns (address) {
        require(verifiedUsers[nullifier].isVerified, "User not verified");
        return userIdentifierToAddress(verifiedUsers[nullifier].userIdentifier);
    }

    /**
     * @dev Convert bytes to string, removing null bytes padding
     */
    function _bytesToString(bytes memory data) internal pure returns (string memory) {
        // Find the actual length (first null byte)
        uint256 length = 0;
        for (uint256 i = 0; i < data.length; i++) {
            if (data[i] == 0) {
                length = i;
                break;
            }
        }
        
        // If no null byte found, use full length
        if (length == 0) {
            length = data.length;
        }
        
        // Create new bytes array with actual length
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[i];
        }
        
        return string(result);
    }
}
