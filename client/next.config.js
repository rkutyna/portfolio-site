/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'api.rogerkutyna.com', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'server', port: '3001', pathname: '/uploads/**' },
    ],
  },
};

module.exports = nextConfig;
