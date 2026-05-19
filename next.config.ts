import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    // Cache remote images for 7 days (default is 60s)
    minimumCacheTTL: 604800,
    // Serve modern formats automatically
    formats: ["image/avif", "image/webp"],
  },

  // Exclude native addons from server-side bundle
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "firebase-admin"],

  experimental: {
    serverActions: {
      bodySizeLimit: "25mb", // 15 MB file + ~33 % base64 overhead
    },
  },

  // Security + caching headers
  async headers() {
    return [
      {
        // Security headers on all routes
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Long-lived cache for immutable static assets (_next/static)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Service worker must never be cached
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Cache-Control",       value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Favicon and static images — 7 days
        source: "/:file(favicon\\.png|favicon\\.ico|logo\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
