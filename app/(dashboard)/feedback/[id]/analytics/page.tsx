import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getFeedbackFormAnalytics } from "@/app/actions/feedback";
import { FeedbackFormAnalytics } from "@/components/feedback/feedback-form-analytics";

interface Props { params: Promise<{ id: string }> }

export default async function FeedbackFormAnalyticsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const data = await getFeedbackFormAnalytics(id);
  if (!data) notFound();

  return <FeedbackFormAnalytics data={data} />;
}
