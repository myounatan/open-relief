import { useLogin, usePrivy } from "@privy-io/react-auth";

const HeroSection = () => {
  const { login } = useLogin();
  const { ready, authenticated } = usePrivy();

  // Don't render until Privy is ready
  if (!ready) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900/80 to-transparent p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            OpenRelief
          </h1>
          <p className="text-xl md:text-2xl text-orange-400 mb-6">
            Instant Verified Aid
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            Connect donors directly with disaster zones through transparent,
            verified aid distribution using cross-chain USDC transfers.
          </p>
          {!authenticated && (
            <button
              className="bg-orange-600 hover:bg-orange-700 py-3 px-8 text-white rounded-lg font-medium text-lg transition-colors shadow-lg"
              onClick={login}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
