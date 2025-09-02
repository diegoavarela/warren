/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set default port to 4000
  env: {
    PORT: '4000',
  },
  
  // Additional configuration options
  reactStrictMode: true,
  swcMinify: true,
  
  webpack: (config, { isServer }) => {
    // Resolve shared dependencies from warren's own node_modules
    config.resolve.modules = config.resolve.modules || []
    config.resolve.modules.unshift(require('path').resolve(__dirname, './node_modules'))
    
    return config;
  },
  
  // Handle ESLint during builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  
  // Handle TypeScript errors during builds
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig