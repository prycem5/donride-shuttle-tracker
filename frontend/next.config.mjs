/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Vercel deployment optimizations
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Fix workspace root warning for Vercel
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
