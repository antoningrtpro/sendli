import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ProposalBlock, BrandKitData, BannerData } from "@/types/proposal";
import { ProposalPublicPage } from "@/components/proposal/public-page";
import { PasswordGate } from "@/components/proposal/password-gate";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lid?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { slug, published: true }, select: { title: true } });
  return { title: proposal?.title ?? "Proposal" };
}

export default async function PublicProposalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lid } = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: { slug, published: true },
    include: {
      user: { include: { brandKit: true } },
      banner: true,
    },
  });

  if (!proposal) notFound();

  const brandKit: BrandKitData = proposal.user.brandKit
    ? { logoUrl: proposal.user.brandKit.logoUrl, primaryColor: proposal.user.brandKit.primaryColor, secondaryColor: proposal.user.brandKit.secondaryColor, fontFamily: proposal.user.brandKit.fontFamily, bgColor: proposal.user.brandKit.bgColor, textColor: proposal.user.brandKit.textColor }
    : { primaryColor: "#111184", secondaryColor: "#1a1ab8", fontFamily: "Inter", bgColor: "#ffffff", textColor: "#1f2937" };

  // ── Password gate ──────────────────────────────────────────────────────────
  if (proposal.password) {
    const jar = await cookies();
    const cookie = jar.get(`p_access_${proposal.id}`)?.value;
    const granted = cookie ? await bcrypt.compare(cookie, proposal.password).catch(() => false)
      // cookie stores the hash itself — exact match is also valid
      || cookie === proposal.password
      : false;

    if (!granted) {
      return (
        <PasswordGate
          proposalId={proposal.id}
          proposalTitle={proposal.title}
          logoUrl={brandKit.logoUrl}
          clientLogoUrl={proposal.clientLogoUrl}
          primaryColor={brandKit.primaryColor}
        />
      );
    }
  }

  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks);

  const banner: BannerData | null = proposal.banner
    ? { id: proposal.banner.id, name: proposal.banner.name, bgColor: proposal.banner.bgColor, bgImageUrl: proposal.banner.bgImageUrl, title: proposal.banner.title, subtitle: proposal.banner.subtitle, textColor: proposal.banner.textColor, logoUrl: proposal.banner.logoUrl, imageOnly: proposal.banner.imageOnly }
    : null;

  // Resolve tracking link (if ?lid= token provided)
  let linkId: string | undefined;
  if (lid) {
    const link = await prisma.proposalLink.findFirst({
      where: { token: lid, proposalId: proposal.id },
      select: { id: true },
    });
    if (link) linkId = link.id;
  }

  return (
    <ProposalPublicPage
      proposalId={proposal.id}
      slug={slug}
      title={proposal.title}
      blocks={blocks}
      brandKit={brandKit}
      banner={banner}
      clientLogoUrl={proposal.clientLogoUrl}
      linkId={linkId}
      authorEmail={proposal.user.email}
      authorPhone={proposal.user.phone ?? undefined}
      authorName={proposal.user.name ?? undefined}
      showPdfButton={proposal.showPdfButton ?? true}
    />
  );
}
