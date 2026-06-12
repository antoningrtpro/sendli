import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { FeedbackFormBuilder } from "@/components/feedback/feedback-form-builder";
import type { FormTemplate } from "@/types/feedback";

interface Props { params: Promise<{ id: string }> }

export default async function EditFeedbackFormPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const snap = await adminDb.collection("feedbackForms").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== session.user.id) notFound();

  const data = snap.data()!;
  const template: FormTemplate = {
    id: snap.id,
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
  };

  return (
    <div className="p-6 md:p-8">
      <FeedbackFormBuilder initial={template} />
    </div>
  );
}
