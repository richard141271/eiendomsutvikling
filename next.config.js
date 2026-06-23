/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_COMMIT:
      (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_COMMIT || "local").slice(0, 7),
  },
  async headers() {
    return [
      {
        source: "/(dashboard/)?rydderen/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tnirkokakdwhorksxfrn.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'cheerio', 'undici'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
