/** @type {import('next').NextConfig} */
module.exports = {
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
