import { createHmac } from "crypto";

/**
 * Signs a proposal access token using AUTH_SECRET.
 * Includes the last 8 chars of the bcrypt hash so changing the password
 * automatically invalidates existing cookies.
 */
export function signAccessToken(proposalId: string, pwdHash: string): string {
  const secret = process.env.AUTH_SECRET ?? "sendli-fallback";
  return createHmac("sha256", secret)
    .update(`${proposalId}:${pwdHash.slice(-8)}`)
    .digest("hex");
}

/** Verify a cookie token against the current password hash. */
export function verifyAccessToken(proposalId: string, pwdHash: string, token: string): boolean {
  return token === signAccessToken(proposalId, pwdHash);
}
