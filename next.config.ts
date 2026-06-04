import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/family-carender' : '',
  assetPrefix: isProd ? '/family-carender/' : '',
  trailingSlash: true,
  images: {
    unoptimized: true, // GitHub Pages は画像最適化APIが使えないため
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
