import { usePrivy, useWallets } from "@privy-io/react-auth";
import React, { useState } from "react";
import AccountModal from "./AccountModal";

const AccountButton: React.FC = () => {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Only show if user is authenticated and has wallets
  if (!authenticated || wallets.length === 0) {
    return null;
  }

  return (
    <>
      {/* Account Button - Top Right Corner */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setAccountModalOpen(true)}
          className="bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm border border-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user?.email?.address?.charAt(0).toUpperCase() ||
                user?.phone?.number?.charAt(0) ||
                wallets[0]?.address.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:block">Account</span>
        </button>
      </div>

      {/* Account Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />
    </>
  );
};

export default AccountButton;
