import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LibraryManager } from "@/components/library/library-manager";
import { BookOpen } from "lucide-react";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [testimonials, caseStudies] = await Promise.all([
    prisma.testimonial.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.caseStudy.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

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
          quote: t.quote,
          author: t.author,
          role: t.role,
          company: t.company,
          avatarUrl: t.avatarUrl,
        }))}
        initialCaseStudies={caseStudies.map(c => ({
          id: c.id,
          title: c.title,
          tags: (() => { try { return JSON.parse(c.tags); } catch { return []; } })(),
          description: c.description,
          quote: c.quote,
          authorName: c.authorName,
          authorRole: c.authorRole,
          authorAvatarUrl: c.authorAvatarUrl,
          linkLabel: c.linkLabel,
          linkUrl: c.linkUrl,
          mediaUrl: c.mediaUrl,
          metrics: (() => { try { return JSON.parse(c.metrics); } catch { return []; } })(),
        }))}
      />
    </div>
  );
}
