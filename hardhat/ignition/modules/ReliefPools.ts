import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ReliefPoolsModule = buildModule("ReliefPoolsModule", (m) => {
  // Get parameters from environment variables
  const adminAddress = m.getParameter("adminAddress", process.env.ADMIN_ADDRESS || "");
  const baseUsdcToken = m.getParameter("baseUsdcToken", process.env.BASE_USDC_TOKEN || "");
  const baseCctpV2TokenMessenger = m.getParameter("baseCctpV2TokenMessenger", process.env.BASE_CCTP_V2_TOKENMESSENGER || "");

  // Deploy ReliefPools contract
  const reliefPools = m.contract("ReliefPools", [
    adminAddress,
    baseUsdcToken,
    baseCctpV2TokenMessenger
  ]);

  // Create example relief pools with 0.0001 USDC claimable amount
  const usdcClaimAmount = 0.0001 * 1e6; // 0.0001 USDC with 6 decimals

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "ukraine",
    3, // Warzone
    0, // Critical
    "UKR",
    usdcClaimAmount
  ], { id: "createUkrainePool" });

  // France Wildfire Pool
  m.call(reliefPools, "createReliefPool", [
    "france",
    2, // Wildfire
    1, // HighPriority
    "FRA",
    usdcClaimAmount
  ], { id: "createFrancePool" });

  // Turkey Flood Pool
  m.call(reliefPools, "createReliefPool", [
    "turkey",
    1, // Flood
    1, // HighPriority
    "TUR",
    usdcClaimAmount
  ], { id: "createTurkeyPool" });

  return { reliefPools };
});

export default ReliefPoolsModule; 