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

  "usa": [[]]

  // Create example relief pools with 1 USDC claimable amount (1 * 1e6 = 1,000,000)
  const usdcClaimAmount = 0.0001 * 1e6; // 0.0001 USDC with 6 decimals
  const usdcDonateAmount = 0.0002 * 1e6; // 0.0002 USDC with 6 decimals

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "ukraine",
    3, // Warzone
    0, // Critical
    "UKR",
    usdcClaimAmount
  ], { id: "createUkrainePool" });

  // Ukraine War Crisis Pool
  m.call(reliefPools, "createReliefPool", [
    "usa",
    2, // Wildfire
    1, // HighPriority
    "USA",
    usdcClaimAmount
  ], { id: "createUsaPool" });

  // approve and deposit some usdc to the ukraine pool
  const usdcToken = m.contract("USDC", [baseUsdcToken]);
  m.call(usdcToken, "approve", [reliefPools.address, usdcDonateAmount], { id: "approveUsdc" });

  // donate from multiple locations
  m.call(reliefPools, "donate", ["ukraine", usdcDonateAmount, "-79.0993611:43.5655833"], { id: "donateUkraineFromToronto" });
  m.call(reliefPools, "donate", ["ukraine", usdcDonateAmount, "51.509865:-0.118092"], { id: "donateUkraineFromLondon" });
  m.call(reliefPools, "donate", ["ukraine", usdcDonateAmount, "133.000:-27.000"], { id: "donateUkraineFromAustralia" });

  return { reliefPools };
});

export default ReliefPoolsModule; 