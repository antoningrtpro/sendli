import { adminDb } from "@/lib/firebase-admin";
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
  const snap = await adminDb.collection("proposals")
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();
  return { title: snap.empty ? "Proposal" : (snap.docs[0].data().title as string) ?? "Proposal" };
}

export default async function PublicProposalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lid } = await searchParams;

  const snap = await adminDb.collection("proposals")
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();

  if (snap.empty) notFound();

  const proposalDoc = snap.docs[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposal = { id: proposalDoc.id, ...proposalDoc.data() } as { id: string; [k: string]: any };

  // Fetch user + brand kit
  const userSnap = await adminDb.collection("users").doc(proposal.userId as string).get();
  const brandKitSnap = await adminDb.collection("brandKits").doc(proposal.userId as string).get();

  const brandKit: BrandKitData = brandKitSnap.exists
    ? {
        logoUrl: brandKitSnap.data()!.logoUrl as string | null | undefined,
        primaryColor: brandKitSnap.data()!.primaryColor as string,
        secondaryColor: brandKitSnap.data()!.secondaryColor as string,
        fontFamily: brandKitSnap.data()!.fontFamily as string,
        bgColor: brandKitSnap.data()!.bgColor as string,
        textColor: brandKitSnap.data()!.textColor as string,
      }
    : { primaryColor: "#111184", secondaryColor: "#1a1ab8", fontFamily: "Inter", bgColor: "#ffffff", textColor: "#1f2937" };

  // ── Password gate ──────────────────────────────────────────────────────────
  if (proposal.password) {
    const jar = await cookies();
    const cookie = jar.get(`p_access_${proposal.id}`)?.value;
    const granted = cookie
      ? await bcrypt.compare(cookie, proposal.password as string).catch(() => false)
        || cookie === proposal.password
      : false;

    if (!granted) {
      return (
        <PasswordGate
          proposalId={proposal.id}
          proposalTitle={proposal.title as string}
          logoUrl={brandKit.logoUrl}
          clientLogoUrl={proposal.clientLogoUrl as string | null | undefined}
          primaryColor={brandKit.primaryColor}
        />
      );
    }
  }

  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks as string);

  // Fetch banner if set
  let banner: BannerData | null = null;
  if (proposal.bannerId) {
    const bannerSnap = await adminDb.collection("banners").doc(proposal.bannerId as string).get();
    if (bannerSnap.exists) {
      const b = bannerSnap.data()!;
      banner = {
        id: bannerSnap.id,
        name: b.name as string,
        bgColor: b.bgColor as string,
        bgImageUrl: b.bgImageUrl as string | null,
        title: b.title as string,
        subtitle: b.subtitle as string,
        textColor: b.textColor as string,
        logoUrl: b.logoUrl as string | null,
        imageOnly: b.imageOnly as boolean,
      };
    }
  }

  // Resolve tracking link (if ?lid= token provided)
  let linkId: string | undefined;
  if (lid) {
    const linkSnap = await adminDb.collection("proposalLinks")
      .where("token", "==", lid)
      .where("proposalId", "==", proposal.id)
      .limit(1)
      .get();
    if (!linkSnap.empty) linkId = linkSnap.docs[0].id;
  }

  const userData = userSnap.exists ? userSnap.data()! : null;

  return (
    <ProposalPublicPage
      proposalId={proposal.id}
      slug={slug}
      title={proposal.title as string}
      blocks={blocks}
      brandKit={brandKit}
      banner={banner}
      clientLogoUrl={proposal.clientLogoUrl as string | null | undefined}
      linkId={linkId}
      authorEmail={userData?.email as string | undefined}
      authorPhone={userData?.phone as string | undefined}
      authorName={userData?.name as string | undefined}
      showPdfButton={(proposal.showPdfButton as boolean) ?? true}
      downloadUrl={(proposal.downloadUrl as string | null) ?? null}
    />
  );
}
