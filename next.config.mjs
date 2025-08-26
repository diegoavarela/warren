/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'puppeteer'],
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      'chart.js',
      'react-chartjs-2',
    ],
  },
  
  // Webpack bundle optimizations
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Improved tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxSize: 250000, // 250KB max chunk size
          cacheGroups: {
            // Chart libraries in separate chunk
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // Radix UI components
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 25,
              enforce: true,
            },
            // Icons
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/]@heroicons[\\/]/,
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Optimized image configuration
  images: {
    domains: ['vercel.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  
  // Optimize for serverless deployment
  output: 'standalone',
  
  // Caching headers for better performance
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300', // 5 minutes for API routes
          },
        ],
      },
    ];
  },
};

export default nextConfig;