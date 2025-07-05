// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MockCCTPTransmitter {
    // Mock implementation for testing
    function transmitMessage(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes calldata messageBody
    ) external returns (uint64) {
        // Mock implementation - just return a dummy nonce
        return 123456;
    }
    
    function getNonce(uint32 sourceDomain) external pure returns (uint64) {
        return 1;
    }
} 