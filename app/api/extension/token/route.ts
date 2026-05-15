import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("users").doc(session.user.id).get();
  const token = (snap.data()?.extensionToken as string | null) ?? null;

  return NextResponse.json({ token });
}

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = randomBytes(16).toString("hex");
  await adminDb.collection("users").doc(session.user.id).update({ extensionToken: token });

  return NextResponse.json({ token });
}
