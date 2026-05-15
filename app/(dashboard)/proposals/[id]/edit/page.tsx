import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { ProposalEditor } from "@/components/editor/proposal-editor";
import { isPremium } from "@/lib/plan";
import type { ProposalBlock, BannerData } from "@/types/proposal";
import type { Banner } from "@/components/banners/banners-manager";
import type { IntegrationKey } from "@/app/actions/integrations";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const snap = await adminDb.collection("proposals").doc(id).get();
  const title = snap.exists ? (snap.data()?.title as string | undefined) ?? "Éditeur" : "Éditeur";
  return { title };
}

export default async function EditProposalPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Compute the app URL from the actual request host so generated links
  // always use the correct domain (e.g. app.sendli.fr) regardless of env vars.
  const headersList = await headers();
  const host = headersList.get("host") ?? "app.sendli.fr";
  const appUrl = host.includes("localhost") ? `http://${host}` : `https://${host}`;

  const userId = session.user.id;

  const [
    proposalSnap,
    brandKitSnap,
    bannersSnap,
    testimonialsSnap,
    caseStudiesSnap,
    savedBlocksSnap,
    userSnap,
    integrationsSnap,
  ] = await Promise.all([
    adminDb.collection("proposals").doc(id).get(),
    adminDb.collection("brandKits").doc(userId).get(),
    adminDb.collection("banners").where("userId", "==", userId).get(),
    adminDb.collection("testimonials").where("userId", "==", userId).get(),
    adminDb.collection("caseStudies").where("userId", "==", userId).get(),
    adminDb.collection("savedBlocks").where("userId", "==", userId).get(),
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("integrations").doc(userId).get(),
  ]);

  const userIsPremium = isPremium((userSnap.data()?.plan as string) ?? "free");

  if (!proposalSnap.exists || proposalSnap.data()?.userId !== userId) notFound();

  // Helper: convert a Firestore Timestamp or Date to an ISO string (or null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function tsToString(v: any): string | null {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposal = { id: proposalSnap.id, ...proposalSnap.data()! } as { id: string; [k: string]: any };
  const brandKitData = brandKitSnap.exists ? brandKitSnap.data()! : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bannersRaw = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  bannersRaw.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  // Strip Timestamps — only pass serializable fields to the Client Component
  const banners: Banner[] = bannersRaw.map(b => ({
    id: b.id,
    userId: b.userId as string | undefined,
    name: b.name as string,
    bgColor: b.bgColor as string,
    bgImageUrl: (b.bgImageUrl as string | null | undefined) ?? null,
    title: b.title as string,
    subtitle: b.subtitle as string,
    textColor: b.textColor as string,
    logoUrl: (b.logoUrl as string | null | undefined) ?? null,
    imageOnly: b.imageOnly as boolean,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testimonials = testimonialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  testimonials.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caseStudies = caseStudiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  caseStudies.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedBlocksRaw = savedBlocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  savedBlocksRaw.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });

  // Fetch the banner if bannerId is set
  let bannerData: Record<string, unknown> | null = null;
  if (proposal.bannerId) {
    const bannerSnap = await adminDb.collection("banners").doc(proposal.bannerId as string).get();
    if (bannerSnap.exists) bannerData = { id: bannerSnap.id, ...bannerSnap.data()! };
  }

  // Fetch tracking links
  const linksSnap = await adminDb.collection("proposalLinks")
    .where("proposalId", "==", id)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linksRaw = linksSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  linksRaw.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  const linkIds = linksRaw.map(l => l.id);

  // Aggregate link stats in memory
  const viewMap: Record<string, { views: number; unique: number }> = {};
  const lastSeenMap: Record<string, Date | null> = {};

  if (linkIds.length > 0) {
    // Single pass — merge views, unique visitors, lastSeen in one loop
    const eventsSnap = await adminDb.collection("proposalEvents")
      .where("proposalId", "==", id)
      .where("eventType", "==", "page_view")
      .get();

    const uniqueByLink: Record<string, Set<string>> = {};
    for (const doc of eventsSnap.docs) {
      const d = doc.data();
      if (!d.linkId || !linkIds.includes(d.linkId)) continue;
      if (!viewMap[d.linkId]) viewMap[d.linkId] = { views: 0, unique: 0 };
      viewMap[d.linkId].views += 1;

      if (d.visitorHash) {
        if (!uniqueByLink[d.linkId]) uniqueByLink[d.linkId] = new Set();
        uniqueByLink[d.linkId].add(d.visitorHash);
      }

      const createdAt = d.createdAt?.toDate?.() ?? new Date(d.createdAt);
      if (!lastSeenMap[d.linkId] || createdAt > lastSeenMap[d.linkId]!) {
        lastSeenMap[d.linkId] = createdAt;
      }
    }
    for (const lid of linkIds) {
      if (!viewMap[lid]) viewMap[lid] = { views: 0, unique: 0 };
      viewMap[lid].unique = uniqueByLink[lid]?.size ?? 0;
    }
  }

  const initialLinks = linksRaw.map(l => ({
    id: l.id,
    token: l.token as string,
    recipientEmail: (l.recipientEmail as string | null) ?? null,
    recipientName: (l.recipientName as string | null) ?? null,
    createdAt: tsToString(l.createdAt) ?? new Date().toISOString(),
    views: viewMap[l.id]?.views ?? 0,
    uniqueVisitors: viewMap[l.id]?.unique ?? 0,
    lastSeenAt: lastSeenMap[l.id] ? lastSeenMap[l.id]!.toISOString() : null,
  }));

  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks as string);

  // Parse integrations
  const intData = integrationsSnap.exists ? (integrationsSnap.data() ?? {}) : {};
  const integrations: Partial<Record<IntegrationKey, { embedCode: string }>> = {};
  for (const k of ["google_calendar", "hubspot"] as IntegrationKey[]) {
    if (intData[k]?.embedCode) integrations[k] = { embedCode: intData[k].embedCode };
  }

  const initialBanner: BannerData | null = bannerData
    ? {
        id: bannerData.id as string,
        name: bannerData.name as string,
        bgColor: bannerData.bgColor as string,
        bgImageUrl: bannerData.bgImageUrl as string | null,
        title: bannerData.title as string,
        subtitle: bannerData.subtitle as string,
        textColor: bannerData.textColor as string,
        logoUrl: bannerData.logoUrl as string | null,
        imageOnly: bannerData.imageOnly as boolean,
      }
    : null;

  return (
    <ProposalEditor
      proposalId={proposal.id}
      isPremium={userIsPremium}
      ownerName={(userSnap.data()?.name as string | null) ?? undefined}
      initialTitle={proposal.title as string}
      initialBlocks={blocks}
      initialPublished={proposal.published as boolean}
      slug={proposal.slug as string}
      brandKit={brandKitData ? {
        logoUrl: brandKitData.logoUrl as string | null | undefined,
        primaryColor: brandKitData.primaryColor as string,
        secondaryColor: brandKitData.secondaryColor as string,
        fontFamily: brandKitData.fontFamily as string,
        bgColor: brandKitData.bgColor as string,
        textColor: brandKitData.textColor as string,
      } : null}
      initialBanner={initialBanner}
      initialStatus={(proposal.status as "pending" | "won" | "lost") ?? "pending"}
      initialAmountOneShot={(proposal.amountOneShot as number | null) ?? null}
      initialAmountMrr={(proposal.amountMrr as number | null) ?? null}
      initialClientLogoUrl={(proposal.clientLogoUrl as string | null) ?? null}
      initialHasPassword={!!(proposal.password)}
      initialShowPdfButton={(proposal.showPdfButton as boolean) ?? true}
      userBanners={banners}
      libraryTestimonials={testimonials.map(t => ({
        id: t.id,
        quote: t.quote as string,
        author: t.author as string,
        role: t.role as string,
        company: t.company as string,
        avatarUrl: t.avatarUrl as string | null | undefined,
      }))}
      libraryCaseStudies={caseStudies.map(c => ({
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
      librarySavedBlocks={savedBlocksRaw.map(s => ({
        id: s.id,
        name: s.name as string,
        blockType: s.blockType as string,
        data: s.data as string,
        mode: s.mode as "ultra" | "template",
      }))}
      initialLinks={initialLinks}
      appUrl={appUrl}
      initialDownloadUrl={(proposal.downloadUrl as string | null) ?? null}
      initialDownloadButtonLabel={(proposal.downloadButtonLabel as string | null) ?? null}
      integrations={integrations}
    />
  );
}
