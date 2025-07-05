import axios from "axios";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  encodePacked,
  http,
  publicActions,
} from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
} from "viem/chains";
import { circleGasService } from "./circleGasService";

// OpenRelief Donation Pool Contract on Base Sepolia
export const DONATION_POOL_CONTRACT =
  process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS!; // Replace with actual contract address

// Type definitions for Circle attestation
export interface CircleAttestation {
  message: string;
  attestation: string;
  status: string;
  messageHash?: string;
  messageBody?: string;
}

// CCTP V2 Contract Addresses and Configuration (Testnet)
export const CCTP_CONTRACTS = {
  sepolia: {
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    domain: 0,
    name: "Ethereum Sepolia",
  },
  baseSepolia: {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    domain: 6,
    name: "Base Sepolia",
  },
  arbitrumSepolia: {
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    domain: 3,
    name: "Arbitrum Sepolia",
  },
  optimismSepolia: {
    usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    domain: 2,
    name: "OP Sepolia",
  },
  polygonAmoy: {
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    domain: 7,
    name: "Polygon Amoy",
  },
} as const;

const CHAIN_CONFIG = {
  sepolia: {
    chain: sepolia,
    rpc: "https://eth-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  },
  baseSepolia: {
    chain: baseSepolia,
    rpc: "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  },
  arbitrumSepolia: {
    chain: arbitrumSepolia,
    rpc: "https://arb-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  },
  optimismSepolia: {
    chain: optimismSepolia,
    rpc: "https://opt-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  },
  polygonAmoy: {
    chain: polygonAmoy,
    rpc: "https://polygon-amoy.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  },
} as const;

export type SupportedChain = keyof typeof CCTP_CONTRACTS;

export interface CCTPTransferParams {
  sourceChain: SupportedChain;
  amount: string;
  poolId: string;
  privyWallet: any;
  gasless?: boolean;
}

// ABI definitions
const USDC_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const TOKEN_MESSENGER_V2_ABI = [
  {
    type: "function",
    name: "depositForBurn",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositForBurnWithHook",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const MESSAGE_TRANSMITTER_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export class CCTPV2Service {
  async getUSDCBalance(
    chain: SupportedChain,
    walletAddress: string
  ): Promise<string> {
    try {
      const client = createWalletClient({
        chain: CHAIN_CONFIG[chain].chain,
        transport: http(CHAIN_CONFIG[chain].rpc),
      }).extend(publicActions);

      const balance = await client.readContract({
        address: CCTP_CONTRACTS[chain].usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });

      return (Number(balance) / 1e6).toFixed(2); // Convert from 6 decimals
    } catch (error) {
      console.error(`Error fetching ${chain} USDC balance:`, error);
      return "0.00";
    }
  }

  async getAllUSDCBalances(
    walletAddress: string
  ): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};

    for (const chain of Object.keys(CCTP_CONTRACTS) as SupportedChain[]) {
      balances[chain] = await this.getUSDCBalance(chain, walletAddress);
    }

    return balances;
  }

  async approveUSDC({
    sourceChain,
    privyWallet,
    gasless = false,
  }: {
    sourceChain: SupportedChain;
    privyWallet: any;
    gasless?: boolean;
  }): Promise<string> {
    const maxAllowance = BigInt(10_000_000_000 * 1e6); // 10,000 USDC

    // Switch to the correct chain first
    await privyWallet.switchChain(CHAIN_CONFIG[sourceChain].chain.id);

    // Get the EIP1193 provider from Privy wallet
    const provider = await privyWallet.getEthereumProvider();

    // Create wallet client using Privy's pattern
    const client = createWalletClient({
      account: privyWallet.address as `0x${string}`,
      chain: CHAIN_CONFIG[sourceChain].chain,
      transport: custom(provider),
    });

    if (
      gasless &&
      circleGasService.isGaslessSupported(CHAIN_CONFIG[sourceChain].chain.id)
    ) {
      console.log(
        "🚀 Attempting gasless USDC approval via Circle Gas Station..."
      );

      try {
        const { result, wasGasless } =
          await circleGasService.makeTransactionGasless(
            client,
            {
              to: CCTP_CONTRACTS[sourceChain].usdc,
              data: encodeFunctionData({
                abi: USDC_ABI,
                functionName: "approve",
                args: [
                  CCTP_CONTRACTS[sourceChain].tokenMessenger as `0x${string}`,
                  maxAllowance,
                ],
              }),
            },
            async () => {
              return await client.writeContract({
                address: CCTP_CONTRACTS[sourceChain].usdc as `0x${string}`,
                abi: USDC_ABI,
                functionName: "approve",
                args: [
                  CCTP_CONTRACTS[sourceChain].tokenMessenger as `0x${string}`,
                  maxAllowance,
                ],
              });
            }
          );

        if (wasGasless) {
          console.log("✅ Gas fees sponsored by Circle Gas Station!");
        } else {
          console.log("⚡ Fallback to regular transaction");
        }

        return result;
      } catch (error) {
        console.error(
          "Gasless approval failed, falling back to regular transaction:",
          error
        );
      }
    }

    // Regular transaction (fallback or non-gasless)
    const approveTx = await client.writeContract({
      address: CCTP_CONTRACTS[sourceChain].usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: "approve",
      args: [
        CCTP_CONTRACTS[sourceChain].tokenMessenger as `0x${string}`,
        maxAllowance,
      ],
    });

    return approveTx;
  }

  async burnUSDCWithHook({
    sourceChain,
    amount,
    poolId,
    privyWallet,
    gasless = false,
  }: CCTPTransferParams): Promise<string> {
    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1e6));
    const maxFee = BigInt(500); // 0.0005 USDC
    const recipientBytes32 = `0x000000000000000000000000${DONATION_POOL_CONTRACT.slice(
      2
    )}`;
    const destinationCallerBytes32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    // Encode poolId as hook data
    const hookData = encodePacked(["string"], [poolId]);

    // Switch to the correct chain first
    await privyWallet.switchChain(CHAIN_CONFIG[sourceChain].chain.id);

    // Get the EIP1193 provider from Privy wallet
    const provider = await privyWallet.getEthereumProvider();

    // Create wallet client using Privy's pattern
    const client = createWalletClient({
      account: privyWallet.address as `0x${string}`,
      chain: CHAIN_CONFIG[sourceChain].chain,
      transport: custom(provider),
    });

    if (
      gasless &&
      circleGasService.isGaslessSupported(CHAIN_CONFIG[sourceChain].chain.id)
    ) {
      console.log("🚀 Attempting gasless USDC burn via Circle Gas Station...");

      try {
        const { result, wasGasless } =
          await circleGasService.makeTransactionGasless(
            client,
            {
              to: CCTP_CONTRACTS[sourceChain].tokenMessenger,
              data: encodeFunctionData({
                abi: TOKEN_MESSENGER_V2_ABI,
                functionName: "depositForBurnWithHook",
                args: [
                  amountInUnits,
                  CCTP_CONTRACTS.baseSepolia.domain,
                  recipientBytes32 as `0x${string}`,
                  CCTP_CONTRACTS[sourceChain].usdc as `0x${string}`,
                  destinationCallerBytes32 as `0x${string}`,
                  maxFee,
                  1000,
                  hookData,
                ],
              }),
            },
            async () => {
              return await client.writeContract({
                address: CCTP_CONTRACTS[sourceChain]
                  .tokenMessenger as `0x${string}`,
                abi: TOKEN_MESSENGER_V2_ABI,
                functionName: "depositForBurnWithHook",
                args: [
                  amountInUnits,
                  CCTP_CONTRACTS.baseSepolia.domain,
                  recipientBytes32 as `0x${string}`,
                  CCTP_CONTRACTS[sourceChain].usdc as `0x${string}`,
                  destinationCallerBytes32 as `0x${string}`,
                  maxFee,
                  1000,
                  hookData,
                ],
              });
            }
          );

        if (wasGasless) {
          console.log("✅ Gas fees sponsored by Circle Gas Station!");
        } else {
          console.log("⚡ Fallback to regular transaction");
        }

        return result;
      } catch (error) {
        console.error(
          "Gasless burn failed, falling back to regular transaction:",
          error
        );
      }
    }

    // Regular transaction (fallback or non-gasless)
    const burnTx = await client.writeContract({
      address: CCTP_CONTRACTS[sourceChain].tokenMessenger as `0x${string}`,
      abi: TOKEN_MESSENGER_V2_ABI,
      functionName: "depositForBurnWithHook",
      args: [
        amountInUnits,
        CCTP_CONTRACTS.baseSepolia.domain,
        recipientBytes32 as `0x${string}`,
        CCTP_CONTRACTS[sourceChain].usdc as `0x${string}`,
        destinationCallerBytes32 as `0x${string}`,
        maxFee,
        1000,
        hookData,
      ],
    });

    return burnTx;
  }

  async retrieveAttestation(
    transactionHash: string,
    sourceChain: SupportedChain
  ): Promise<CircleAttestation> {
    const sourceDomain = CCTP_CONTRACTS[sourceChain].domain;
    const url = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(url);

        if (response.status === 404) {
          console.log("Waiting for attestation...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
          continue;
        }

        if (response.data?.messages?.[0]?.status === "complete") {
          return response.data.messages[0];
        }

        console.log(
          `Attestation status: ${
            response.data?.messages?.[0]?.status || "pending"
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        console.error("Error fetching attestation:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    throw new Error("Attestation timeout - transfer may still be processing");
  }

  async mintUSDC(
    attestation: CircleAttestation,
    privyWallet: any
  ): Promise<string> {
    // Always mint on Base Sepolia
    const destinationChain = "baseSepolia";

    // Switch to Base Sepolia
    await privyWallet.switchChain(CHAIN_CONFIG[destinationChain].chain.id);

    // Get the EIP1193 provider from Privy wallet
    const provider = await privyWallet.getEthereumProvider();

    // Create wallet client using Privy's pattern
    const client = createWalletClient({
      account: privyWallet.address as `0x${string}`,
      chain: CHAIN_CONFIG[destinationChain].chain,
      transport: custom(provider),
    });

    const messageTransmitter =
      CCTP_CONTRACTS[destinationChain].messageTransmitter;

    const mintTx = await client.writeContract({
      address: messageTransmitter as `0x${string}`,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [
        attestation.message as `0x${string}`,
        attestation.attestation as `0x${string}`,
      ],
    });

    return mintTx;
  }

  getChainName(chain: SupportedChain): string {
    return CCTP_CONTRACTS[chain].name;
  }

  getChainId(chain: SupportedChain): number {
    return CHAIN_CONFIG[chain].chain.id;
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(CCTP_CONTRACTS) as SupportedChain[];
  }

  getDestinationInfo(): { chain: string; address: string } {
    return {
      chain: "Base Sepolia",
      address: DONATION_POOL_CONTRACT,
    };
  }
}
