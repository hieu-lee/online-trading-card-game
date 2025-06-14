/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Recommended for static exports
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;