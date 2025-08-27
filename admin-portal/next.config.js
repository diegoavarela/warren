/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  },
  webpack: (config, { isServer }) => {
    // Handle symlinks for shared modules
    config.resolve.symlinks = false;
    return config;
  },
};

module.exports = nextConfig;