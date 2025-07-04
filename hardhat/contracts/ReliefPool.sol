// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ReliefPool is Ownable {
    address public adminAddress;

    struct Beneficiary {
        string userIdentifier; // Self Protocol unique user id
        address walletAddress;
        uint256 amount; // usdc claimed
    }

    struct Donor {
        address walletAddress;
        uint256 amount; // usdc donated
    }

    struct ReliefPool {
        address adminAddress;
        uint256 totalAmount;
        uint256 totalBeneficiaries;
        mapping(address => Beneficiary) beneficiaries;
        mapping(address => Donor) donors;
    }

    constructor(address _adminAddress) Ownable(_adminAddress) {
        adminAddress = _adminAddress;
    }

    function createReliefPool(address _adminAddress) public onlyOwner {
        ReliefPool reliefPool = ReliefPool({
            adminAddress: _adminAddress,
            totalAmount: 0,
            totalBeneficiaries: 0,
        });
    }
}
