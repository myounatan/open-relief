import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";

describe("ReliefPools", function () {
  // Test constants
  const DISASTER_TYPE = {
    EARTHQUAKE: 0,
    FLOOD: 1,
    WILDFIRE: 2,
    WARZONE: 3
  };

  const CLASSIFICATION = {
    CRITICAL: 0,
    HIGH_PRIORITY: 1
  };

  const MOCK_NATIONALITY = "Ukrainian";
  const ALLOCATED_FUNDS_PER_PERSON = ethers.parseUnits("100", 6); // 100 USDC
  const DONATION_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const MOCK_LOCATION = "50.4501:30.5234"; // Kyiv coordinates

  // Mock identifiers - using hashed strings for testing
  const MOCK_NULLIFIER_1 = ethers.keccak256(ethers.toUtf8Bytes("nullifier1"));
  const MOCK_USER_IDENTIFIER_1 = ethers.keccak256(ethers.toUtf8Bytes("userIdentity1"));
  const MOCK_NULLIFIER_2 = ethers.keccak256(ethers.toUtf8Bytes("nullifier2"));
  const MOCK_USER_IDENTIFIER_2 = ethers.keccak256(ethers.toUtf8Bytes("userIdentity2"));

  async function deployReliefPoolsFixture() {
    const [deployer, admin, user1, user2, donor1, donor2] = await hre.ethers.getSigners();

    // Deploy mock USDC token
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();

    // Deploy mock CCTP Message Transmitter
    const MockCCTPTransmitter = await ethers.getContractFactory("MockCCTPTransmitter");
    const mockCCTPTransmitter = await MockCCTPTransmitter.deploy();

    // Deploy ReliefPools contract (admin will be the owner)
    const ReliefPools = await hre.ethers.getContractFactory("ReliefPools");
    const reliefPools = await ReliefPools.deploy(
      admin.address,
      mockUSDC.target,
      mockCCTPTransmitter.target
    );

    // Mint USDC to donors for testing
    await mockUSDC.mint(donor1.address, ethers.parseUnits("10000", 6));
    await mockUSDC.mint(donor2.address, ethers.parseUnits("10000", 6));
    await mockUSDC.mint(user1.address, ethers.parseUnits("5000", 6));
    
    // Approve ReliefPools to spend USDC
    await mockUSDC.connect(donor1).approve(reliefPools.target, ethers.parseUnits("10000", 6));
    await mockUSDC.connect(donor2).approve(reliefPools.target, ethers.parseUnits("10000", 6));
    await mockUSDC.connect(user1).approve(reliefPools.target, ethers.parseUnits("5000", 6));

    return {
      reliefPools,
      mockUSDC,
      mockCCTPTransmitter,
      deployer,
      admin,
      user1,
      user2,
      donor1,
      donor2,
      MOCK_NULLIFIER_1,
      MOCK_USER_IDENTIFIER_1,
      MOCK_NULLIFIER_2,
      MOCK_USER_IDENTIFIER_2,
      MOCK_NATIONALITY,
      ALLOCATED_FUNDS_PER_PERSON,
      DONATION_AMOUNT,
      MOCK_LOCATION
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin address", async function () {
      const { reliefPools, admin } = await loadFixture(deployReliefPoolsFixture);
      expect(await reliefPools.adminAddress()).to.equal(admin.address);
    });

    it("Should set the correct USDC token address", async function () {
      const { reliefPools, mockUSDC } = await loadFixture(deployReliefPoolsFixture);
      expect(await reliefPools.usdcToken()).to.equal(mockUSDC.target);
    });

    it("Should set the correct CCTP transmitter address", async function () {
      const { reliefPools, mockCCTPTransmitter } = await loadFixture(deployReliefPoolsFixture);
      expect(await reliefPools.cctpMessageTransmitter()).to.equal(mockCCTPTransmitter.target);
    });

    it("Should initialize pool counter to 0", async function () {
      const { reliefPools } = await loadFixture(deployReliefPoolsFixture);
      expect(await reliefPools.poolCounter()).to.equal(0);
    });

    it("Should return 0 for total pools initially", async function () {
      const { reliefPools } = await loadFixture(deployReliefPoolsFixture);
      expect(await reliefPools.getTotalPools()).to.equal(0);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a relief pool successfully", async function () {
      const { reliefPools, deployer, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = await loadFixture(deployReliefPoolsFixture);
      
      await expect(reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      ))
      .to.emit(reliefPools, "ReliefPoolCreated")
      .withArgs(0, DISASTER_TYPE.EARTHQUAKE, CLASSIFICATION.CRITICAL, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON);
    });

    it("Should increment pool counter after creation", async function () {
      const { reliefPools, deployer, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = await loadFixture(deployReliefPoolsFixture);
      
      await reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      expect(await reliefPools.poolCounter()).to.equal(1);
      expect(await reliefPools.getTotalPools()).to.equal(1);
    });

    it("Should revert when creating pool with empty nationality", async function () {
      const { reliefPools, deployer, ALLOCATED_FUNDS_PER_PERSON } = await loadFixture(deployReliefPoolsFixture);
      
      await expect(reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        "",
        ALLOCATED_FUNDS_PER_PERSON
      )).to.be.revertedWith("InvalidNationality");
    });

    it("Should revert when creating pool with zero allocation", async function () {
      const { reliefPools, deployer, MOCK_NATIONALITY } = await loadFixture(deployReliefPoolsFixture);
      
      await expect(reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        0
      )).to.be.revertedWith("InvalidAmount");
    });

    it("Should only allow owner to create pools", async function () {
      const { reliefPools, user1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = await loadFixture(deployReliefPoolsFixture);
      
      await expect(reliefPools.connect(user1).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Donations", function () {
    it("Should allow donations to active pools", async function () {
      const { reliefPools, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      // Create a pool first
      await reliefPools.createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Make donation
      await expect(reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION))
        .to.emit(reliefPools, "DonationMade")
        .withArgs(0, donor1.address, 6, DONATION_AMOUNT, anyValue, MOCK_LOCATION);
    });

    it("Should update pool statistics after donation", async function () {
      const { reliefPools, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      // Create a pool first
      await reliefPools.createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Make donation
      await reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION);

      // Check pool statistics
      const pool = await reliefPools.getReliefPool(0);
      expect(pool.totalDonors).to.equal(1);
      expect(pool.totalAmountDonated).to.equal(DONATION_AMOUNT);
    });

    it("Should record donor information correctly", async function () {
      const { reliefPools, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      // Create a pool first
      await reliefPools.createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Make donation
      await reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION);

      // Check donor information
      const donor = await reliefPools.getDonor(0, donor1.address);
      expect(donor.id).to.equal(1);
      expect(donor.walletAddress).to.equal(donor1.address);
      expect(donor.amount).to.equal(DONATION_AMOUNT);
      expect(donor.isCrossChain).to.be.false;
      expect(donor.sourceDomain).to.equal(6);
      expect(donor.location).to.equal(MOCK_LOCATION);
    });

    it("Should revert donation to non-existent pool", async function () {
      const { reliefPools, donor1, DONATION_AMOUNT, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      await expect(reliefPools.connect(donor1).donate(999, DONATION_AMOUNT, MOCK_LOCATION))
        .to.be.revertedWith("InvalidPool");
    });

    it("Should revert donation with zero amount", async function () {
      const { reliefPools, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      // Create a pool first
      await reliefPools.createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      await expect(reliefPools.connect(donor1).donate(0, 0, MOCK_LOCATION))
        .to.be.revertedWith("InvalidAmount");
    });
  });

  describe("Admin Signature Generation and Verification", function () {

    it("Should verify admin signature correctly", async function () {
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = await loadFixture(deployReliefPoolsFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create EIP-712 message hash
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      // Sign the message
      const signature = await admin.signTypedData(domain, types, message);

      // Verify the signature
      const isValid = await reliefPools.verifyAdminSignature(
        user1.address,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        signature
      );

      expect(isValid).to.be.true;
    });

    it("Should reject signature from non-admin", async function () {
      const { reliefPools, user1, user2, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = await loadFixture(deployReliefPoolsFixture);
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create EIP-712 message hash
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      // Sign the message with non-admin
      const signature = await user2.signTypedData(domain, types, message);

      // Verify the signature should fail
      const isValid = await reliefPools.verifyAdminSignature(
        user1.address,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        signature
      );

      expect(isValid).to.be.false;
    });
  });

  describe("Relief Claims", function () {
    async function createPoolAndDonate(fixture: any) {
      const { reliefPools, deployer, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = fixture;
      
      // Create pool (using deployer as owner)
      await reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Make donation to fund the pool
      await reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION);
      
      return 0; // poolId
    }

    it("Should allow valid relief claims", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create admin signature
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      // Claim relief
      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      ))
      .to.emit(reliefPools, "FundsClaimed")
      .withArgs(
        poolId,
        user1.address,
        user1.address,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON,
        anyValue
      );
    });

    it("Should update pool statistics after claim", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create admin signature and claim
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      await reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      );

      // Check pool statistics
      const pool = await reliefPools.getReliefPool(poolId);
      expect(pool.totalBeneficiaries).to.equal(1);
      expect(pool.totalAmountClaimed).to.equal(ALLOCATED_FUNDS_PER_PERSON);
    });

    it("Should prevent double claims from same person", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create admin signature
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      // First claim should succeed
      await reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      );

      // Second claim should fail
      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      )).to.be.revertedWith("AlreadyClaimed");
    });

    it("Should check claimed status correctly", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Check not claimed initially
      const notClaimed = await reliefPools.checkPersonClaimedFromPool(poolId, MOCK_USER_IDENTIFIER_1);
      expect(notClaimed).to.be.false;
      
      // Create admin signature and claim
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      await reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      );

      // Check claimed after claim
      const claimed = await reliefPools.checkPersonClaimedFromPool(poolId, MOCK_USER_IDENTIFIER_1);
      expect(claimed).to.be.true;
    });

    it("Should reject claims with wrong nationality", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1 } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      const wrongNationality = "Russian";
      
      // Create admin signature with wrong nationality
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: wrongNationality,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        wrongNationality,
        timestamp,
        user1.address,
        signature
      )).to.be.revertedWith("NationalityMismatch");
    });

    it("Should reject claims with invalid signature", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, user1, user2, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create signature with wrong signer
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await user2.signTypedData(domain, types, message);

      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      )).to.be.revertedWith("InvalidSignature");
    });

    it("Should allow claiming to different recipient", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, user2, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create admin signature
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      // Claim to different recipient
      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user2.address, // Different recipient
        signature
      ))
      .to.emit(reliefPools, "FundsClaimed")
      .withArgs(
        poolId,
        user1.address,
        user2.address, // Different recipient
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON,
        anyValue
      );
    });

    it("Should prevent double claims from same user with different nullifiers (SECURITY FIX)", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // First claim with nullifier1
      const nullifier1 = ethers.keccak256(ethers.toUtf8Bytes("nullifier1"));
      
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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

      const message1 = {
        userAddress: user1.address,
        nullifier: nullifier1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature1 = await admin.signTypedData(domain, types, message1);

      // First claim should succeed
      await reliefPools.connect(user1).claimRelief(
        poolId,
        nullifier1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature1
      );

      // Second claim with different nullifier but same userIdentifier should fail
      const nullifier2 = ethers.keccak256(ethers.toUtf8Bytes("nullifier2"));
      
      const message2 = {
        userAddress: user1.address,
        nullifier: nullifier2,
        userIdentifier: MOCK_USER_IDENTIFIER_1, // Same userIdentifier
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature2 = await admin.signTypedData(domain, types, message2);

      // Second claim should fail because userIdentifier already claimed
      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        nullifier2,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature2
      )).to.be.revertedWith("AlreadyClaimed");
    });
  });

  describe("Pool Management", function () {
    it("Should allow owner to toggle pool status", async function () {
      const { reliefPools, deployer, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON } = await loadFixture(deployReliefPoolsFixture);
      
      // Create pool
      await reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Toggle pool status
      await expect(reliefPools.connect(deployer).togglePoolStatus(0))
        .to.emit(reliefPools, "PoolStatusChanged")
        .withArgs(0, false);

      // Check pool is inactive
      const pool = await reliefPools.getReliefPool(0);
      expect(pool.isActive).to.be.false;
    });

    it("Should prevent donations to inactive pools", async function () {
      const { reliefPools, deployer, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = await loadFixture(deployReliefPoolsFixture);
      
      // Create pool
      await reliefPools.connect(deployer).createReliefPool(
        DISASTER_TYPE.EARTHQUAKE,
        CLASSIFICATION.CRITICAL,
        MOCK_NATIONALITY,
        ALLOCATED_FUNDS_PER_PERSON
      );

      // Toggle pool status to inactive
      await reliefPools.connect(deployer).togglePoolStatus(0);

      // Try to donate to inactive pool
      await expect(reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION))
        .to.be.revertedWith("PoolInactive");
    });

    it("Should prevent claims from inactive pools", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, deployer, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      async function createPoolAndDonate(fixture: any) {
        const { reliefPools, deployer, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = fixture;
        
        // Create pool (using deployer as owner)
        await reliefPools.connect(deployer).createReliefPool(
          DISASTER_TYPE.EARTHQUAKE,
          CLASSIFICATION.CRITICAL,
          MOCK_NATIONALITY,
          ALLOCATED_FUNDS_PER_PERSON
        );

        // Make donation to fund the pool
        await reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION);
        
        return 0; // poolId
      }
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Toggle pool status to inactive
      await reliefPools.connect(deployer).togglePoolStatus(poolId);

      // Create admin signature
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      // Try to claim from inactive pool
      await expect(reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      )).to.be.revertedWith("PoolInactive");
    });
  });

  describe("Utility Functions", function () {
    it("Should return correct contract balance", async function () {
      const { reliefPools, mockUSDC } = await loadFixture(deployReliefPoolsFixture);
      
      // Check initial balance
      const initialBalance = await reliefPools.getContractBalance();
      expect(initialBalance).to.equal(0);

      // Transfer some USDC to contract
      await mockUSDC.mint(reliefPools.target, ethers.parseUnits("1000", 6));
      
      // Check updated balance
      const updatedBalance = await reliefPools.getContractBalance();
      expect(updatedBalance).to.equal(ethers.parseUnits("1000", 6));
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const { reliefPools, mockUSDC, deployer, admin } = await loadFixture(deployReliefPoolsFixture);
      
      // Transfer some USDC to contract
      await mockUSDC.mint(reliefPools.target, ethers.parseUnits("1000", 6));
      
      // Emergency withdraw (using deployer as owner)
      await reliefPools.connect(deployer).emergencyWithdraw(ethers.parseUnits("500", 6));
      
      // Check admin balance (emergency withdraw sends to admin address, not owner)
      const adminBalance = await mockUSDC.balanceOf(admin.address);
      expect(adminBalance).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should track claimed pools per person", async function () {
      const fixture = await loadFixture(deployReliefPoolsFixture);
      const { reliefPools, admin, user1, MOCK_NULLIFIER_1, MOCK_USER_IDENTIFIER_1, MOCK_NATIONALITY } = fixture;
      
      async function createPoolAndDonate(fixture: any) {
        const { reliefPools, deployer, donor1, MOCK_NATIONALITY, ALLOCATED_FUNDS_PER_PERSON, DONATION_AMOUNT, MOCK_LOCATION } = fixture;
        
        // Create pool (using deployer as owner)
        await reliefPools.connect(deployer).createReliefPool(
          DISASTER_TYPE.EARTHQUAKE,
          CLASSIFICATION.CRITICAL,
          MOCK_NATIONALITY,
          ALLOCATED_FUNDS_PER_PERSON
        );

        // Make donation to fund the pool
        await reliefPools.connect(donor1).donate(0, DONATION_AMOUNT, MOCK_LOCATION);
        
        return 0; // poolId
      }
      
      const poolId = await createPoolAndDonate(fixture);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Check no pools claimed initially
      const noPools = await reliefPools.getPersonClaimedPools(MOCK_USER_IDENTIFIER_1);
      expect(noPools.length).to.equal(0);
      
      // Create admin signature and claim
      const domain = {
        name: "ReliefPools",
        version: "1",
        chainId: 8453,
        verifyingContract: reliefPools.target
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
        userAddress: user1.address,
        nullifier: MOCK_NULLIFIER_1,
        userIdentifier: MOCK_USER_IDENTIFIER_1,
        nationality: MOCK_NATIONALITY,
        timestamp: timestamp
      };

      const signature = await admin.signTypedData(domain, types, message);

      await reliefPools.connect(user1).claimRelief(
        poolId,
        MOCK_NULLIFIER_1,
        MOCK_USER_IDENTIFIER_1,
        MOCK_NATIONALITY,
        timestamp,
        user1.address,
        signature
      );

      // Check pools claimed after claim
      const claimedPools = await reliefPools.getPersonClaimedPools(MOCK_USER_IDENTIFIER_1);
      expect(claimedPools.length).to.equal(1);
      expect(claimedPools[0]).to.equal(poolId);
    });
  });
}); 