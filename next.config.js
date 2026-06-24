const { execSync } = require("node:child_process");

function resolveCommit() {
  const envCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_COMMIT;
  if (envCommit) {
    return envCommit.slice(0, 8);
  }

  try {
    return execSync("git rev-parse --short=8 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}

/** @type {import('next').NextConfig} */
const commit = resolveCommit();

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_COMMIT: commit,
  },
  async headers() {
    return [
      {
        source: "/(dashboard/)?rydderen/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-App-Commit", value: commit },
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
