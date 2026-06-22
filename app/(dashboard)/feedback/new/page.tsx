import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { isPremium } from "@/lib/plan";
import { FeedbackFormBuilder } from "@/components/feedback/feedback-form-builder";

export default async function NewFeedbackFormPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userSnap = await adminDb.collection("users").doc(session.user.id).get();
  if (!isPremium((userSnap.data()?.plan as string) ?? "free")) redirect("/proposals");

  return (
    <div className="p-6 md:p-8">
      <FeedbackFormBuilder />
    </div>
  );
}
