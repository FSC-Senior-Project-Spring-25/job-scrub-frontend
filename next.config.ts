import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // Change this if your backend runs on a different port
      },
    ];
  },
};

export default nextConfig;
