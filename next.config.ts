import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile pictures
    ],
  },
  // Exclude native addons from server-side bundle
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "firebase-admin"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb", // 15 MB file + ~33 % base64 overhead
    },
  },
};

export default nextConfig;
