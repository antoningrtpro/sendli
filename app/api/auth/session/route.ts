import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("__session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
