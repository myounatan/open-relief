import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Fail build on ESLint errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Fail build on TypeScript errors
    ignoreBuildErrors: false,
  },
};

export default varlockNextConfigPlugin()(nextConfig);
