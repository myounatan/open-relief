# Deployment Guide

## Prerequisites

1. Install dependencies:
   ```bash
   npm install dotenv
   ```

2. Set up environment variables by creating a `.env` file in the hardhat directory:

   ```env
   # Admin wallet configuration
   ADMIN_ADDRESS=0x1234567890123456789012345678901234567890
   ADMIN_PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
   
   # Base Sepolia testnet contract addresses
   BASE_USDC_TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   BASE_CCTP_V2_TOKENMESSENGER=0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5
   
   # Celo Alfajores testnet contract addresses
   SELF_PROTOCOL_HUB_CELO_TESTNET=0x1234567890123456789012345678901234567890
   
   # Optional: API keys for contract verification
   BASESCAN_API_KEY=your_basescan_api_key_here
   CELOSCAN_API_KEY=your_celoscan_api_key_here
   ```

## Network Configuration

The hardhat config includes:
- **Base Sepolia**: ETH, Chain ID 84532, RPC: https://base-sepolia-rpc.publicnode.com
- **Celo Alfajores**: CELO, Chain ID 44787, RPC: https://alfajores-forno.celo-testnet.org

## Contract Deployment

### Deploy ReliefPools Contract (Base Sepolia)

```bash
npx hardhat ignition deploy ignition/modules/ReliefPools.ts --network baseSepolia
```

Constructor parameters:
- `adminAddress`: Your admin wallet address (from ADMIN_ADDRESS env var)
- `baseUsdcToken`: Base USDC token address (from BASE_USDC_TOKEN env var)
- `baseCctpV2TokenMessenger`: Base CCTP v2 Token Messenger address (from BASE_CCTP_V2_TOKENMESSENGER env var)

### Deploy IdentityVerifier Contract (Celo Alfajores)

```bash
npx hardhat ignition deploy ignition/modules/IdentityVerifier.ts --network celoAlfajores
```

Constructor parameters:
- `adminAddress`: Your admin wallet address (from ADMIN_ADDRESS env var)
- `selfProtocolHubCeloTestnet`: Self Protocol Hub address on Celo testnet (from SELF_PROTOCOL_HUB_CELO_TESTNET env var)
- `scope`: Default scope for Self Protocol (0)
- `configId`: Configuration ID for verification (0x0000000000000000000000000000000000000000000000000000000000000001)

## Contract Verification

After deployment, verify the contracts on their respective block explorers:

### Base Sepolia
```bash
npx hardhat verify --network baseSepolia DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2" "constructor_arg3"
```

### Celo Alfajores
```bash
npx hardhat verify --network celoAlfajores DEPLOYED_CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2" "constructor_arg3" "constructor_arg4"
```

## Important Notes

1. **ReliefPools** is designed for Base Sepolia testnet where USDC and CCTP v2 are available
2. **IdentityVerifier** is designed for Celo Alfajores testnet where Self Protocol operates
3. Both contracts use the same admin address for ownership and administrative functions
4. The admin private key is used for deployment and should be kept secure
5. Make sure you have sufficient ETH on Base Sepolia and CELO on Alfajores for gas fees 