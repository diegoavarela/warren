/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  },
  webpack: (config, { isServer }) => {
    // Handle symlinks for shared modules
    config.resolve.symlinks = false;
    
    // Resolve shared dependencies from warren's node_modules
    config.resolve.modules = config.resolve.modules || []
    config.resolve.modules.unshift(require('path').resolve(__dirname, '../warren/node_modules'))
    
    return config;
  },
  // Production optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },
  // Vercel deployment settings
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;