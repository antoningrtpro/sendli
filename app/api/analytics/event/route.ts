import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendPushToUser } from "@/app/actions/fcm";
import { buildPushPayload } from "@/lib/fcm-payload";
import { hashVisitor } from "@/lib/utils";

const TIME_ON_PAGE_THRESHOLD = 120; // seconds — notify if visitor spent > 2 min

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, eventType, blockId, blockLabel, durationSeconds, linkId } = body;

    if (!proposalId || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate event type
    const validTypes = ["page_view", "time_on_page", "block_visible", "block_click", "cta_click"];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Ensure proposal exists and is published
    const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
    if (!proposalSnap.exists || !proposalSnap.data()?.published) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const proposalData = proposalSnap.data()!;
    const proposalOwnerId = proposalData.userId as string;
    const proposalTitle = (proposalData.title as string) || "Sans titre";

    // Validate linkId if provided (must belong to this proposal)
    let resolvedLinkId: string | null = null;
    let visitorName: string | null = null;
    let visitorEmail: string | null = null;
    if (linkId) {
      const linkSnap = await adminDb.collection("proposalLinks").doc(linkId).get();
      if (linkSnap.exists && linkSnap.data()?.proposalId === proposalId) {
        resolvedLinkId = linkId;
        visitorName = (linkSnap.data()?.recipientName as string) || null;
        visitorEmail = (linkSnap.data()?.recipientEmail as string) || null;
      }
    }

    // Build visitor fingerprint from IP + user agent
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const visitorHash = hashVisitor(ip, ua);

    // Save the analytics event
    await adminDb.collection("proposalEvents").doc().set({
      proposalId,
      linkId: resolvedLinkId,
      eventType,
      blockId: blockId || null,
      blockLabel: blockLabel || null,
      visitorHash,
      durationSeconds: durationSeconds ?? null,
      createdAt: new Date(),
    });

    // ── Create notification if owner has this pref enabled ─────────────────────
    const notifType = resolveNotifType(eventType, durationSeconds);
    if (notifType) {
      const userSnap = await adminDb.collection("users").doc(proposalOwnerId).get();
      const prefs = userSnap.data()?.notificationPrefs as Record<string, boolean> | undefined;
      const defaultOn = notifType === "page_view" || notifType === "cta_click";
      const enabled = prefs ? (prefs[notifType] ?? defaultOn) : defaultOn;

      if (enabled) {
        const notifRef = adminDb.collection("notifications").doc();
        await notifRef.set({
          userId: proposalOwnerId,
          type: notifType,
          proposalId,
          proposalTitle,
          visitorName,
          visitorEmail,
          blockLabel: blockLabel || null,
          durationSeconds: durationSeconds ?? null,
          read: false,
          createdAt: new Date(),
        });

        // Fire-and-forget push notification
        sendPushToUser(
          proposalOwnerId,
          buildPushPayload(
            { type: notifType, proposalTitle, visitorName, visitorEmail, blockLabel, durationSeconds },
            notifRef.id,
          ),
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function resolveNotifType(
  eventType: string,
  durationSeconds?: number | null,
): "page_view" | "cta_click" | "time_on_page" | null {
  if (eventType === "page_view") return "page_view";
  // cta_click covers explicit interactions: CTA, signature, pdf download, embed download
  if (eventType === "cta_click") return "cta_click";
  if (eventType === "time_on_page" && durationSeconds && durationSeconds >= TIME_ON_PAGE_THRESHOLD) return "time_on_page";
  return null;
}
