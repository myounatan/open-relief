import { PrivyProvider } from "@privy-io/react-auth";
import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/fonts/AdelleSans-Regular.woff"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Regular.woff2"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Semibold.woff"
          as="font"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/AdelleSans-Semibold.woff2"
          as="font"
          crossOrigin=""
        />

        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/favicons/manifest.json" />

        <title>OpenRelief · Instant Verified Aid</title>
        <meta
          name="description"
          content="Connect donors with disaster zones through verified aid distribution using cross-chain USDC transfers. Powered by Circle's CCTP V2 for instant global donations."
        />
        <meta
          name="keywords"
          content="disaster relief, donations, cryptocurrency, USDC, cross-chain, CCTP, Circle, humanitarian aid, blockchain"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openrelief.org/" />
        <meta property="og:title" content="OpenRelief · Instant Verified Aid" />
        <meta
          property="og:description"
          content="Connect donors with disaster zones through verified aid distribution using cross-chain USDC transfers."
        />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openrelief.org/" />
        <meta
          property="twitter:title"
          content="OpenRelief · Instant Verified Aid"
        />
        <meta
          property="twitter:description"
          content="Connect donors with disaster zones through verified aid distribution using cross-chain USDC transfers."
        />
      </Head>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
        }}
      >
        <Component {...pageProps} />
      </PrivyProvider>
    </>
  );
}

export default MyApp;
