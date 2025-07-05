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

  // Create example relief pools with 1 USDC claimable amount (1 * 1e6 = 1,000,000)
  const usdcAmount = 1_000_000; // 1 USDC with 6 decimals
  
  // Sudan War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "sudan-war-crisis-2024",
    3, // Warzone
    0, // Critical
    "Sudanese",
    usdcAmount
  ], { id: "createSudanPool" });

  // Turkey Earthquake Pool
  m.call(reliefPools, "createReliefPool", [
    "turkey-earthquake-2024",
    0, // Earthquake
    0, // Critical
    "Turkish",
    usdcAmount
  ], { id: "createTurkeyPool" });

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "ukraine-war-crisis-2024",
    3, // Warzone
    0, // Critical
    "Ukrainian",
    usdcAmount
  ], { id: "createUkrainePool" });

  // Pakistan Flood Pool
  m.call(reliefPools, "createReliefPool", [
    "pakistan-flood-2024",
    1, // Flood
    1, // HighPriority
    "Pakistani",
    usdcAmount
  ], { id: "createPakistanPool" });

  // California Wildfire Pool
  m.call(reliefPools, "createReliefPool", [
    "california-wildfire-2024",
    2, // Wildfire
    1, // HighPriority
    "American",
    usdcAmount
  ], { id: "createCaliforniaPool" });

  // Syria Earthquake Pool
  m.call(reliefPools, "createReliefPool", [
    "syria-earthquake-2024",
    0, // Earthquake
    0, // Critical
    "Syrian",
    usdcAmount
  ], { id: "createSyriaPool" });

  return { reliefPools };
});

export default ReliefPoolsModule; 