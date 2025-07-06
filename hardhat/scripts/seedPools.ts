import hre from "hardhat";

async function main() {
  // Get the deployed ReliefPools contract address
  const reliefPoolsAddress = process.env.RELIEF_POOLS_ADDRESS || "";
  const baseUsdcToken = process.env.BASE_USDC_TOKEN || "";
  
  if (!reliefPoolsAddress || !baseUsdcToken) {
    throw new Error("Please set RELIEF_POOLS_ADDRESS and BASE_USDC_TOKEN environment variables");
  }

  const signers = await hre.ethers.getSigners();
  const signer = signers[0];
  console.log("Seeding pools with account:", signer.address);

  // Get contract instances
  const ReliefPools = await hre.ethers.getContractFactory("ReliefPools");
  const reliefPools = ReliefPools.attach(reliefPoolsAddress);

  // Get USDC token contract (using ERC20 interface)
  const ERC20 = await hre.ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20");
  const usdcToken = ERC20.attach(baseUsdcToken);

  // Donation amounts
  const usdcDonateAmount = Math.floor(0.0002 * 1e6); // 0.0002 USDC with 6 decimals

  console.log("USDC donation amount:", usdcDonateAmount);

  // Check current USDC balance
  const balance = await usdcToken.balanceOf(signer.address);
  console.log("Current USDC balance:", balance.toString());

  // Total amount needed for all donations
  const totalNeeded = usdcDonateAmount * 3; // 3 donations
  
  if (balance.lt(totalNeeded)) {
    console.log(`Warning: Insufficient USDC balance. Need ${totalNeeded}, have ${balance.toString()}`);
    console.log("Please ensure you have enough USDC for donations");
    return;
  }

  // Approve USDC spending
  console.log("Approving USDC spending...");
  const approveTx = await usdcToken.approve(reliefPoolsAddress, totalNeeded);
  await approveTx.wait();
  console.log("USDC approval successful");

  // Make donations from different locations
  console.log("Making donation to Ukraine pool from Toronto...");
  const donateTx1 = await reliefPools.donate(
    "ukraine", 
    usdcDonateAmount, 
    "-79.0993611:43.5655833" // Toronto coordinates
  );
  await donateTx1.wait();
  console.log("Donation from Toronto successful");

  console.log("Making donation to Ukraine pool from London...");
  const donateTx2 = await reliefPools.donate(
    "ukraine", 
    usdcDonateAmount, 
    "51.509865:-0.118092" // London coordinates
  );
  await donateTx2.wait();
  console.log("Donation from London successful");

  console.log("Making donation to Ukraine pool from Australia...");
  const donateTx3 = await reliefPools.donate(
    "ukraine", 
    usdcDonateAmount, 
    "133.000:-27.000" // Australia coordinates
  );
  await donateTx3.wait();
  console.log("Donation from Australia successful");

  // Check updated pool stats
  console.log("\nChecking Ukraine pool stats after donations...");
  const ukrainePool = await reliefPools.getReliefPool("ukraine");
  console.log("Total donors:", ukrainePool.totalDonors.toString());
  console.log("Total amount donated:", ukrainePool.totalAmountDonated.toString());

  console.log("\nPool seeding completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 