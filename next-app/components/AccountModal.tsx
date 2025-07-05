import { usePrivy, useWallets } from "@privy-io/react-auth";
import React, { useEffect, useState } from "react";
import { CCTPV2Service, SupportedChain } from "../lib/cctpV2Service";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const cctpService = new CCTPV2Service();

  useEffect(() => {
    if (isOpen && wallets[0] && authenticated) {
      fetchBalances();
    }
  }, [isOpen, wallets, authenticated]);

  const fetchBalances = async () => {
    if (!wallets[0]) return;

    setIsLoading(true);
    try {
      const walletAddress = wallets[0].address;
      const allBalances = await cctpService.getAllUSDCBalances(walletAddress);
      setBalances(allBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundWallet = (chain: SupportedChain) => {
    // Open external funding resources
    const fundingUrls = {
      sepolia: "https://sepoliafaucet.com/",
      baseSepolia: "https://docs.base.org/tools/network-faucets/",
      arbitrumSepolia:
        "https://docs.arbitrum.io/stylus/how-tos/local-stylus-dev-node#get-testnet-eth",
      optimismSepolia: "https://docs.optimism.io/builders/tools/build/faucets",
      polygonAmoy: "https://faucet.polygon.technology/",
    };

    window.open(fundingUrls[chain], "_blank");
  };

  const copyWalletAddress = () => {
    if (wallets[0]) {
      navigator.clipboard.writeText(wallets[0].address);
    }
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return "0.00";
    if (num < 0.01) return "< 0.01";
    return num.toFixed(2);
  };

  const getTotalBalance = (): string => {
    const total = Object.values(balances).reduce((sum, balance) => {
      return sum + parseFloat(balance || "0");
    }, 0);
    return formatBalance(total.toString());
  };

  if (!isOpen || !authenticated) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Account</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white mb-1">
                {user?.email?.address ||
                  user?.phone?.number ||
                  "Connected User"}
              </h3>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-slate-400 font-mono">
                  {wallets[0]?.address.slice(0, 6)}...
                  {wallets[0]?.address.slice(-4)}
                </p>
                <button
                  onClick={copyWalletAddress}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">Total Balance</p>
              <p className="text-lg font-bold text-green-400">
                ${getTotalBalance()}
              </p>
            </div>
          </div>
        </div>

        {/* Balances by Chain */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            USDC Balances
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span className="ml-2 text-slate-400">Loading balances...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {cctpService.getSupportedChains().map((chain) => (
                <div
                  key={chain}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-bold text-white">
                        {cctpService
                          .getChainName(chain)
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {cctpService.getChainName(chain)}
                      </p>
                      <p className="text-xs text-slate-400">
                        ${formatBalance(balances[chain] || "0")} USDC
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFundWallet(chain)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Get Testnet Funds
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Funding Options Info */}
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">
            Funding Options
          </h4>
          <div className="space-y-1 text-xs text-slate-300">
            <p>• Get testnet USDC from faucets</p>
            <p>• Transfer from external wallet (MetaMask, etc.)</p>
            <p>• Bridge from other chains</p>
            <p className="text-slate-500">
              * Mainnet funding available via Privy integration
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={fetchBalances}
            disabled={isLoading}
            className="w-full bg-slate-600 hover:bg-slate-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? "Refreshing..." : "Refresh Balances"}
          </button>

          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
