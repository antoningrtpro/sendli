import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/proposals") ||
    pathname.startsWith("/brand-kit") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/banners");

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const sessionCookie = req.cookies.get("__session")?.value;
  const isLoggedIn = !!sessionCookie;

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|p/).*)" ],
};
