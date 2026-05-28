import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const NOTIF_TTL_DAYS = 30;
const BATCH_SIZE = 500;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NOTIF_TTL_DAYS);

  // Fetch all notifications older than 30 days
  const snap = await adminDb.collection("notifications")
    .where("createdAt", "<", cutoff)
    .limit(2000)
    .get();

  if (snap.empty) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete in batches of 500 (Firestore limit)
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const slice = snap.docs.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    slice.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += slice.length;
  }

  return NextResponse.json({ deleted });
}
