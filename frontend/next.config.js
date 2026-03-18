/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Disable the built-in image optimizer to mitigate GHSA-9g9p-9gw9-jx7f
    unoptimized: true,
  },
};

module.exports = nextConfig;
