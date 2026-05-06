import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProposalEditor } from "@/components/editor/proposal-editor";
import type { ProposalBlock, BannerData } from "@/types/proposal";

interface Props { params: Promise<{ id: string }> }

export default async function EditProposalPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [proposal, brandKit, banners, testimonials, caseStudies, savedBlocksRaw] = await Promise.all([
    prisma.proposal.findFirst({ where: { id, userId: session.user.id }, include: { banner: true } }),
    prisma.brandKit.findUnique({ where: { userId: session.user.id } }),
    prisma.banner.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    prisma.testimonial.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    prisma.caseStudy.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    prisma.savedBlock.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!proposal) notFound();

  // Fetch tracking links with view counts
  const linksRaw = await prisma.proposalLink.findMany({
    where: { proposalId: proposal.id },
    orderBy: { createdAt: "desc" },
  });

  const linkIds = linksRaw.map((l: { id: string }) => l.id);
  const [viewGroups, lastSeenGroups] = await Promise.all([
    linkIds.length > 0
      ? prisma.proposalEvent.groupBy({
          by: ["linkId", "visitorHash"],
          where: { linkId: { in: linkIds }, eventType: "page_view" },
          _count: { id: true },
        })
      : Promise.resolve([]),
    linkIds.length > 0
      ? prisma.proposalEvent.groupBy({
          by: ["linkId"],
          where: { linkId: { in: linkIds } },
          _max: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const viewMap: Record<string, { views: number; unique: number }> = {};
  for (const g of viewGroups as { linkId: string | null; visitorHash: string | null; _count: { id: number } }[]) {
    if (!g.linkId) continue;
    if (!viewMap[g.linkId]) viewMap[g.linkId] = { views: 0, unique: 0 };
    viewMap[g.linkId].views += g._count.id;
    viewMap[g.linkId].unique += 1;
  }
  const lastSeenMap: Record<string, Date | null> = {};
  for (const g of lastSeenGroups as { linkId: string | null; _max: { createdAt: Date | null } }[]) {
    if (g.linkId) lastSeenMap[g.linkId] = g._max.createdAt;
  }

  const initialLinks = linksRaw.map((l: { id: string; token: string; recipientEmail: string | null; recipientName: string | null; createdAt: Date }) => ({
    id: l.id,
    token: l.token,
    recipientEmail: l.recipientEmail,
    recipientName: l.recipientName,
    createdAt: l.createdAt,
    views: viewMap[l.id]?.views ?? 0,
    uniqueVisitors: viewMap[l.id]?.unique ?? 0,
    lastSeenAt: lastSeenMap[l.id] ?? null,
  }));

  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks);

  const initialBanner: BannerData | null = proposal.banner
    ? { id: proposal.banner.id, name: proposal.banner.name, bgColor: proposal.banner.bgColor, bgImageUrl: proposal.banner.bgImageUrl, title: proposal.banner.title, subtitle: proposal.banner.subtitle, textColor: proposal.banner.textColor, logoUrl: proposal.banner.logoUrl, imageOnly: proposal.banner.imageOnly }
    : null;

  return (
    <ProposalEditor
      proposalId={proposal.id}
      initialTitle={proposal.title}
      initialBlocks={blocks}
      initialPublished={proposal.published}
      slug={proposal.slug}
      brandKit={brandKit ? { logoUrl: brandKit.logoUrl, primaryColor: brandKit.primaryColor, secondaryColor: brandKit.secondaryColor, fontFamily: brandKit.fontFamily, bgColor: brandKit.bgColor, textColor: brandKit.textColor } : null}
      initialBanner={initialBanner}
      initialStatus={(proposal.status as "pending" | "won" | "lost") ?? "pending"}
      initialAmountOneShot={proposal.amountOneShot ?? null}
      initialAmountMrr={proposal.amountMrr ?? null}
      initialClientLogoUrl={proposal.clientLogoUrl ?? null}
      initialHasPassword={!!proposal.password}
      initialShowPdfButton={proposal.showPdfButton ?? true}
      userBanners={banners}
      libraryTestimonials={testimonials.map(t => ({
        id: t.id, quote: t.quote, author: t.author,
        role: t.role, company: t.company, avatarUrl: t.avatarUrl,
      }))}
      libraryCaseStudies={caseStudies.map(c => ({
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
      librarySavedBlocks={savedBlocksRaw.map(s => ({
        id: s.id, name: s.name, blockType: s.blockType,
        data: s.data, mode: s.mode as "ultra" | "template",
      }))}
      initialLinks={initialLinks}
    />
  );
}
