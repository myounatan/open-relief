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

  return { reliefPools };
});

export default ReliefPoolsModule; 