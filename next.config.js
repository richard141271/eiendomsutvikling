/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // experimental: {
  //   serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'sharp', 'puppeteer'],
  // },
};

module.exports = nextConfig;
