/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin',  value: process.env.NEXT_PUBLIC_APP_URL || '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type,X-Sync-Secret' },
        { key: 'X-Content-Type-Options',       value: 'nosniff' },
        { key: 'X-Frame-Options',              value: 'DENY' },
      ],
    }]
  },
}
module.exports = nextConfig
