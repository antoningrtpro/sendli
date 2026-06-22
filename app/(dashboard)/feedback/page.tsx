import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { isPremium } from "@/lib/plan";
import { FeedbackDashboard } from "@/components/feedback/feedback-dashboard";
import type { FormTemplate } from "@/types/feedback";
import type { FeedbackSummary } from "@/app/actions/feedback";

async function getTemplates(userId: string): Promise<FormTemplate[]> {
  const snap = await adminDb
    .collection("feedbackForms")
    .where("userId", "==", userId)
    .limit(200)
    .get();
  return snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        name: data.name,
        tag: data.tag,
        title: data.title,
        subtitle: data.subtitle ?? undefined,
        fields: data.fields ?? [],
        confirmationMessage: data.confirmationMessage ?? "Merci pour votre retour !",
        isArchived: data.isArchived ?? false,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      } as FormTemplate;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

async function getSummary(userId: string): Promise<FeedbackSummary> {
  const respSnap = await adminDb
    .collection("feedbackResponses")
    .where("userId", "==", userId)
    .limit(1000)
    .get();

  const responses = respSnap.docs.map(d => d.data());
  const answered = responses.filter(r => r.status === "answered");
  const closed = responses.filter(r => r.status === "closed_without_answer");

  // Proposal status lookup
  const proposalIds = [...new Set(responses.map(r => r.proposalId as string))];
  const proposalMap = new Map<string, { title: string; status: string }>();
  for (let i = 0; i < proposalIds.length; i += 10) {
    const batch = proposalIds.slice(i, i + 10);
    const snap = await adminDb.collection("proposals").where("__name__", "in", batch).get();
    snap.docs.forEach(d => proposalMap.set(d.id, { title: d.data().title ?? "—", status: d.data().status ?? "pending" }));
  }

  // Template name lookup
  const templateIds = [...new Set(responses.map(r => r.formTemplateId as string))];
  const templateNameMap = new Map<string, string>();
  for (let i = 0; i < templateIds.length; i += 10) {
    const batch = templateIds.slice(i, i + 10);
    const snap = await adminDb.collection("feedbackForms").where("__name__", "in", batch).get();
    snap.docs.forEach(d => templateNameMap.set(d.id, d.data().name ?? "—"));
  }

  const wonAnswered = answered.filter(r => proposalMap.get(r.proposalId)?.status === "won").length;
  const lostAnswered = answered.filter(r => proposalMap.get(r.proposalId)?.status === "lost").length;
  const wonClosed = closed.filter(r => proposalMap.get(r.proposalId)?.status === "won").length;
  const lostClosed = closed.filter(r => proposalMap.get(r.proposalId)?.status === "lost").length;

  const recentResponses = responses
    .slice()
    .sort((a, b) => {
      const ta = a.submittedAt?.toDate?.() ?? a.closedAt?.toDate?.() ?? new Date(0);
      const tb = b.submittedAt?.toDate?.() ?? b.closedAt?.toDate?.() ?? new Date(0);
      return tb.getTime() - ta.getTime();
    })
    .slice(0, 50)
    .map(r => ({
      id: r.id ?? "",
      proposalId: r.proposalId,
      formTemplateId: r.formTemplateId,
      userId,
      status: r.status,
      responses: r.responses,
      submittedAt: r.submittedAt?.toDate?.(),
      closedAt: r.closedAt?.toDate?.(),
      visitorId: r.visitorId,
      proposalTitle: proposalMap.get(r.proposalId)?.title ?? "—",
      proposalStatus: proposalMap.get(r.proposalId)?.status ?? "pending",
      templateName: templateNameMap.get(r.formTemplateId) ?? "—",
    }));

  return {
    totalSent: responses.length,
    totalAnswered: answered.length,
    totalClosed: closed.length,
    wonAnswered,
    wonClosed,
    lostAnswered,
    lostClosed,
    recentResponses,
  };
}

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userSnap = await adminDb.collection("users").doc(session.user.id).get();
  if (!isPremium((userSnap.data()?.plan as string) ?? "free")) redirect("/proposals");

  const [templates, summary] = await Promise.all([
    getTemplates(session.user.id),
    getSummary(session.user.id),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <FeedbackDashboard summary={summary} templates={templates} />
    </div>
  );
}
