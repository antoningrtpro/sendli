import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendPushToUser } from "@/app/actions/fcm";
import { buildPushPayload } from "@/lib/fcm-payload";
import { FieldValue } from "firebase-admin/firestore";
import { isPremium } from "@/lib/plan";

// Serialize Firestore data to plain JSON (timestamps → ISO strings)
function serializeComment(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    proposalId: data.proposalId as string,
    blockId: data.blockId as string,
    xPct: data.xPct as number,
    yPct: data.yPct as number,
    authorName: data.authorName as string,
    authorEmail: (data.authorEmail as string | null) ?? null,
    content: data.content as string,
    resolved: (data.resolved as boolean) ?? false,
    blockLabel: (data.blockLabel as string | null) ?? null,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString?.() ??
      (typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString()),
    replies: ((data.replies as unknown[]) ?? []).map((r: unknown) => {
      const reply = r as {
        id: string;
        content: string;
        authorName: string;
        isOwner: boolean;
        createdAt: string;
      };
      return {
        id: reply.id,
        content: reply.content,
        authorName: reply.authorName,
        isOwner: reply.isOwner ?? false,
        createdAt: reply.createdAt,
      };
    }),
  };
}

// GET /api/proposals/[id]/comments
// Accessible to: proposal owner (any session) OR visitors (proposal must be published)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const proposalData = proposalSnap.data()!;

  // Only published proposals expose their comments publicly
  if (!proposalData.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snap = await adminDb
    .collection("proposalComments")
    .where("proposalId", "==", proposalId)
    .get();

  const comments = snap.docs.map((d) => serializeComment(d.id, d.data()));
  return NextResponse.json(comments);
}

// POST /api/proposals/[id]/comments — public (visitor), create new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  // Proposal must exist and be published to accept new comments
  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  const proposalData = proposalSnap.data()!;
  if (!proposalData.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ownerId = proposalData.userId as string;

  const userSnap = await adminDb.collection("users").doc(ownerId).get();
  const ownerIsPremium = isPremium((userSnap.data()?.plan as string) ?? "free");
  if (!ownerIsPremium) {
    return NextResponse.json({ error: "Comments are a premium feature" }, { status: 403 });
  }

  const body = await req.json() as {
    blockId: string;
    xPct: number;
    yPct: number;
    authorName: string;
    authorEmail?: string | null;
    content: string;
    blockLabel?: string | null;
  };

  const { blockId, xPct, yPct, authorName, authorEmail, content, blockLabel } = body;

  if (!blockId || xPct == null || yPct == null || !authorName?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Length limits to prevent abuse
  if (authorName.trim().length > 128) {
    return NextResponse.json({ error: "authorName too long" }, { status: 400 });
  }
  if (content.trim().length > 4000) {
    return NextResponse.json({ error: "content too long" }, { status: 400 });
  }
  if (authorEmail && authorEmail.length > 254) {
    return NextResponse.json({ error: "authorEmail too long" }, { status: 400 });
  }
  if (typeof xPct !== "number" || typeof yPct !== "number" || xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const now = FieldValue.serverTimestamp();

  const docRef = await adminDb.collection("proposalComments").add({
    proposalId,
    blockId,
    xPct,
    yPct,
    authorName: authorName.trim(),
    authorEmail: authorEmail?.trim() || null,
    content: content.trim(),
    resolved: false,
    blockLabel: blockLabel?.trim() || null,
    createdAt: now,
    replies: [],
  });

  // Create notification for the proposal owner
  try {
    const notifRef = adminDb.collection("notifications").doc();
    const proposalTitle = (proposalData.title as string) ?? "";
    const visitorName = authorName.trim();
    const visitorEmail = authorEmail?.trim() || null;
    await notifRef.set({
      userId: ownerId,
      type: "comment",
      proposalId,
      proposalTitle,
      visitorName,
      visitorEmail,
      commentContent: content.trim(),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    sendPushToUser(
      ownerId,
      buildPushPayload({ type: "comment", proposalTitle, visitorName, visitorEmail }, notifRef.id),
    ).catch(() => {});
  } catch {
    // Non-critical: notification failure shouldn't break comment creation
  }

  const createdSnap = await docRef.get();
  return NextResponse.json(serializeComment(docRef.id, createdSnap.data()!), { status: 201 });
}
