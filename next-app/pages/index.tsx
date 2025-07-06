import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import AccountButton from "../components/AccountButton";
import HeroSection from "../components/HeroSection";
import { useGraphQLData } from "../lib/GraphQLContext";
import {
  BASE_DISASTER_ZONES,
  getActiveDisasterZones,
} from "../lib/countryData";

// Dynamically import OpenReliefGlobe to avoid SSR issues
const OpenReliefGlobe = dynamic(() => import("../components/OpenReliefGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-white text-xl">Loading Globe...</div>
    </div>
  ),
});

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookieAuthToken = req.cookies["privy-token"];

  // If no cookie is found, skip any further checks
  if (!cookieAuthToken) return { props: {} };

  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

  // Only verify if we have the required environment variables
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    console.warn("Missing Privy environment variables");
    return { props: {} };
  }

  try {
    const client = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await client.verifyAuthToken(cookieAuthToken);
    console.log("✅ Privy claims verified:", { userId: claims.userId });

    // Keep users on the main page - they can navigate via the globe interface
    return { props: { authenticated: true, userId: claims.userId } };
  } catch (error) {
    console.log("⚠️ Privy token verification failed:", error);
    // Don't throw - just continue without server-side auth
    return { props: {} };
  }
};

interface HomePageProps {
  authenticated?: boolean;
  userId?: string;
}

export default function HomePage({ authenticated, userId }: HomePageProps) {
  const { data, loading, error } = useGraphQLData();

  console.log("🔍 GraphQL data:", data);

  // Convert GraphQL data to active disaster zones
  const activeZones = data?.reliefPoolCreateds
    ? getActiveDisasterZones(data.reliefPoolCreateds)
    : [];

  // Use mock data if no active zones are found
  const zonesToDisplay =
    activeZones.length > 0 ? activeZones : BASE_DISASTER_ZONES;
  const isUsingMockData = activeZones.length === 0;

  return (
    <>
      <Head>
        <title>OpenRelief · Instant Verified Aid</title>
        <meta
          name="description"
          content="Connect donors with disaster zones through verified aid distribution"
        />
      </Head>

      <main className="relative w-full h-screen overflow-hidden">
        {/* Hero Section */}
        <HeroSection />

        {/* Account Button - positioned over everything */}
        <AccountButton />

        {/* Globe Component */}
        <OpenReliefGlobe
          reliefPools={data?.reliefPoolCreateds || []}
          loading={loading}
          error={error}
          donationMades={data?.donationMades || []}
          fundsClaimeds={data?.fundsClaimeds || []}
        />

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-slate-900/90 to-transparent p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">
                Click on highlighted disaster zones to donate or claim aid
              </p>

              {isUsingMockData && (
                <p className="text-xs text-amber-400 mb-3">
                  ⚠️ Demo Mode: Showing sample disaster zones. Connect to live
                  data via blockchain.
                </p>
              )}
              <div className="flex justify-center space-x-4 text-sm text-slate-400">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-1"></div>
                  War
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-700 rounded-full mr-1"></div>
                  Flood
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-600 rounded-full mr-1"></div>
                  Fire
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  Donor Arcs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute top-20 right-4 space-y-2">
            {authenticated && userId && (
              <div className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                Server auth: ✓ {userId}
              </div>
            )}
            <div className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs">
              GraphQL:{" "}
              {loading
                ? "Loading..."
                : error
                  ? "Error"
                  : `✓ ${data?.reliefPoolCreateds?.length || 0} pools`}
            </div>
            <div className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
              Active zones: {activeZones.length}
            </div>
            <div className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded text-xs">
              Display: {zonesToDisplay.length} zones{" "}
              {isUsingMockData ? "(mock)" : "(live)"}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
