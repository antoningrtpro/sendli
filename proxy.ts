// Next.js 16 proxy (replaces middleware) — runs in Edge Runtime
// Uses lightweight auth config (no Prisma/Node.js modules)
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Export the auth handler as "proxy" (Next.js 16 naming convention)
export { auth as proxy };

export const config = {
  matcher: [
    // Protect all routes except public ones and Next.js internals
    "/((?!api|_next/static|_next/image|favicon.ico|p/).*)",
  ],
};
