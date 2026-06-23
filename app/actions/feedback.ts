"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { FormTemplate, FormField, FormResponse, FieldValue } from "@/types/feedback";

// ── Auth helper ────────────────────────────────────────────────────────────────
async function requireAuth(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ── Form Templates ─────────────────────────────────────────────────────────────

function docToTemplate(id: string, data: FirebaseFirestore.DocumentData): FormTemplate {
  return {
    id,
    userId: data.userId,
    name: data.name,
    tag: data.tag,
    title: data.title,
    subtitle: data.subtitle ?? undefined,
    fields: (data.fields ?? []) as FormField[],
    confirmationMessage: data.confirmationMessage ?? "Merci pour votre retour !",
    isArchived: data.isArchived ?? false,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function getFormTemplates(): Promise<FormTemplate[]> {
  const userId = await requireAuth();
  const snap = await adminDb
    .collection("feedbackForms")
    .where("userId", "==", userId)
    .limit(200)
    .get();
  return snap.docs
    .map(d => docToTemplate(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getFormTemplate(id: string): Promise<FormTemplate | null> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("feedbackForms").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) return null;
  return docToTemplate(snap.id, snap.data()!);
}

export async function createFormTemplate(data: {
  name: string;
  tag: "won" | "lost";
  title: string;
  subtitle?: string;
  fields?: FormField[];
  confirmationMessage?: string;
}): Promise<{ id: string }> {
  const userId = await requireAuth();
  const ref = adminDb.collection("feedbackForms").doc();
  await ref.set({
    userId,
    name: data.name,
    tag: data.tag,
    title: data.title,
    subtitle: data.subtitle ?? null,
    fields: data.fields ?? [],
    confirmationMessage: data.confirmationMessage ?? "Merci pour votre retour !",
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath("/feedback");
  return { id: ref.id };
}

export async function updateFormTemplate(id: string, data: {
  name?: string;
  tag?: "won" | "lost";
  title?: string;
  subtitle?: string | null;
  fields?: FormField[];
  confirmationMessage?: string;
  isArchived?: boolean;
}): Promise<void> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("feedbackForms").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) update.name = data.name;
  if (data.tag !== undefined) update.tag = data.tag;
  if (data.title !== undefined) update.title = data.title;
  if (data.subtitle !== undefined) update.subtitle = data.subtitle;
  if (data.fields !== undefined) update.fields = data.fields;
  if (data.confirmationMessage !== undefined) update.confirmationMessage = data.confirmationMessage;
  if (data.isArchived !== undefined) update.isArchived = data.isArchived;
  await adminDb.collection("feedbackForms").doc(id).update(update);
  revalidatePath("/feedback");
}

export async function duplicateFormTemplate(id: string): Promise<{ id: string }> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("feedbackForms").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  const data = snap.data()!;
  const ref = adminDb.collection("feedbackForms").doc();
  await ref.set({
    ...data,
    name: data.name + " (copie)",
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath("/feedback");
  return { id: ref.id };
}

export async function deleteFormTemplate(id: string): Promise<void> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("feedbackForms").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("feedbackForms").doc(id).delete();
  revalidatePath("/feedback");
}

// ── Activate / deactivate form on a proposal ──────────────────────────────────

export async function activateFeedbackForm(
  proposalId: string,
  formTemplateId: string,
): Promise<void> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("proposals").doc(proposalId).update({
    activeFeedbackFormId: formTemplateId,
    feedbackFormTriggeredAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath(`/proposals/${proposalId}/feedback`);
  revalidatePath("/proposals");
}

export async function deactivateFeedbackForm(proposalId: string): Promise<void> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("proposals").doc(proposalId).update({
    activeFeedbackFormId: null,
    feedbackFormTriggeredAt: null,
    updatedAt: new Date(),
  });
  revalidatePath(`/proposals/${proposalId}/feedback`);
  revalidatePath("/proposals");
}

// ── Form Responses (read by sales) ────────────────────────────────────────────

function docToResponse(id: string, data: FirebaseFirestore.DocumentData): FormResponse {
  return {
    id,
    proposalId: data.proposalId,
    formTemplateId: data.formTemplateId,
    userId: data.userId,
    status: data.status,
    responses: data.responses ?? undefined,
    submittedAt: data.submittedAt?.toDate?.() ?? undefined,
    closedAt: data.closedAt?.toDate?.() ?? undefined,
    visitorId: data.visitorId,
  };
}

export async function getProposalFeedbackResponse(
  proposalId: string,
): Promise<{ response: FormResponse | null; template: FormTemplate | null; activeFeedbackFormId: string | null }> {
  const userId = await requireAuth();
  const propSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!propSnap.exists || propSnap.data()?.userId !== userId) throw new Error("Not found");
  const activeFeedbackFormId = (propSnap.data()?.activeFeedbackFormId as string | null) ?? null;

  // Get the latest response for this proposal (any form version)
  const respSnap = await adminDb
    .collection("feedbackResponses")
    .where("proposalId", "==", proposalId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  const response = respSnap.empty ? null : docToResponse(respSnap.docs[0].id, respSnap.docs[0].data());

  // Load the template (either from active form or from response)
  const templateId = response?.formTemplateId ?? activeFeedbackFormId;
  let template: FormTemplate | null = null;
  if (templateId) {
    const tSnap = await adminDb.collection("feedbackForms").doc(templateId).get();
    if (tSnap.exists) template = docToTemplate(tSnap.id, tSnap.data()!);
  }

  return { response, template, activeFeedbackFormId };
}

// ── Feedback Dashboard ─────────────────────────────────────────────────────────

export interface FeedbackSummary {
  totalSent: number;
  totalAnswered: number;
  totalClosed: number;
  wonAnswered: number;
  wonClosed: number;
  lostAnswered: number;
  lostClosed: number;
  recentResponses: (FormResponse & {
    proposalTitle: string;
    proposalStatus: string;
    templateName: string;
  })[];
}

export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  const userId = await requireAuth();

  // All responses for this user
  const respSnap = await adminDb
    .collection("feedbackResponses")
    .where("userId", "==", userId)
    .limit(1000)
    .get();

  const responses = respSnap.docs.map(d => docToResponse(d.id, d.data()));

  // Load all templates for name lookup
  const templateSnap = await adminDb
    .collection("feedbackForms")
    .where("userId", "==", userId)
    .limit(200)
    .get();
  const templateMap = new Map<string, FormTemplate>(
    templateSnap.docs.map(d => [d.id, docToTemplate(d.id, d.data())])
  );

  // Load proposals for title + status lookup (batch by proposalId)
  const proposalIds = [...new Set(responses.map(r => r.proposalId))];
  const proposalMap = new Map<string, { title: string; status: string }>();
  for (let i = 0; i < proposalIds.length; i += 10) {
    const batch = proposalIds.slice(i, i + 10);
    const snap = await adminDb
      .collection("proposals")
      .where("__name__", "in", batch)
      .get();
    snap.docs.forEach(d => {
      proposalMap.set(d.id, {
        title: (d.data().title as string) ?? "—",
        status: (d.data().status as string) ?? "pending",
      });
    });
  }

  const answered = responses.filter(r => r.status === "answered");
  const closed = responses.filter(r => r.status === "closed_without_answer");

  const recentResponses = responses
    .slice()
    .sort((a, b) => {
      const ta = a.submittedAt ?? a.closedAt ?? new Date(0);
      const tb = b.submittedAt ?? b.closedAt ?? new Date(0);
      return tb.getTime() - ta.getTime();
    })
    .slice(0, 50)
    .map(r => ({
      ...r,
      proposalTitle: proposalMap.get(r.proposalId)?.title ?? "—",
      proposalStatus: proposalMap.get(r.proposalId)?.status ?? "pending",
      templateName: templateMap.get(r.formTemplateId)?.name ?? "—",
    }));

  // won/lost split (via proposal status)
  const wonResponses = answered.filter(r => proposalMap.get(r.proposalId)?.status === "won");
  const lostResponses = answered.filter(r => proposalMap.get(r.proposalId)?.status === "lost");
  const wonClosed = closed.filter(r => proposalMap.get(r.proposalId)?.status === "won");
  const lostClosed = closed.filter(r => proposalMap.get(r.proposalId)?.status === "lost");

  return {
    totalSent: responses.length,
    totalAnswered: answered.length,
    totalClosed: closed.length,
    wonAnswered: wonResponses.length,
    wonClosed: wonClosed.length,
    lostAnswered: lostResponses.length,
    lostClosed: lostClosed.length,
    recentResponses,
  };
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export async function getFeedbackResponsesForExport(): Promise<{
  rows: {
    proposalTitle: string;
    proposalStatus: string;
    templateName: string;
    templateTag: string;
    status: string;
    submittedAt: string;
    responses: string;
  }[];
}> {
  const userId = await requireAuth();

  const respSnap = await adminDb
    .collection("feedbackResponses")
    .where("userId", "==", userId)
    .where("status", "==", "answered")
    .limit(5000)
    .get();

  const responses = respSnap.docs.map(d => docToResponse(d.id, d.data()));

  const templateSnap = await adminDb
    .collection("feedbackForms")
    .where("userId", "==", userId)
    .limit(200)
    .get();
  const templateMap = new Map<string, FormTemplate>(
    templateSnap.docs.map(d => [d.id, docToTemplate(d.id, d.data())])
  );

  const proposalIds = [...new Set(responses.map(r => r.proposalId))];
  const proposalMap = new Map<string, { title: string; status: string }>();
  for (let i = 0; i < proposalIds.length; i += 10) {
    const batch = proposalIds.slice(i, i + 10);
    const snap = await adminDb
      .collection("proposals")
      .where("__name__", "in", batch)
      .get();
    snap.docs.forEach(d => {
      proposalMap.set(d.id, {
        title: (d.data().title as string) ?? "—",
        status: (d.data().status as string) ?? "pending",
      });
    });
  }

  const rows = responses.map(r => {
    const template = templateMap.get(r.formTemplateId);
    const fieldMap = new Map<string, FormField>(
      (template?.fields ?? []).map(f => [f.id, f])
    );
    const responseSummary = (r.responses ?? [])
      .map(res => {
        const field = fieldMap.get(res.fieldId);
        const label = field?.label ?? res.fieldId;
        const val = Array.isArray(res.value) ? res.value.join(", ") : String(res.value);
        return `${label}: ${val}`;
      })
      .join(" | ");
    return {
      proposalTitle: proposalMap.get(r.proposalId)?.title ?? "—",
      proposalStatus: proposalMap.get(r.proposalId)?.status ?? "—",
      templateName: template?.name ?? "—",
      templateTag: template?.tag ?? "—",
      status: r.status,
      submittedAt: r.submittedAt?.toISOString().slice(0, 10) ?? "—",
      responses: responseSummary,
    };
  });

  return { rows };
}

// ── Per-form analytics ─────────────────────────────────────────────────────────

export type FieldAnalytics =
  | { type: "choice"; fieldId: string; label: string; options: { label: string; count: number }[]; total: number }
  | { type: "scale";  fieldId: string; label: string; values: number[]; avg: number; min: number; max: number; distribution: { value: number; count: number }[] }
  | { type: "text";   fieldId: string; label: string; values: string[] };

export interface FormAnalytics {
  template: FormTemplate;
  totalSent: number;
  totalAnswered: number;
  totalClosed: number;
  responseRate: number;
  fields: FieldAnalytics[];
  recentResponses: { proposalTitle: string; submittedAt: Date | undefined }[];
}

export async function getFeedbackFormAnalytics(formId: string): Promise<FormAnalytics | null> {
  const userId = await requireAuth();

  const [templateSnap, respSnap] = await Promise.all([
    adminDb.collection("feedbackForms").doc(formId).get(),
    adminDb.collection("feedbackResponses")
      .where("userId", "==", userId)
      .where("formTemplateId", "==", formId)
      .limit(2000)
      .get(),
  ]);

  if (!templateSnap.exists || templateSnap.data()?.userId !== userId) return null;
  const template = docToTemplate(templateSnap.id, templateSnap.data()!);
  const responses = respSnap.docs.map(d => docToResponse(d.id, d.data()));

  const answered = responses.filter(r => r.status === "answered");
  const closed   = responses.filter(r => r.status === "closed_without_answer");

  // Load proposal titles for recent responses
  const proposalIds = [...new Set(answered.map(r => r.proposalId))].slice(0, 30);
  const proposalMap = new Map<string, string>();
  if (proposalIds.length > 0) {
    for (let i = 0; i < proposalIds.length; i += 10) {
      const batch = proposalIds.slice(i, i + 10);
      const snap = await adminDb.collection("proposals").where("__name__", "in", batch).get();
      snap.docs.forEach(d => proposalMap.set(d.id, (d.data().title as string) ?? "—"));
    }
  }

  // Aggregate per field
  const fields: FieldAnalytics[] = template.fields
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(field => {
      const allValues = answered
        .flatMap(r => r.responses ?? [])
        .filter(rv => rv.fieldId === field.id)
        .map(rv => rv.value);

      if (field.type === "radio" || field.type === "checkbox") {
        const counts: Record<string, number> = {};
        for (const v of allValues) {
          const items = Array.isArray(v) ? v : [String(v)];
          for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
        }
        const options = (field.options ?? []).map(opt => ({ label: opt, count: counts[opt] ?? 0 }));
        // include any option found in responses but not in template
        for (const [opt, count] of Object.entries(counts)) {
          if (!options.find(o => o.label === opt)) options.push({ label: opt, count });
        }
        return { type: "choice" as const, fieldId: field.id, label: field.label, options, total: allValues.length };
      }

      if (field.type === "scale" || field.type === "nps") {
        const nums = allValues.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
        const distMap: Record<number, number> = {};
        for (const n of nums) distMap[n] = (distMap[n] ?? 0) + 1;
        const minVal = field.scaleMin ?? 0;
        const maxVal = field.scaleMax ?? (field.type === "nps" ? 10 : 5);
        const distribution = Array.from({ length: maxVal - minVal + 1 }, (_, i) => ({
          value: minVal + i,
          count: distMap[minVal + i] ?? 0,
        }));
        return { type: "scale" as const, fieldId: field.id, label: field.label, values: nums, avg, min: minVal, max: maxVal, distribution };
      }

      // text / textarea / email / phone
      const texts = allValues.map(v => String(v)).filter(Boolean);
      return { type: "text" as const, fieldId: field.id, label: field.label, values: texts };
    });

  const recentResponses = answered
    .slice()
    .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
    .slice(0, 20)
    .map(r => ({ proposalTitle: proposalMap.get(r.proposalId) ?? "—", submittedAt: r.submittedAt }));

  return {
    template,
    totalSent: responses.length,
    totalAnswered: answered.length,
    totalClosed: closed.length,
    responseRate: responses.length > 0 ? Math.round((answered.length / responses.length) * 100) : 0,
    fields,
    recentResponses,
  };
}
