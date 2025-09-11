// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  // Your existing Next.js config options
  // For example:
  reactStrictMode: true,
  swcMinify: true,

  // PWA-specific configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
  }
});

module.exports = nextConfig;