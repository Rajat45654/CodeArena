/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@codearena/shared-types', '@codearena/validation'],
};

module.exports = nextConfig;
