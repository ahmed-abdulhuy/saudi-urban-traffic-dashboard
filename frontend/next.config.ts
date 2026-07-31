/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Outputs a static HTML/CSS/JS "out" folder
  images: {
    unoptimized: true, // Disables server-based image optimization
  },
  // OPTIONAL: Only uncomment the line below if you are NOT using a custom domain.
  basePath: '/saudi-urban-traffic-dashboard', 
};

module.exports = nextConfig;
