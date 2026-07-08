/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Enforce standard experimental or production client-side canvas optimization if needed */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
