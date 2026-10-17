/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "127.0.0.1",
    "localhost",
    process.env.REPLIT_DEV_DOMAIN,
  ].filter(Boolean),
  reactStrictMode: true,
};

export default nextConfig;
