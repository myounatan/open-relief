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
  const usdcAmount = 0.01 * 1e6; // 0.01 USDC with 6 decimals

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "ukraine",
    3, // Warzone
    0, // Critical
    "Ukrainian",
    usdcAmount
  ], { id: "createUkrainePool" });

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "usa",
    2, // Wildfire
    1, // HighPriority
    "USA",
    usdcAmount
  ], { id: "createUsaPool" });
  

  return { reliefPools };
});

export default ReliefPoolsModule; 