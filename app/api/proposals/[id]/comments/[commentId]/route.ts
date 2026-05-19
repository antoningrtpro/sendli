import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSession } from "@/lib/session";
import { randomUUID } from "crypto";

// DELETE /api/proposals/[id]/comments/[commentId] — delete a comment (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: proposalId, commentId } = await params;

  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify proposal ownership
  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists || proposalSnap.data()!.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify comment belongs to this proposal
  const commentRef = adminDb.collection("proposalComments").doc(commentId);
  const commentSnap = await commentRef.get();
  if (!commentSnap.exists || commentSnap.data()!.proposalId !== proposalId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await commentRef.delete();
  return NextResponse.json({ ok: true });
}

// PATCH /api/proposals/[id]/comments/[commentId]
// - resolve: { resolved: boolean } — owner only
// - reply:   { content, authorName } — public
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: proposalId, commentId } = await params;

  const body = await req.json() as {
    content?: string;
    authorName?: string;
    resolved?: boolean;
  };

  const commentRef = adminDb.collection("proposalComments").doc(commentId);
  const commentSnap = await commentRef.get();
  if (!commentSnap.exists || commentSnap.data()!.proposalId !== proposalId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // ── Resolve action ─────────────────────────────────────────────────────────
  if (body.resolved !== undefined) {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
    if (!proposalSnap.exists || proposalSnap.data()!.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await commentRef.update({ resolved: body.resolved });
    return NextResponse.json({ ok: true });
  }

  // ── Reply action ───────────────────────────────────────────────────────────
  const { content, authorName } = body;
  if (!content?.trim() || !authorName?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (content.trim().length > 4000) {
    return NextResponse.json({ error: "content too long" }, { status: 400 });
  }
  if (authorName.trim().length > 128) {
    return NextResponse.json({ error: "authorName too long" }, { status: 400 });
  }

  // Check if this is the owner replying
  const session = await getSession();
  let isOwner = false;
  if (session?.user?.id) {
    const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
    if (proposalSnap.exists && proposalSnap.data()!.userId === session.user.id) {
      isOwner = true;
    }
  }

  const reply = {
    id: randomUUID(),
    content: content.trim(),
    authorName: authorName.trim(),
    isOwner,
    createdAt: new Date().toISOString(),
  };

  await commentRef.update({
    replies: FieldValue.arrayUnion(reply),
  });

  return NextResponse.json({ reply });
}
