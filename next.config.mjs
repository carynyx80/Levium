/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi / rainbowkit: silence optional react-native deps
    config.resolve.fallback = { ...(config.resolve.fallback || {}), encoding: false };
    return config;
  },
};

export default nextConfig;
