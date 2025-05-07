import type { NextConfig } from 'next';

const nextConfig = {
    images: {
      domains: [
        'lh3.googleusercontent.com',    // Google user profile images
        'firebasestorage.googleapis.com',  // Firebase Storage images
        'storage.googleapis.com'        // Another Firebase Storage domain
      ],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
          pathname: '**',
        },
        {
          protocol: 'https',
          hostname: 'firebasestorage.googleapis.com',
          pathname: '**',
        }
      ]
    },
    // Other Next.js config options
    reactStrictMode: true,
  };

export default nextConfig;
