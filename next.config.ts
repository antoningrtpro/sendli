import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from any source for the public proposal pages
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
