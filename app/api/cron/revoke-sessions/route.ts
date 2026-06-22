import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** Revokes all Firebase refresh tokens, invalidating every active session cookie immediately. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let revoked = 0;
  let pageToken: string | undefined;
  do {
    const result = await adminAuth.listUsers(1000, pageToken);
    await Promise.all(result.users.map(u => adminAuth.revokeRefreshTokens(u.uid)));
    revoked += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);

  return NextResponse.json({ revoked });
}
