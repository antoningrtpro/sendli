import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { FormTemplate, FormField } from "@/types/feedback";

// ── GET /api/feedback?proposalId=xxx&visitorId=yyy ─────────────────────────────
// Returns the active feedback form for a proposal, if any,
// and whether this visitor has already responded.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get("proposalId");
  const visitorId = searchParams.get("visitorId");

  if (!proposalId || !visitorId) {
    return NextResponse.json({ form: null });
  }

  // Fetch proposal to get activeFeedbackFormId
  const propSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!propSnap.exists) return NextResponse.json({ form: null });

  const activeFeedbackFormId = propSnap.data()?.activeFeedbackFormId as string | null | undefined;
  if (!activeFeedbackFormId) return NextResponse.json({ form: null });

  // Check if this visitor already has a response for this proposal
  const existingSnap = await adminDb
    .collection("feedbackResponses")
    .where("proposalId", "==", proposalId)
    .where("visitorId", "==", visitorId)
    .limit(1)
    .get();

  // If already answered (any status), do not show again
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0].data();
    if (existing.status === "answered") return NextResponse.json({ form: null });
    // If closed_without_answer → show again (re-prompt on next visit)
  }

  // Fetch the form template
  const formSnap = await adminDb.collection("feedbackForms").doc(activeFeedbackFormId).get();
  if (!formSnap.exists || formSnap.data()?.isArchived) return NextResponse.json({ form: null });

  const data = formSnap.data()!;
  const form: Omit<FormTemplate, "userId" | "createdAt" | "updatedAt"> & { fields: FormField[] } = {
    id: formSnap.id,
    name: data.name,
    tag: data.tag,
    title: data.title,
    subtitle: data.subtitle ?? undefined,
    fields: (data.fields ?? []) as FormField[],
    confirmationMessage: data.confirmationMessage ?? "Merci pour votre retour !",
    isArchived: data.isArchived ?? false,
  };

  // Determine if there's an existing "closed_without_answer" to update
  const existingResponseId = !existingSnap.empty ? existingSnap.docs[0].id : null;

  return NextResponse.json({ form, existingResponseId });
}

// ── POST /api/feedback — submit or close a response ───────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    proposalId: string;
    formTemplateId: string;
    visitorId: string;
    action: "submit" | "close";
    responses?: { fieldId: string; value: string | string[] | number }[];
    existingResponseId?: string | null;
  };

  const { proposalId, formTemplateId, visitorId, action, responses, existingResponseId } = body;

  if (!proposalId || !formTemplateId || !visitorId || !action) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Fetch proposal to get owner userId
  const propSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!propSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const proposalOwnerId = propSnap.data()?.userId as string;
  const proposalTitle = propSnap.data()?.title as string ?? "Propale";

  if (action === "close") {
    // Upsert a closed_without_answer response
    if (existingResponseId) {
      await adminDb.collection("feedbackResponses").doc(existingResponseId).update({
        status: "closed_without_answer",
        closedAt: new Date(),
      });
    } else {
      await adminDb.collection("feedbackResponses").doc().set({
        proposalId,
        formTemplateId,
        userId: proposalOwnerId,
        visitorId,
        status: "closed_without_answer",
        closedAt: new Date(),
        createdAt: new Date(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "submit") {
    // Mark as answered
    if (existingResponseId) {
      await adminDb.collection("feedbackResponses").doc(existingResponseId).update({
        status: "answered",
        responses: responses ?? [],
        submittedAt: new Date(),
      });
    } else {
      await adminDb.collection("feedbackResponses").doc().set({
        proposalId,
        formTemplateId,
        userId: proposalOwnerId,
        visitorId,
        status: "answered",
        responses: responses ?? [],
        submittedAt: new Date(),
        createdAt: new Date(),
      });
    }

    // ── Create notification for the sales ──────────────────────────────────
    await adminDb.collection("notifications").doc().set({
      userId: proposalOwnerId,
      type: "feedback_received",
      proposalId,
      proposalTitle,
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
