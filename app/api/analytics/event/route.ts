import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { hashVisitor } from "@/lib/utils";

const TIME_ON_PAGE_THRESHOLD = 120; // seconds — notify if visitor spent > 2 min

// ── In-memory rate limiter (per IP, resets per serverless instance) ───────────
// Limits abuse without requiring Redis. Each IP is allowed MAX_EVENTS per window.
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_EVENTS     = 30;     // generous enough for real users
const rateLimitMap   = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now  = Date.now();
  const slot = rateLimitMap.get(ip);
  if (!slot || now > slot.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  slot.count++;
  return slot.count > MAX_EVENTS;
}

export async function POST(req: NextRequest) {
  // Reject oversized bodies (analytics events should never exceed 4 KB)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 4096) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { proposalId, eventType, blockId, blockLabel, durationSeconds, linkId } = body;

    if (!proposalId || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate string lengths to prevent abuse
    if (typeof proposalId !== "string" || proposalId.length > 128) {
      return NextResponse.json({ error: "Invalid proposalId" }, { status: 400 });
    }
    if (blockId !== undefined && (typeof blockId !== "string" || blockId.length > 128)) {
      return NextResponse.json({ error: "Invalid blockId" }, { status: 400 });
    }
    if (blockLabel !== undefined && (typeof blockLabel !== "string" || blockLabel.length > 256)) {
      return NextResponse.json({ error: "Invalid blockLabel" }, { status: 400 });
    }
    if (linkId !== undefined && linkId !== null && (typeof linkId !== "string" || linkId.length > 128)) {
      return NextResponse.json({ error: "Invalid linkId" }, { status: 400 });
    }
    if (durationSeconds !== undefined && durationSeconds !== null && (typeof durationSeconds !== "number" || durationSeconds < 0 || durationSeconds > 86400)) {
      return NextResponse.json({ error: "Invalid durationSeconds" }, { status: 400 });
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
    const proposalOwnerId = proposalData.userId as string | undefined;
    if (!proposalOwnerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
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

    // Build visitor fingerprint from IP + user agent (already used for rate limit above)
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
        // Deduplication: skip if a same-type notif already exists for this
        // proposal in the last 30 minutes to avoid notification spam.
        const dedupeWindow = Date.now() - 30 * 60 * 1000;
        const existingSnap = await adminDb
          .collection("notifications")
          .where("userId", "==", proposalOwnerId)
          .where("proposalId", "==", proposalId)
          .where("type", "==", notifType)
          .limit(5)
          .get();
        // Filter client-side to avoid composite index on createdAt
        const recentExists = existingSnap.docs.some((d) => {
          const ts: Date = d.data().createdAt?.toDate?.() ?? new Date(d.data().createdAt);
          return ts.getTime() >= dedupeWindow;
        });

        if (!recentExists) {
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
        }
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
