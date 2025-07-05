import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("IdentityVerifier", function () {
  // Mock data for testing
  const MOCK_NULLIFIER = ethers.keccak256(ethers.toUtf8Bytes("nullifier1"));
  const MOCK_USER_IDENTIFIER = ethers.keccak256(ethers.toUtf8Bytes("userIdentity1"));
  const MOCK_NATIONALITY = "Ukrainian";
  const MOCK_CONFIG_ID = ethers.keccak256(ethers.toUtf8Bytes("test-config"));
  const MOCK_SCOPE = 12345;

  async function deployIdentityVerifierFixture() {
    const [owner, admin, user, otherAccount] = await hre.ethers.getSigners();

    // Deploy mock Identity Verification Hub
    const MockIdentityVerificationHub = await ethers.getContractFactory("MockIdentityVerificationHub");
    const mockHub = await MockIdentityVerificationHub.deploy();

    // Deploy IdentityVerifier
    const IdentityVerifier = await hre.ethers.getContractFactory("IdentityVerifier");
    const identityVerifier = await IdentityVerifier.deploy(
      admin.address,
      mockHub.target,
      MOCK_SCOPE,
      MOCK_CONFIG_ID
    );

    return {
      identityVerifier,
      mockHub,
      owner,
      admin,
      user,
      otherAccount,
      MOCK_NULLIFIER,
      MOCK_USER_IDENTIFIER,
      MOCK_NATIONALITY,
      MOCK_CONFIG_ID,
      MOCK_SCOPE
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin address", async function () {
      const { identityVerifier, admin } = await loadFixture(deployIdentityVerifierFixture);
      expect(await identityVerifier.adminAddress()).to.equal(admin.address);
    });

    it("Should set the correct config ID", async function () {
      const { identityVerifier, MOCK_CONFIG_ID } = await loadFixture(deployIdentityVerifierFixture);
      expect(await identityVerifier.getConfigId()).to.equal(MOCK_CONFIG_ID);
    });

    it("Should set the correct scope", async function () {
      const { identityVerifier, MOCK_SCOPE } = await loadFixture(deployIdentityVerifierFixture);
      expect(await identityVerifier.getScope()).to.equal(MOCK_SCOPE);
    });

    it("Should initialize DOMAIN_SEPARATOR correctly", async function () {
      const { identityVerifier } = await loadFixture(deployIdentityVerifierFixture);
      const domainSeparator = await identityVerifier.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Admin Signature Generation", function () {
    it("Should generate message hash correctly", async function () {
      const { identityVerifier, user, MOCK_NULLIFIER, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const messageHash = await identityVerifier.getMessageHash(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      expect(messageHash).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should generate different message hashes for different users", async function () {
      const { identityVerifier, user, otherAccount, MOCK_NULLIFIER, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const messageHash1 = await identityVerifier.getMessageHash(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      const messageHash2 = await identityVerifier.getMessageHash(
        otherAccount.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      expect(messageHash1).to.not.equal(messageHash2);
    });

    it("Should generate different message hashes for different nullifiers", async function () {
      const { identityVerifier, user, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const nullifier1 = ethers.keccak256(ethers.toUtf8Bytes("nullifier1"));
      const nullifier2 = ethers.keccak256(ethers.toUtf8Bytes("nullifier2"));

      const messageHash1 = await identityVerifier.getMessageHash(
        user.address,
        nullifier1,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      const messageHash2 = await identityVerifier.getMessageHash(
        user.address,
        nullifier2,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      expect(messageHash1).to.not.equal(messageHash2);
    });
  });

  describe("Signature Verification", function () {
    it("Should verify admin signature correctly", async function () {
      const { identityVerifier, admin, user, MOCK_NULLIFIER, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create EIP-712 signature (same format as ReliefPools)
      const domain = {
        name: "IdentityVerifier",
        version: "1",
        chainId: 84532, // Base sepolia
        verifyingContract: identityVerifier.target
      };

      const types = {
        VerificationMessage: [
          { name: "userAddress", type: "address" },
          { name: "nullifier", type: "uint256" },
          { name: "userIdentifier", type: "uint256" },
          { name: "nationality", type: "string" },
          { name: "timestamp", type: "uint256" }
        ]
      };

      const message = {
        userAddress: user.address,
        nullifier: MOCK_NULLIFIER,
        userIdentifier: MOCK_USER_IDENTIFIER,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      // Verify the signature
      const isValid = await identityVerifier.verifyAdminSignature(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp,
        signature
      );

      expect(isValid).to.be.true;
    });

    it("Should reject signature from non-admin", async function () {
      const { identityVerifier, otherAccount, user, MOCK_NULLIFIER, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Get message hash that needs to be signed
      const messageHash = await identityVerifier.getMessageHash(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      // Sign the message hash with non-admin's private key
      const signature = await otherAccount.signMessage(ethers.getBytes(messageHash));

      // Verify the signature should fail
      const isValid = await identityVerifier.verifyAdminSignature(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp,
        signature
      );

      expect(isValid).to.be.false;
    });

    it("Should reject signature with wrong parameters", async function () {
      const { identityVerifier, admin, user, MOCK_NULLIFIER, MOCK_USER_IDENTIFIER, MOCK_NATIONALITY } = await loadFixture(deployIdentityVerifierFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Get message hash that needs to be signed
      const messageHash = await identityVerifier.getMessageHash(
        user.address,
        MOCK_NULLIFIER,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp
      );

      // Sign the message hash with admin's private key
      const signature = await admin.signMessage(ethers.getBytes(messageHash));

      // Verify the signature with wrong nullifier should fail
      const wrongNullifier = ethers.keccak256(ethers.toUtf8Bytes("wrong-nullifier"));
      const isValid = await identityVerifier.verifyAdminSignature(
        user.address,
        wrongNullifier,
        MOCK_USER_IDENTIFIER,
        MOCK_NATIONALITY,
        timestamp,
        signature
      );

      expect(isValid).to.be.false;
    });
  });

  describe("User Verification Status", function () {
    it("Should return false for unverified user", async function () {
      const { identityVerifier, user } = await loadFixture(deployIdentityVerifierFixture);
      
      const isVerified = await identityVerifier.isUserVerified(user.address);
      expect(isVerified).to.be.false;
    });

    it("Should return empty verification data for unverified user", async function () {
      const { identityVerifier, user } = await loadFixture(deployIdentityVerifierFixture);
      
      const verificationData = await identityVerifier.getVerificationData(user.address);
      expect(verificationData.isVerified).to.be.false;
      expect(verificationData.nullifier).to.equal(0);
      expect(verificationData.userIdentifier).to.equal(0);
    });

    it("Should revert when getting admin signature for unverified user", async function () {
      const { identityVerifier, user } = await loadFixture(deployIdentityVerifierFixture);
      
      await expect(identityVerifier.getAdminSignature(user.address))
        .to.be.revertedWithCustomError(identityVerifier, "UserNotVerified");
    });
  });

  describe("Configuration", function () {
    it("Should return correct config ID for any parameters", async function () {
      const { identityVerifier, MOCK_CONFIG_ID } = await loadFixture(deployIdentityVerifierFixture);
      
      const configId = await identityVerifier.getConfigId(
        ethers.keccak256(ethers.toUtf8Bytes("destChain")),
        ethers.keccak256(ethers.toUtf8Bytes("userId")),
        ethers.toUtf8Bytes("userData")
      );

      expect(configId).to.equal(MOCK_CONFIG_ID);
    });
  });
});

// Mock contract for testing
const MockIdentityVerificationHubSource = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MockIdentityVerificationHub {
    // Mock implementation - just needs to exist for deployment
    function mockFunction() external pure returns (bool) {
        return true;
    }
}
`;

// Helper function to deploy mock contract
async function deployMockContract() {
  const [deployer] = await ethers.getSigners();
  const MockFactory = await ethers.getContractFactory("MockIdentityVerificationHub");
  return await MockFactory.deploy();
} 