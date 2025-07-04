import { useLogin } from "@privy-io/react-auth";
import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";

// Dynamically import AidGlobe to avoid SSR issues
const AidGlobe = dynamic(() => import("../components/AidGlobe"), {
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
  const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

  try {
    const claims = await client.verifyAuthToken(cookieAuthToken);
    // Use this result to pass props to a page for server rendering or to drive redirects!
    // ref https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props
    console.log({ claims });

    return {
      props: {},
      redirect: { destination: "/dashboard", permanent: false },
    };
  } catch (error) {
    return { props: {} };
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: () => router.push("/dashboard"),
  });

  return (
    <>
      <Head>
        <title>AidRelay · Instant Verified Aid</title>
        <meta
          name="description"
          content="Connect donors with disaster zones through verified aid distribution"
        />
      </Head>

      <main className="relative w-full h-screen overflow-hidden">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900/80 to-transparent p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                AidRelay
              </h1>
              <p className="text-xl md:text-2xl text-orange-400 mb-6">
                Instant Verified Aid
              </p>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
                Connect donors directly with disaster zones through transparent,
                verified aid distribution. See real-time impact across the
                globe.
              </p>
              <button
                className="bg-orange-600 hover:bg-orange-700 py-3 px-8 text-white rounded-lg font-medium text-lg transition-colors shadow-lg"
                onClick={login}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Globe Component */}
        <AidGlobe />

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-slate-900/80 to-transparent p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">
                Click on highlighted disaster zones to donate or claim aid
              </p>
              <div className="flex justify-center space-x-8 text-xs text-slate-500">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  Critical Zones
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  High Priority
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Donor Arcs
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
