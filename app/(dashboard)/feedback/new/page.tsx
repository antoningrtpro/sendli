import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeedbackFormBuilder } from "@/components/feedback/feedback-form-builder";

export default async function NewFeedbackFormPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="p-6 md:p-8">
      <FeedbackFormBuilder />
    </div>
  );
}
