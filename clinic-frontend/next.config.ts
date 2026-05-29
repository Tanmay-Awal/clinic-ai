import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  // Note: The middleware deprecation warning is a false positive in Next.js 16
  // middleware.ts is still the correct and standard way to handle route protection
  // This warning can be safely ignored

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow Cloudflare Insights and other analytics scripts
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com", // 'unsafe-eval' needed for Next.js, 'unsafe-inline' for some libraries
              "style-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for styled-components and similar
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // Allow media from blob URLs, CloudFront, ElevenLabs, localhost API (dev), and HTTPS sources
              process.env.NODE_ENV === 'development'
                ? "media-src 'self' blob: https://*.cloudfront.net https://api.elevenlabs.io http://localhost:* https:"
                : "media-src 'self' blob: https://*.cloudfront.net https://api.elevenlabs.io https:",
              // Allow connections to same origin, HTTPS, and localhost for development
              // In production, you should use HTTPS only
              process.env.NODE_ENV === 'development'
                ? "connect-src 'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* blob:"
                : "connect-src 'self' https: blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
