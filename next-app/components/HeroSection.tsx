import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [totalDonated, setTotalDonated] = useState(1247892);
  const [totalClaimed, setTotalClaimed] = useState(956734);

  // Auto-increment counters to simulate live donations
  useEffect(() => {
    const interval = setInterval(
      () => {
        // Randomly increment donated amount every few seconds
        setTotalDonated(
          (prev) => prev + Math.floor(Math.random() * 5000) + 500
        );

        // Randomly increment claimed amount (slower than donated)
        if (Math.random() > 0.6) {
          setTotalClaimed(
            (prev) => prev + Math.floor(Math.random() * 2000) + 200
          );
        }
      },
      2000 + Math.random() * 3000
    ); // Every 2-5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-0 left-0 z-10 w-80 h-screen backdrop-blur-sm">
      <div className="p-8 h-full flex flex-col justify-center">
        <div className="text-white space-y-8">
          {/* Live Counters */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Total Donated</div>
              <div className="text-2xl font-bold text-green-400">
                $
                <NumberFlow value={totalDonated} />
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Total Claimed</div>
              <div className="text-2xl font-bold text-blue-400">
                $
                <NumberFlow value={totalClaimed} />
              </div>
            </div>
          </div>

          {/* Project Description */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-orange-400 mb-2">
              About Open Relief
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Revolutionizing disaster relief through blockchain transparency.
              We connect global donors directly to verified disaster zones using
              cross-chain USDC transfers, ensuring instant aid delivery with
              zero intermediaries.
            </p>
          </div>

          {/* Instructions */}
          <div className="mt-6">
            <p className="text-sm text-slate-400 italic">
              Click on any disaster zone to donate or claim aid
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
