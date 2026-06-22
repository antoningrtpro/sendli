import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { ProposalFeedbackTab } from "@/components/feedback/proposal-feedback-tab";
import { BackButton } from "@/components/ui/back-button";
import Link from "next/link";
import type { FormTemplate, FormResponse } from "@/types/feedback";

interface Props { params: Promise<{ id: string }> }

export default async function ProposalFeedbackPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const propSnap = await adminDb.collection("proposals").doc(id).get();
  if (!propSnap.exists || propSnap.data()?.userId !== session.user.id) notFound();

  const propData = propSnap.data()!;
  const activeFeedbackFormId = (propData.activeFeedbackFormId as string | null) ?? null;
  const proposalStatus = (propData.status as string) ?? "pending";
  const proposalTitle = (propData.title as string) ?? "Propale";

  // Latest response for this proposal
  const respSnap = await adminDb
    .collection("feedbackResponses")
    .where("proposalId", "==", id)
    .where("userId", "==", session.user.id)
    .limit(1)
    .get();

  const response: FormResponse | null = respSnap.empty ? null : (() => {
    const d = respSnap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      proposalId: data.proposalId,
      formTemplateId: data.formTemplateId,
      userId: data.userId,
      status: data.status,
      responses: data.responses ?? undefined,
      submittedAt: data.submittedAt?.toDate?.() ?? undefined,
      closedAt: data.closedAt?.toDate?.() ?? undefined,
      visitorId: data.visitorId,
    };
  })();

  // Template
  const templateId = response?.formTemplateId ?? activeFeedbackFormId;
  let template: FormTemplate | null = null;
  if (templateId) {
    const tSnap = await adminDb.collection("feedbackForms").doc(templateId).get();
    if (tSnap.exists) {
      const td = tSnap.data()!;
      template = {
        id: tSnap.id,
        userId: td.userId,
        name: td.name,
        tag: td.tag,
        title: td.title,
        subtitle: td.subtitle ?? undefined,
        fields: td.fields ?? [],
        confirmationMessage: td.confirmationMessage ?? "Merci pour votre retour !",
        isArchived: td.isArchived ?? false,
        createdAt: td.createdAt?.toDate?.() ?? new Date(),
        updatedAt: td.updatedAt?.toDate?.() ?? new Date(),
      };
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Back + tabs */}
      <div className="flex items-center gap-3">
        <BackButton label="Retour" fallbackHref="/feedback" />
        <div className="ml-auto flex items-center gap-1 p-1 rounded-xl bg-gray-100">
          <Link
            href={`/proposals/${id}/analytics`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-white transition"
          >
            Analytics
          </Link>
          <Link
            href={`/proposals/${id}/feedback`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Feedback
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-extrabold text-gray-900">{proposalTitle}</h1>
        <p className="text-sm text-gray-400">Formulaire de feedback</p>
      </div>

      <ProposalFeedbackTab
        proposalId={id}
        proposalStatus={proposalStatus}
        response={response}
        template={template}
        activeFeedbackFormId={activeFeedbackFormId}
      />
    </div>
  );
}
