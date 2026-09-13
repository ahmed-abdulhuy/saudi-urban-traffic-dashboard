import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  ...(isGitHubPages ? { output: "export" } : {}),

  basePath: isGitHubPages
    ? "/saudi-urban-traffic-dashboard"
    : "",

  images: {
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
  },
};

export default nextConfig;