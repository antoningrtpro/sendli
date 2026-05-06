import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { hashVisitor } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, eventType, blockId, durationSeconds, linkId } = body;

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

    // Validate linkId if provided (must belong to this proposal)
    let resolvedLinkId: string | null = null;
    if (linkId) {
      const linkSnap = await adminDb.collection("proposalLinks").doc(linkId).get();
      if (linkSnap.exists && linkSnap.data()?.proposalId === proposalId) {
        resolvedLinkId = linkId;
      }
    }

    // Build visitor fingerprint from IP + user agent
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const visitorHash = hashVisitor(ip, ua);

    await adminDb.collection("proposalEvents").doc().set({
      proposalId,
      linkId: resolvedLinkId,
      eventType,
      blockId: blockId || null,
      visitorHash,
      durationSeconds: durationSeconds ?? null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
