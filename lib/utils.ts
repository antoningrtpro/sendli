import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Hash IP + user agent for anonymous visitor fingerprinting */
export function hashVisitor(ip: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 16);
}

/** Format numbers with K/M suffix */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

