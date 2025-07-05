# 🌍 Open Relief - Omnichain Disaster Relief Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![Powered by Privy](https://img.shields.io/badge/Powered%20by-Privy-blue)](https://privy.io/)
[![Self.xyz Integration](https://img.shields.io/badge/Identity-Self.xyz-green)](https://self.xyz/)
[![Circle CCTP](https://img.shields.io/badge/Payments-Circle%20CCTP-orange)](https://developers.circle.com/stablecoins/cctp-getting-started)

A comprehensive omnichain disaster relief protocol that enables secure, cross-chain donations and aid distribution with identity verification and gasless transactions.

## 📋 Quick Navigation

- [🏆 Hackathon Submissions](#-hackathon-prize-track-submissions)
- [🎯 Project Overview](#-what-is-open-relief)
- [🏗️ Architecture](#️-architecture-overview)
- [🚀 Getting Started](#-getting-started)
- [🔐 Partner Integrations](#-partner-integrations)
  - [Self.xyz Integration](#-selfxyz-integration---identity-verification)
  - [Circle CCTP Integration](#-circle-cctp-integration---multichain-usdc-payments)
  - [Privy Integration](#-privy-integration---consumer-app-experience)
- [📊 Deployed Contracts](#-deployed-contracts)
- [🎮 How to Use](#-how-to-use)
- [🔍 Project Structure](#-project-structure)
- [🧪 Testing](#-testing)

---

## 🏆 Hackathon Prize Track Submissions

This project is designed to compete in the following prize tracks:

### 🥇 **Self.xyz - Best Onchain SDK Integration ($9,000)**
- ✅ Complete Self.xyz SDK integration on Celo network
- ✅ Country, age, and OFAC verification
- ✅ Onchain proof verification system
- ✅ Prevents duplicate aid claims through identity verification

### 🥇 **Circle - Build a Multichain USDC Payment System ($4,000)**
- ✅ CCTP v2 implementation with Fast Transfers
- ✅ Cross-chain USDC payments across 6 networks
- ✅ Hook-based automated processing
- ✅ Treasury management with Base Sepolia as primary network

### 🥇 **Privy - Best Consumer App ($1,700) + Best Stablecoin App ($1,650)**
- ✅ Seamless embedded wallet experience
- ✅ Social login integration
- ✅ Consumer-friendly disaster relief interface
- ✅ USDC-based donation and aid distribution system

---

## 🎯 What is Open Relief?

Open Relief is a revolutionary disaster relief protocol that solves critical problems in humanitarian aid:

- **🔒 Prevents Fraud**: Identity verification ensures aid reaches real victims
- **⚡ Cross-Chain Donations**: Donors can contribute from any supported blockchain
- **💰 Gasless Experience**: Recipients don't need crypto knowledge or gas fees
- **🌐 Global Reach**: Works across multiple countries and currencies
- **📊 Transparent Tracking**: All aid distribution is tracked on-chain

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Relief Pools   │    │  Identity       │
│   (Next.js)     │◄──►│  (Base Sepolia) │    │  (Celo Alfajores)│
│   + Privy       │    │  + Circle CCTP  │◄──►│  + Self.xyz     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Multi-Chain   │    │   Subgraph      │    │   Cross-Chain   │
│   USDC Payments │    │   (GraphQL)     │    │   Attestation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Smart Contracts**: Solidity 0.7.6, Hardhat, OpenZeppelin
- **Primary Network**: Base Sepolia (Relief Pools), Celo Alfajores (Identity)
- **Cross-Chain**: Circle CCTP v2 (Ethereum, Arbitrum, Optimism, Polygon, Avalanche)
- **Identity**: Self.xyz SDK with Celo network verification
- **Authentication**: Privy embedded wallets and social login
- **Data**: The Graph Protocol for blockchain indexing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/open-relief.git
cd open-relief

# Install dependencies
pnpm install-all

# Set up environment variables
cp hardhat/.env.example hardhat/.env
cp next-app/.env.example next-app/.env.local

# Compile smart contracts
pnpm compile

# Generate TypeScript types
pnpm generate-types

# Start development server
pnpm dev
```

### Development Commands

```bash
# Development
pnpm dev                  # Start Next.js dev server
pnpm compile              # Compile smart contracts
pnpm generate-types       # Generate TypeScript types
pnpm build                # Build for production

# Smart Contracts
cd hardhat
pnpm deploy:base-sepolia  # Deploy to Base Sepolia
pnpm deploy:celo-alfajores # Deploy to Celo Alfajores
npx hardhat test          # Run contract tests

# Frontend
cd next-app
pnpm lint                 # Run linting
pnpm format               # Format code
```

---

## 🔐 Partner Integrations

### 🏆 Self.xyz Integration - Identity Verification

**Network**: Celo Alfajores  
**Contract**: [`0xb6ECd438f941b24010286de08e055D7a6BF98a90`](https://alfajores.celoscan.io/address/0xb6ECd438f941b24010286de08e055D7a6BF98a90)

**Key Implementation Files:**
- **Smart Contract**: [`hardhat/contracts/IdentityVerifier.sol`](hardhat/contracts/IdentityVerifier.sol)
  - Lines 6-10: Self.xyz contract imports
  - Lines 12: Inherits from `SelfVerificationRoot`
  - Lines 75-76: Constructor with hub address and scope
  - Lines 98-104: Required `getConfigId` implementation
  - Lines 275-291: Scope management functions

- **Frontend Component**: [`next-app/components/IdentityVerification.tsx`](next-app/components/IdentityVerification.tsx)
  - Lines 2-3: Self.xyz SDK imports
  - Lines 51-76: Verification config with nationality/OFAC checks
  - Lines 87: `SelfAppBuilder` initialization
  - Lines 244-262: QR code verification component

- **Deployment**: [`hardhat/ignition/modules/IdentityVerifier.ts`](hardhat/ignition/modules/IdentityVerifier.ts)
  - Lines 6-12: Self Protocol Hub configuration
  - Lines 15-20: Contract deployment with Self.xyz parameters

**Verification Features:**
- ✅ Country verification (prevents sanctioned countries)
- ✅ Age verification (18+ requirement)
- ✅ OFAC sanctions screening
- ✅ Nationality and gender disclosure
- ✅ Celo network proof verification
- ✅ Prevents duplicate aid claims

### 🏆 Circle CCTP Integration - Multichain USDC Payments

**Network**: Base Sepolia (Primary), Multi-chain support  
**Contract**: [`0xffd9D8f2Ba0713FE8824F807CCB91770814DAc7E`](https://sepolia.basescan.org/address/0xffd9D8f2Ba0713FE8824F807CCB91770814DAc7E)

**Key Implementation Files:**
- **CCTP Service**: [`next-app/lib/cctpV2Service.ts`](next-app/lib/cctpV2Service.ts)
  - Lines 32-69: CCTP contract addresses for 6 networks
  - Lines 298-409: Cross-chain USDC burning with hook data
  - Lines 411-451: Circle Iris API attestation retrieval
  - Lines 453-487: USDC minting on destination chain

- **Smart Contract**: [`hardhat/contracts/ReliefPools.sol`](hardhat/contracts/ReliefPools.sol)
  - Lines 12-36: CCTP v2 Message Handler interface
  - Lines 227-254: `handleReceiveUnfinalizedMessage` hook handler
  - Lines 256-319: `_processCrossChainDonation` with hook data
  - Lines 270-282: Hook data extraction and poolId decoding

- **Gas Station**: [`next-app/lib/circleGasService.ts`](next-app/lib/circleGasService.ts)
  - Lines 54-98: Gasless transaction execution
  - Lines 142-183: Fallback mechanism for failed gasless transactions

- **Message Parsing**: [`hardhat/contracts/BurnMessageV2.sol`](hardhat/contracts/BurnMessageV2.sol)
  - Lines 43-158: Complete Circle CCTP V2 burn message format
  - Lines 137-145: Hook data extraction from messages

**Supported Networks:**
- ✅ Base Sepolia (Primary)
- ✅ Ethereum Sepolia  
- ✅ Arbitrum Sepolia
- ✅ Optimism Sepolia
- ✅ Polygon Amoy
- ✅ Avalanche Fuji

**Features:**
- ✅ Fast Transfer with hooks
- ✅ Automated processing on destination chain
- ✅ Gasless transactions for recipients
- ✅ Multi-chain treasury management
- ✅ USDC donation routing

### 🏆 Privy Integration - Consumer App Experience

**Key Implementation Files:**
- **App Provider**: [`next-app/pages/_app.tsx`](next-app/pages/_app.tsx)
  - Lines 69-78: PrivyProvider configuration with embedded wallets
  - Line 73: `createOnLogin: "users-without-wallets"` for seamless onboarding

- **Account Management**: [`next-app/components/AccountButton.tsx`](next-app/components/AccountButton.tsx)
  - Lines 6-7: `usePrivy` and `useWallets` hooks
  - Lines 11-13: Authentication check and wallet validation
  - Lines 25-27: User-friendly account display

- **Main Interface**: [`next-app/components/OpenReliefGlobe.tsx`](next-app/components/OpenReliefGlobe.tsx)
  - Lines 428-438: Authentication-gated donation flow
  - Lines 440-450: Authentication-gated claim flow
  - Lines 430-433, 442-445: Login prompts for unauthenticated users

- **Wallet Management**: [`next-app/components/WalletCard.tsx`](next-app/components/WalletCard.tsx)
  - Lines 28-68: Session signer management for gasless transactions
  - Lines 70-95: Client-side message signing
  - Lines 97-133: Remote message signing with Privy API

- **Server Auth**: [`next-app/pages/api/verify.ts`](next-app/pages/api/verify.ts)
  - Lines 23-35: Token verification for API access
  - Lines 7: Privy server-side client setup

**Consumer Features:**
- ✅ One-click social login (Google, Twitter, Discord, Email)
- ✅ Embedded wallet creation
- ✅ Gasless transaction experience
- ✅ Multi-chain wallet management
- ✅ Mobile-friendly interface
- ✅ No crypto knowledge required

**Stablecoin Features:**
- ✅ USDC donation flows
- ✅ Cross-chain USDC transfers
- ✅ Automatic aid distribution
- ✅ Balance checking across chains
- ✅ Transaction history tracking

---

## 📊 Deployed Contracts

### Base Sepolia (Chain ID: 84532)
- **ReliefPools**: [`0xffd9D8f2Ba0713FE8824F807CCB91770814DAc7E`](https://sepolia.basescan.org/address/0xffd9D8f2Ba0713FE8824F807CCB91770814DAc7E)
- **USDC Token**: [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- **CCTP Token Messenger**: [`0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`](https://sepolia.basescan.org/address/0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA)

### Celo Alfajores (Chain ID: 44787)
- **IdentityVerifier**: [`0xb6ECd438f941b24010286de08e055D7a6BF98a90`](https://alfajores.celoscan.io/address/0xb6ECd438f941b24010286de08e055D7a6BF98a90)

## 🎮 How to Use

### For Donors
1. **Connect Wallet**: Use social login or connect existing wallet
2. **Select Disaster**: Choose from active relief pools
3. **Donate USDC**: Cross-chain donations automatically processed via CCTP
4. **Track Impact**: See real-time distribution to verified recipients

### For Recipients
1. **Verify Identity**: Complete Self.xyz verification on Celo (country, age, OFAC)
2. **Locate Disaster**: Find your local relief pool
3. **Claim Aid**: Gasless claiming with automatic USDC distribution
4. **One-time Only**: Identity verification prevents duplicate claims

### For Pool Managers
1. **Create Pool**: Set up new disaster relief fund on Base Sepolia
2. **Manage Distribution**: Control aid allocation and requirements
3. **Monitor Claims**: Track verified recipient claims
4. **Cross-chain Coordination**: Manage funds across multiple networks

## 🔍 Project Structure

```
open-relief/
├── hardhat/                 # Smart contracts
│   ├── contracts/           # Solidity contracts
│   │   ├── ReliefPools.sol     # Main relief protocol (Base)
│   │   ├── IdentityVerifier.sol # Self.xyz integration (Celo)
│   │   └── BurnMessageV2.sol   # CCTP message parsing
│   ├── ignition/           # Deployment scripts
│   └── test/               # Contract tests
├── next-app/               # Frontend application
│   ├── components/         # React components
│   │   ├── OpenReliefGlobe.tsx     # Main interface
│   │   ├── IdentityVerification.tsx # Self.xyz integration
│   │   └── DonationModal.tsx       # CCTP donations
│   ├── lib/                # Utility libraries
│   │   ├── cctpV2Service.ts        # Circle CCTP service
│   │   └── circleGasService.ts     # Gas Station integration
│   └── pages/              # Next.js pages
└── subgraph/               # GraphQL indexing
```

## 🧪 Testing

### Smart Contract Tests
```bash
cd hardhat
npx hardhat test
```

### Frontend Testing
```bash
cd next-app
pnpm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Self.xyz** for identity verification infrastructure
- **Circle** for CCTP cross-chain payment rails
- **Privy** for seamless wallet authentication
- **The Graph** for blockchain data indexing
- **OpenZeppelin** for secure smart contract patterns
- **Alchemy** for reliable blockchain infrastructure

---

**Built with ❤️ for global disaster relief**