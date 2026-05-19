import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendPushToUser } from "@/app/actions/fcm";
import { buildPushPayload } from "@/lib/fcm-payload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const now = new Date();

  // Find users whose trial ends in ~1 or ~3 days
  // We check a 25-hour window to account for cron timing drift
  const targets = [1, 3]; // days before end
  let notified = 0;

  for (const daysAhead of targets) {
    const windowStart = new Date(now.getTime() + (daysAhead - 0.5) * 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (daysAhead + 0.5) * 24 * 60 * 60 * 1000);

    const snap = await adminDb.collection("users")
      .where("plan", "==", "premium")
      .where("trialEndsAt", ">=", windowStart)
      .where("trialEndsAt", "<=", windowEnd)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.role === "admin") continue;

      const userId = doc.id;
      const trialEndsAt: Date = data.trialEndsAt.toDate();
      const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we already sent this reminder today (avoid double-send on cron retry)
      const alreadySent = await adminDb.collection("notifications")
        .where("userId", "==", userId)
        .where("type", "==", "trial_ending")
        .where("daysLeft", "==", daysLeft)
        .limit(1)
        .get();
      if (!alreadySent.empty) continue;

      const notifRef = adminDb.collection("notifications").doc();
      await notifRef.set({
        userId,
        type: "trial_ending",
        daysLeft,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      sendPushToUser(
        userId,
        buildPushPayload({ type: "trial_ending", daysLeft }),
      ).catch(() => {});

      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
