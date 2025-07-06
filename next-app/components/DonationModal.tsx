import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CCTPV2Service, SupportedChain } from "../lib/cctpV2Service";
import { DisasterZoneFeature } from "../lib/countryData";
import { useGraphQLData } from "../lib/GraphQLContext";

// Add contract ABI for the donate function
const RELIEF_POOLS_ABI = [
  "function donate(string memory poolId, uint256 amount, string memory location) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// Contract addresses for Base Sepolia
const DONATION_POOL_ADDRESS = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS!;
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  disasterZone: DisasterZoneFeature;
}

type TransactionStep =
  | "selecting"
  | "approving"
  | "burning"
  | "waiting"
  | "complete"
  | "error";

interface TransactionError {
  message: string;
  details?: string;
}

const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  disasterZone,
}) => {
  const { wallets } = useWallets();
  const { refetch } = useGraphQLData();
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("sepolia");
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<TransactionStep>("selecting");
  const [error, setError] = useState<TransactionError | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [gasless, setGasless] = useState(true); // Default to gasless
  const [wasGasSponsored, setWasGasSponsored] = useState(false);

  const cctpService = useMemo(() => new CCTPV2Service(), []);

  const fetchBalances = useCallback(async () => {
    if (!wallets[0]) return;

    try {
      const walletAddress = wallets[0].address;
      const allBalances = await cctpService.getAllUSDCBalances(walletAddress);
      setBalances(allBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [wallets, cctpService]);

  useEffect(() => {
    if (isOpen && wallets[0]) {
      fetchBalances();
    }
  }, [isOpen, wallets, fetchBalances]);

  // Check if gasless is supported for selected chain
  const isGaslessSupported = () => {
    return false;
  };

  // Get user's geolocation
  const getUserLocation = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locationString = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
          resolve(locationString);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Fallback to empty string if geolocation fails
          resolve("");
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, []);

  // Check if user is on Base network and selected Base USDC
  const isDirectBaseTransaction = useCallback(() => {
    return selectedChain === "baseSepolia" && wallets[0];
  }, [selectedChain, wallets]);

  // Direct donation to Base network smart contract
  const donateDirectToBase = useCallback(async () => {
    if (!wallets[0] || !amount) return;

    const wallet = wallets[0];
    const poolId = disasterZone.properties.id;
    const amountWei = ethers.parseUnits(amount, 6); // USDC has 6 decimals
    const approvalAmount = ethers.parseUnits("1000000", 6); // Approve 1M USDC to be safe

    try {
      // Get user location
      const location = await getUserLocation();
      console.log("📍 User location:", location);

      // Get ethereum provider from wallet
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      console.log("💰 Donation details:", {
        poolId,
        amount,
        amountWei: amountWei.toString(),
        donationPoolAddress: DONATION_POOL_ADDRESS,
        usdcAddress: BASE_SEPOLIA_USDC,
        userAddress: wallet.address,
      });

      // Step 1: Approve USDC
      setCurrentStep("approving");
      console.log("🔐 Starting USDC approval...");

      const usdcContract = new ethers.Contract(
        BASE_SEPOLIA_USDC,
        RELIEF_POOLS_ABI,
        signer
      );
      const approveTx = await (usdcContract as any).approve(
        DONATION_POOL_ADDRESS,
        approvalAmount
      );

      console.log("⏳ Waiting for approval transaction:", approveTx.hash);
      const approvalReceipt = await approveTx.wait();
      console.log("✅ Approval confirmed:", approvalReceipt.hash);

      // Step 2: Make donation
      setCurrentStep("burning");
      console.log("🎯 Starting donation transaction...");

      const reliefPoolsContract = new ethers.Contract(
        DONATION_POOL_ADDRESS,
        RELIEF_POOLS_ABI,
        signer
      );
      const donateTx = await (reliefPoolsContract as any).donate(
        poolId,
        amountWei,
        location
      );

      console.log("⏳ Waiting for donation transaction:", donateTx.hash);
      const receipt = await donateTx.wait();
      console.log("✅ Donation confirmed:", receipt.hash);

      setTxHash(receipt.hash);
      setCurrentStep("complete");

      // Refetch GraphQL data
      setTimeout(() => {
        refetch();
      }, 2000); // Wait 2 seconds for blockchain to update

      return receipt.hash;
    } catch (error) {
      console.error("Direct donation error:", error);
      throw error;
    }
  }, [wallets, amount, disasterZone, getUserLocation, refetch]);

  const handleDonation = async () => {
    if (!wallets[0] || !amount) return;

    setIsLoading(true);
    setError(null);
    setWasGasSponsored(false);

    try {
      // Check if this is a direct Base transaction
      if (isDirectBaseTransaction()) {
        await donateDirectToBase();
        // Refresh balances
        await fetchBalances();
        return;
      }

      // Otherwise, use CCTP for cross-chain donations
      const privyWallet = wallets[0];
      const poolId = disasterZone.properties.id; // Use zone ID as pool ID

      // Step 1: Approve USDC
      setCurrentStep("approving");
      const approveTx = await cctpService.approveUSDC({
        sourceChain: selectedChain,
        privyWallet,
        gasless: gasless && isGaslessSupported(),
      });
      console.log("Approval transaction:", approveTx);

      // Step 2: Burn USDC with hook data
      setCurrentStep("burning");
      const burnTx = await cctpService.burnUSDCWithHook({
        sourceChain: selectedChain,
        amount,
        poolId,
        privyWallet,
        gasless: gasless && isGaslessSupported(),
      });
      console.log("Burn transaction:", burnTx);
      setTxHash(burnTx);

      // Check if gas was sponsored
      if (gasless && isGaslessSupported()) {
        setWasGasSponsored(true);
      }

      // Step 3: Wait for attestation
      setCurrentStep("waiting");
      const attestation = await cctpService.retrieveAttestation(
        burnTx,
        selectedChain
      );
      console.log("Attestation received:", attestation);

      // Step 4: Complete (no manual minting needed with hook)
      setCurrentStep("complete");

      // Refresh balances
      await fetchBalances();

      // Refetch GraphQL data for CCTP transactions too
      setTimeout(() => {
        refetch();
      }, 3000); // Wait 3 seconds for cross-chain to complete
    } catch (error: unknown) {
      console.error("Donation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      const errorDetails =
        error instanceof Error && "reason" in error
          ? (error as Error & { reason?: string; details?: string }).reason ||
            (error as Error & { reason?: string; details?: string }).details ||
            "Unknown error occurred"
          : "Unknown error occurred";

      setError({
        message: errorMessage,
        details: errorDetails,
      });
      setCurrentStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep("selecting");
    setError(null);
    setTxHash("");
    setAmount("");
    setIsLoading(false);
    setWasGasSponsored(false);
  };

  const getStepDescription = () => {
    const gaslessText = gasless && isGaslessSupported() ? " (Gas-free)" : "";
    switch (currentStep) {
      case "selecting":
        return "Select your donation amount and source chain";
      case "approving":
        return `Approving USDC transfer${gaslessText}...`;
      case "burning":
        return `Initiating cross-chain transfer${gaslessText}...`;
      case "waiting":
        return "Waiting for cross-chain confirmation (8-20 seconds)...";
      case "complete":
        return "Donation completed successfully!";
      case "error":
        return "Transaction failed";
      default:
        return "";
    }
  };

  const destinationInfo = cctpService.getDestinationInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            Donate to {disasterZone.properties.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-300 mb-2">
            {disasterZone.properties.description}
          </p>
          <div className="text-xs text-slate-500">
            Pool ID: {disasterZone.properties.id}
          </div>
        </div>

        {/* Gas Station Feature */}
        {isGaslessSupported() === true && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-white">
                  Circle Gas Station
                </span>
              </div>
              <button
                onClick={() => setGasless(!gasless)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  gasless ? "bg-blue-600" : "bg-slate-600"
                }`}
                disabled={currentStep !== "selecting"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    gasless ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              {gasless
                ? "✨ Gas fees sponsored by Circle - donate without paying gas!"
                : "💸 Pay your own gas fees"}
            </p>
          </div>
        )}

        {/* Gas Savings Display */}
        {wasGasSponsored === true && currentStep === "complete" && (
          <div className="mb-4 p-3 bg-green-900/30 rounded-lg border border-green-500/30">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-green-400">💰</span>
              <span className="text-sm font-medium text-green-300">
                Gas Fees Saved!
              </span>
            </div>
            <p className="text-xs text-green-200">
              Circle Gas Station sponsored your transaction fees. More of your
              donation goes directly to aid!
            </p>
          </div>
        )}

        {/* Destination Info */}
        <div className="mb-6 p-3 bg-slate-700 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2">Destination</h3>
          <div className="text-xs text-slate-300">
            <div>Chain: {destinationInfo.chain}</div>
            <div className="mt-1">Pool: {destinationInfo.address}</div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Progress</span>
            <span className="text-xs text-slate-400">
              {currentStep === "complete"
                ? "4/4"
                : currentStep === "waiting"
                  ? "3/4"
                  : currentStep === "burning"
                    ? "2/4"
                    : currentStep === "approving"
                      ? "1/4"
                      : "0/4"}
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep === "complete"
                  ? "bg-green-500 w-full"
                  : currentStep === "waiting"
                    ? "bg-blue-500 w-3/4"
                    : currentStep === "burning"
                      ? "bg-yellow-500 w-2/4"
                      : currentStep === "approving"
                        ? "bg-orange-500 w-1/4"
                        : "bg-slate-500 w-0"
              }`}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{getStepDescription()}</p>
        </div>

        {currentStep === "selecting" && (
          <>
            {/* Source Chain Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Source Chain
              </label>
              <select
                value={selectedChain}
                onChange={(e) =>
                  setSelectedChain(e.target.value as SupportedChain)
                }
                className="w-full p-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                {cctpService.getSupportedChains().map((chain) => (
                  <option key={chain} value={chain}>
                    {cctpService.getChainName(chain)} (
                    {balances[chain] || "0.00"} USDC)
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <div className="text-xs text-slate-400 mt-1">
                Available: {balances[selectedChain] || "0.00"} USDC
              </div>
            </div>

            {/* Donation Button */}
            <button
              onClick={handleDonation}
              disabled={!amount || parseFloat(amount) <= 0 || isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "Processing..." : "Donate"}
            </button>
          </>
        )}

        {(currentStep === "approving" ||
          currentStep === "burning" ||
          currentStep === "waiting") && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white mb-2">Processing your donation...</p>
            <p className="text-sm text-slate-400">
              {amount} USDC from {cctpService.getChainName(selectedChain)} to{" "}
              {destinationInfo.chain}
            </p>
            {Boolean(txHash) && (
              <p className="text-xs text-slate-500 mt-2 break-all">
                Transaction: {txHash}
              </p>
            )}
          </div>
        )}

        {currentStep === "complete" && (
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Donation Complete!
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Your {amount} USDC donation has been successfully transferred to
              the {disasterZone.properties.name} relief pool.
            </p>
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {currentStep === "error" && (
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Transaction Failed
            </h3>
            <p className="text-sm text-slate-300 mb-2">{error?.message}</p>
            {Boolean(error?.details) && (
              <p className="text-xs text-slate-500 mb-4">{error!.details}</p>
            )}
            <div className="space-y-2">
              <button
                onClick={resetModal}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationModal;
