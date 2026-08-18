import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',

  basePath: '/saudi-urban-traffic-dashboard',

  images: {
    unoptimized: true,
  },
};

export default nextConfig;