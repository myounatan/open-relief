import { useWallets } from "@privy-io/react-auth";
import React, { useEffect, useState } from "react";
import { CCTPV2Service, SupportedChain } from "../lib/cctpV2Service";
import { circleGasService } from "../lib/circleGasService";
import { DisasterZoneFeature } from "../lib/countryData";

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
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("sepolia");
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<TransactionStep>("selecting");
  const [error, setError] = useState<TransactionError | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [gasless, setGasless] = useState(true); // Default to gasless
  const [wasGasSponsored, setWasGasSponsored] = useState(false);

  const cctpService = new CCTPV2Service();

  useEffect(() => {
    if (isOpen && wallets[0]) {
      fetchBalances();
    }
  }, [isOpen, wallets]);

  const fetchBalances = async () => {
    if (!wallets[0]) return;

    try {
      const walletAddress = wallets[0].address;
      const allBalances = await cctpService.getAllUSDCBalances(walletAddress);
      setBalances(allBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  // Check if gasless is supported for selected chain
  const isGaslessSupported = () => {
    const chainId = cctpService.getChainId(selectedChain);
    return circleGasService.isGaslessSupported(chainId);
  };

  const handleDonation = async () => {
    if (!wallets[0] || !amount) return;

    setIsLoading(true);
    setError(null);
    setWasGasSponsored(false);

    try {
      const privyWallet = wallets[0];
      const poolId = disasterZone.properties.id; // Use zone ID as pool ID

      // Step 1: Approve USDC
      setCurrentStep("approving");
      const approveTx = await cctpService.approveUSDC({
        sourceChain: selectedChain,
        amount,
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
    } catch (error: any) {
      console.error("Donation error:", error);
      setError({
        message: error.message || "Transaction failed",
        details: error.reason || error.details || "Unknown error occurred",
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
        {isGaslessSupported() && (
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
        {wasGasSponsored && currentStep === "complete" && (
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
            {txHash && (
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
            {error?.details && (
              <p className="text-xs text-slate-500 mb-4">{error.details}</p>
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
