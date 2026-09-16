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

/**
 * User agents that must receive metadata inside `<head>`.
 *
 * Next 15 streams metadata by default: the HTML shell flushes first and the
 * title, description, canonical and OG tags arrive later in the body, where
 * React hoists them during hydration. That is the right trade for a browser —
 * it does not delay first paint — and Next already forces blocking metadata for
 * a built-in list of crawlers that do not run JavaScript.
 *
 * That built-in list predates the AI crawlers and does not include them. GPTBot,
 * PerplexityBot, ClaudeBot and the rest would have received a document whose
 * head had no title and no description, which for an answer engine is the whole
 * page. They are added here.
 *
 * `tests/seo-crawlers.test.ts` asserts this stays in step with
 * `BRAND.aiCrawlers`, which is what robots.txt advertises — two lists that must
 * not drift apart.
 */
const AI_CRAWLER_UA_PATTERN =
  'GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|ClaudeBot|Claude-Web|Google-Extended|Applebot-Extended|CCBot|Amazonbot';

/** Next's own default, kept verbatim, plus the AI crawlers above. */
const NEXT_DEFAULT_HTML_BOTS =
  '[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight';

/** @type {import('next').NextConfig} */
const nextConfig = {
  htmlLimitedBots: `${NEXT_DEFAULT_HTML_BOTS}|${AI_CRAWLER_UA_PATTERN}`,
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
};

module.exports = nextConfig;
