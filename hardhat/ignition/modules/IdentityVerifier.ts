import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const IdentityVerifierModule = buildModule("IdentityVerifierModule", (m) => {
  // Get parameters from environment variables
  const adminAddress = m.getParameter("adminAddress", process.env.ADMIN_ADDRESS || "");
  const selfProtocolHubCeloTestnet = m.getParameter("selfProtocolHubCeloTestnet", process.env.SELF_PROTOCOL_HUB_CELO_TESTNET || "");
  
  // Default scope for Self Protocol (you may want to adjust this)
  const scope = m.getParameter("scope", 0);
  
  // Generate a config ID (you may want to customize this)
  const configId = m.getParameter("configId", "0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61");

  // Deploy IdentityVerifier contract
  const identityVerifier = m.contract("IdentityVerifier", [
    adminAddress,
    selfProtocolHubCeloTestnet,
    scope,
    configId
  ]);

  return { identityVerifier };
});

export default IdentityVerifierModule; 