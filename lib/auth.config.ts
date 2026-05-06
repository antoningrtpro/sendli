// Lightweight auth config for use in proxy.ts (Edge Runtime — no Prisma, no Node.js modules)
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // Providers are added in the full lib/auth.ts (not edge-compatible)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isDashboard =
        path.startsWith("/dashboard") ||
        path.startsWith("/proposals") ||
        path.startsWith("/brand-kit") ||
        path.startsWith("/settings");

      const isAuthPage = path === "/login" || path === "/register";

      if (isDashboard && !isLoggedIn) return false; // Redirect to signIn
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
  },
};
