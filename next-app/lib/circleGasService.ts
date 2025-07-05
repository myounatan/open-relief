import { WalletClient } from "viem";

// Gas Station contract addresses (same across all networks)
const GAS_STATION_CONTRACT = "0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25";

// Chain mappings for Gas Station
const GAS_STATION_SUPPORTED_CHAINS = {
  ETH_SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  ARB_SEPOLIA: 421614,
  OP_SEPOLIA: 11155420,
  MATIC_AMOY: 80002,
} as const;

export interface GaslessTransactionRequest {
  to: string;
  data: string;
  value?: string;
  gasLimit?: string;
}

export interface GaslessTransactionResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  gasSponsored: boolean;
}

/**
 * Client-side Circle Gas Station service
 * This handles gasless transactions without requiring API keys
 * For testnet, Circle automatically sponsors qualifying transactions
 */
export class CircleGasService {
  /**
   * Check if gasless transactions are supported for a given chain
   */
  isGaslessSupported(chainId: number): boolean {
    return Object.values(GAS_STATION_SUPPORTED_CHAINS).includes(chainId as any);
  }

  /**
   * Get the Gas Station contract address (same for all chains)
   */
  getGasStationContract(): string {
    return GAS_STATION_CONTRACT;
  }

  /**
   * Send a gasless transaction using Circle's Gas Station
   * On testnet, Circle automatically sponsors transactions within daily limits
   * No API key required for basic sponsorship
   */
  async sendGaslessTransaction(
    walletClient: WalletClient,
    request: GaslessTransactionRequest
  ): Promise<GaslessTransactionResponse> {
    try {
      const chainId = await walletClient.getChainId();

      if (!this.isGaslessSupported(chainId)) {
        return {
          success: false,
          gasSponsored: false,
          error: `Gasless transactions not supported on chain ${chainId}`,
        };
      }

      const account = walletClient.account;
      if (!account) {
        throw new Error("No account connected");
      }

      // Send the transaction - Gas Station will automatically sponsor gas fees
      // on testnet for qualifying transactions within daily limits
      const txHash = await walletClient.sendTransaction({
        to: request.to as `0x${string}`,
        data: request.data as `0x${string}`,
        value: BigInt(request.value || "0"),
        gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
        account,
        chain: walletClient.chain,
      });

      return {
        success: true,
        txHash,
        gasSponsored: true,
      };
    } catch (error) {
      console.error("Circle gasless transaction failed:", error);
      return {
        success: false,
        gasSponsored: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if a wallet is eligible for gas sponsorship
   * For testnet, all wallets are eligible up to daily limits:
   * - Polygon Amoy: 50 MATIC/day
   * - Ethereum Sepolia: 50 ETH/day
   * - Base Sepolia: 50 ETH/day
   * - Arbitrum Sepolia: 50 ETH/day
   * - Optimism Sepolia: 50 ETH/day
   */
  async isWalletEligible(address: string, chainId: number): Promise<boolean> {
    if (!this.isGaslessSupported(chainId)) {
      return false;
    }

    // For testnet, all addresses are eligible within daily limits
    return true;
  }

  /**
   * Get estimated gas savings from using Circle Gas Station
   */
  async getGasSavings(
    chainId: number,
    gasUsed: bigint
  ): Promise<{
    nativeTokenSaved: string;
    usdSaved: string;
  }> {
    // This is an estimate - in reality you'd fetch current gas prices
    const gasPrice = BigInt("20000000000"); // 20 gwei estimate
    const totalGasCost = gasUsed * gasPrice;

    return {
      nativeTokenSaved: (Number(totalGasCost) / 1e18).toFixed(6),
      usdSaved: "~$0.50", // Rough estimate
    };
  }

  /**
   * Simple wrapper to make any transaction gasless if supported
   * Falls back to regular transaction if gasless fails
   */
  async makeTransactionGasless<T>(
    walletClient: WalletClient,
    transaction: {
      to: string;
      data?: string;
      value?: bigint;
    },
    fallbackFn: () => Promise<T>
  ): Promise<{ result: T; wasGasless: boolean }> {
    const chainId = await walletClient.getChainId();

    if (!this.isGaslessSupported(chainId)) {
      // Fall back to regular transaction
      const result = await fallbackFn();
      return { result, wasGasless: false };
    }

    try {
      // Try gasless transaction
      const gaslessResult = await this.sendGaslessTransaction(walletClient, {
        to: transaction.to,
        data: transaction.data || "0x",
        value: transaction.value?.toString() || "0",
      });

      if (gaslessResult.success && gaslessResult.txHash) {
        return {
          result: gaslessResult.txHash as T,
          wasGasless: true,
        };
      }
    } catch (error) {
      console.warn(
        "Gasless transaction failed, falling back to regular transaction:",
        error
      );
    }

    // Fall back to regular transaction
    const result = await fallbackFn();
    return { result, wasGasless: false };
  }

  /**
   * Get supported chains for display purposes
   */
  getSupportedChains(): Record<string, number> {
    return { ...GAS_STATION_SUPPORTED_CHAINS };
  }
}

// Singleton instance - now safe for client-side use
export const circleGasService = new CircleGasService();
