const path = require('path');
const fs = require('fs');

// Ensure .env is available when Next evaluates this config
try {
  const dotenvPath = path.join(__dirname, '.env');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch {
  // dotenv optional at config-load time
}

function bunnyHosts() {
  const hosts = new Set(['leather-e-com.b-cdn.net']);
  const raw = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;
  if (raw) {
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* ignore bad URL */
    }
  }
  return Array.from(hosts);
}

const bunnyCdnHosts = bunnyHosts();

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Keep domains for broad compatibility + remotePatterns for Next 15
    domains: [
      ...bunnyCdnHosts,
      'res.cloudinary.com',
      'images.pexels.com',
    ],
    remotePatterns: [
      ...bunnyCdnHosts.map((hostname) => ({
        protocol: 'https',
        hostname,
        pathname: '/**',
      })),
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  generateEtags: true,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/((?!api).*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/muscarimart',
        destination: '/',
        permanent: true,
      },
      {
        source: '/well-rise',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
