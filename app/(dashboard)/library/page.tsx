import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { LibraryManager } from "@/components/library/library-manager";
import { BookOpen } from "lucide-react";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [testimonialsSnap, caseStudiesSnap] = await Promise.all([
    adminDb.collection("testimonials").where("userId", "==", userId).orderBy("createdAt", "desc").get(),
    adminDb.collection("caseStudies").where("userId", "==", userId).orderBy("createdAt", "desc").get(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testimonials = testimonialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caseStudies = caseStudiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 12px rgba(17,17,132,0.22)" }}>
            <BookOpen className="w-4.5 h-4.5 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Content Library</h1>
        </div>
        <p className="text-sm text-gray-400 ml-13">
          Save testimonials and use cases once, reuse them across all your proposals.
        </p>
      </div>

      <LibraryManager
        initialTestimonials={testimonials.map(t => ({
          id: t.id,
          quote: t.quote as string,
          author: t.author as string,
          role: t.role as string,
          company: t.company as string,
          avatarUrl: t.avatarUrl as string | null | undefined,
        }))}
        initialCaseStudies={caseStudies.map(c => ({
          id: c.id,
          title: c.title as string,
          tags: Array.isArray(c.tags) ? c.tags as string[] : [],
          description: c.description as string,
          quote: c.quote as string | null | undefined,
          authorName: c.authorName as string | null | undefined,
          authorRole: c.authorRole as string | null | undefined,
          authorAvatarUrl: c.authorAvatarUrl as string | null | undefined,
          linkLabel: c.linkLabel as string | null | undefined,
          linkUrl: c.linkUrl as string | null | undefined,
          mediaUrl: c.mediaUrl as string | null | undefined,
          metrics: Array.isArray(c.metrics) ? c.metrics as { id: string; value: string; label: string }[] : [],
        }))}
      />
    </div>
  );
}
