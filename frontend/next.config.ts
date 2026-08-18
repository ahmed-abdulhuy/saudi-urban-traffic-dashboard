import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

console.log('GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
console.log('isGitHubPages:', isGitHubPages);

const nextConfig: NextConfig = {
  output: 'export',

  basePath: isGitHubPages
    ? '/saudi-urban-traffic-dashboard'
    : '',

  images: {
    unoptimized: true,
  },
};

export default nextConfig;