import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',

  basePath: process.env.GITHUB_ACTIONS
    ? '/saudi-urban-traffic-dashboard'
    : '',

  assetPrefix: process.env.GITHUB_ACTIONS
    ? '/saudi-urban-traffic-dashboard/'
    : '',

  images: {
    unoptimized: true,
  },
};

export default nextConfig;