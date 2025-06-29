/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  // Recommended for static exports
  images: {
    unoptimized: true,
  },
  basePath: isProd ? '/online-trading-card-game' : '',
  assetPrefix: isProd ? '/online-trading-card-game/' : '',
};

module.exports = nextConfig;