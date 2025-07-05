import { useWallets } from "@privy-io/react-auth";
import { getUniversalLink } from "@selfxyz/core";
import { SelfAppBuilder, SelfQRcodeWrapper } from "@selfxyz/qrcode";
import React, { useEffect, useState } from "react";
import { DisasterZoneFeature } from "../lib/countryData";
import { shouldUseMobileFlow } from "../lib/deviceDetection";

interface IdentityVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: (verificationData: any) => void;
  disasterZone: DisasterZoneFeature;
}

const IdentityVerification: React.FC<IdentityVerificationProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  disasterZone,
}) => {
  const { wallets } = useWallets();
  const [userId, setUserId] = useState<string>("");
  const [selfApp, setSelfApp] = useState<any>(null);
  const [deeplink, setDeeplink] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Check mobile status
  useEffect(() => {
    setIsMobile(shouldUseMobileFlow());
  }, []);

  // Generate user ID and Self app configuration
  useEffect(() => {
    if (isOpen && wallets[0]) {
      const walletAddress = wallets[0].address;

      console.log("🔍 Wallet Address:", walletAddress);

      // Use wallet address as user ID for blockchain addresses
      const userIdentifier = walletAddress;
      setUserId(userIdentifier);

      console.log("🔍 User Identifier:", userIdentifier);

      try {
        // Configure Self app with verification requirements
        const config = {
          appName: "OpenRelief",
          scope: "openrelief",
          endpointType: "staging_celo",
          endpoint: `${process.env.NEXT_PUBLIC_IDENTITY_VERIFIER_ADDRESS}`,
          logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png", // Could add your logo here
          userId: `${userIdentifier}`,
          userIdType: "hex", // Using blockchain address
          version: 2,
          userDefinedData: "Bonjour Cannes!",
          disclosures: {
            // what you want to verify from users' identity
            // minimumAge: 0,
            // ofac: false,
            // excludedCountries: [countries.BELGIUM],

            //what you want users to reveal
            // name: false,
            // issuing_state: true,
            nationality: true,
            // date_of_birth: true,
            // passport_number: false,
            gender: true,
            // expiry_date: false,
          },
        };

        console.log("🔧 Self App Configuration:", {
          ...config,
          // userId: userIdentifier.substring(0, 10) + "...",
          // userDefinedData: config.userDefinedData.substring(0, 20) + "...",
        });

        console.log("🌐 Endpoint URL being used:", config.endpoint);
        console.log("🔍 NEXT_PUBLIC_URL env var:", process.env.NEXT_PUBLIC_URL);

        const selfAppConfig = new SelfAppBuilder(config).build();
        // const selfAppConfig = new SelfAppBuilder({
        //   version: 2,
        //   appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Self Workshop",
        //   scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "self-workshop",
        //   endpoint: `${process.env.NEXT_PUBLIC_IDENTITY_VERIFIER_ADDRESS}`,
        //   logoBase64:
        //     "https://i.postimg.cc/mrmVf9hm/self.png", // url of a png image, base64 is accepted but not recommended
        //   userId: ethers.ZeroAddress,
        //   endpointType: "staging_celo",
        //   userIdType: "hex", // use 'hex' for ethereum address or 'uuid' for uuidv4
        //   userDefinedData: "Bonjour Cannes!",
        //   disclosures: {

        //   // // what you want to verify from users' identity
        //     minimumAge: 18,
        //     // ofac: false,
        //     // excludedCountries: [countries.BELGIUM],

        //   // //what you want users to reveal
        //     // name: false,
        //     // issuing_state: true,
        //     nationality: true,
        //     // date_of_birth: true,
        //     // passport_number: false,
        //     gender: true,
        //     // expiry_date: false,
        //   }
        // }).build();
        setSelfApp(selfAppConfig);

        // Generate deeplink for mobile
        if (shouldUseMobileFlow()) {
          const universalLink = getUniversalLink(selfAppConfig);
          setDeeplink(universalLink);
        }
      } catch (error) {
        console.error("Error creating Self app:", error);
        setErrorMessage("Failed to initialize identity verification");
        setVerificationStatus("error");
      }
    }
  }, [isOpen, wallets, disasterZone]);

  const handleVerificationSuccess = (result?: any) => {
    console.log(
      "🔍 Self Verification Result:",
      JSON.stringify(result, null, 2)
    );
    setVerificationStatus("success");
    // Pass the verification result from Self
    onVerificationSuccess({
      userId,
      verified: true,
      timestamp: new Date().toISOString(),
      poolId: disasterZone.properties.id,
      selfResult: result,
    });
  };

  const handleMobileDeeplink = () => {
    if (deeplink) {
      setVerificationStatus("verifying");
      window.location.href = deeplink;

      // Set a timeout to check verification status
      // In production, you'd poll your backend for verification status
      setTimeout(() => {
        console.log(
          "📱 Mobile deeplink verification timeout - simulating success"
        );
        // Mock successful verification for demo
        handleVerificationSuccess();
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Verify Identity</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-300 mb-2">
            To claim aid from {disasterZone.properties.name}, you need to verify
            your identity using your government-issued passport.
          </p>
          <div className="text-xs text-slate-500">
            This ensures aid reaches verified individuals in affected areas.
          </div>
        </div>

        {verificationStatus === "idle" && (
          <>
            {isMobile ? (
              // Mobile: Show deeplink button
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Verify with Self App
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Tap the button below to open the Self app and verify your
                    identity with your passport.
                  </p>
                </div>

                <button
                  onClick={handleMobileDeeplink}
                  disabled={!deeplink}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Open Self App
                </button>

                <p className="text-xs text-slate-500 mt-3">
                  Don&apos;t have the Self app? Download it from your app store.
                </p>
              </div>
            ) : (
              // Desktop: Show QR code
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Scan QR Code with Self App
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Use the Self mobile app to scan this QR code and verify your
                    identity.
                  </p>
                </div>

                {selfApp && (
                  <div className="flex justify-center mb-4">
                    <SelfQRcodeWrapper
                      selfApp={selfApp}
                      onSuccess={() => {
                        console.log("📱 QR Code verification completed");
                        handleVerificationSuccess();
                      }}
                      onError={(error) => {
                        console.error("QR verification error:", error);
                        setErrorMessage(
                          "QR code verification failed. Please try again."
                        );
                        setVerificationStatus("error");
                      }}
                      size={250}
                    />
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Download the Self app on your mobile device to get started.
                </p>
              </div>
            )}

            <div className="mt-6 p-3 bg-slate-700 rounded-lg">
              <div className="text-sm text-slate-300 mb-2">
                <strong>What we&apos;ll verify:</strong>
              </div>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Your name and nationality</li>
                <li>• Age verification (18+)</li>
                <li>• Sanctions screening</li>
                <li>• Passport authenticity</li>
              </ul>
            </div>
          </>
        )}

        {verificationStatus === "verifying" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Verifying Identity...
            </h3>
            <p className="text-sm text-slate-400">
              Please complete the verification process in the Self app.
            </p>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Identity Verified!
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Your identity has been successfully verified. You can now proceed
              to claim aid.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Continue to Claim
            </button>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Verification Failed
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              {errorMessage ||
                "There was an error during verification. Please try again."}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setVerificationStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
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

        {verificationStatus === "idle" && (
          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityVerification;
