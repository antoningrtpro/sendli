export type Plan = "free" | "premium";

export const FREE_LIMITS = {
  proposals: 5,
  blocks: 4,
} as const;

/** Returns true for premium and legacy "pro" plans */
export function isPremium(plan: string | null | undefined): boolean {
  return plan === "premium" || plan === "pro";
}
