/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  images: {
    domains: process.env.NODE_ENV === 'production'
      ? ['images.unsplash.com', 'avatars.githubusercontent.com']
      : ['localhost', 'images.unsplash.com', 'avatars.githubusercontent.com', 'vercel.com'],
    formats: ['image/webp', 'image/avif'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ];
  },
  async headers() {
    // 在生产环境下，强制要求明确的ORIGINS配置
    let corsOrigin = 'http://localhost:3000';
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.NEXT_PUBLIC_ALLOWED_ORIGINS && !process.env.NEXTAUTH_URL) {
        throw new Error('生产环境必须设置 NEXT_PUBLIC_ALLOWED_ORIGINS 或 NEXTAUTH_URL');
      }
      corsOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || process.env.NEXTAUTH_URL || '';
    }

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: corsOrigin,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; " +
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://openrouter.ai; " +
              "font-src 'self' https://fonts.googleapis.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
