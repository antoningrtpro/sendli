import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
import type { ProposalBlock, BrandKitData, BannerData } from "@/types/proposal";
import { ProposalPublicPage } from "@/components/proposal/public-page";
import { isPremium } from "@/lib/plan";
import type { ProposalComment } from "@/components/proposal/block-comments";

interface Props { params: Promise<{ id: string }> }

export default async function ProposalPreviewPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== session.user.id) notFound();

  const proposal = { id: snap.id, ...snap.data()! } as { id: string; [k: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const brandKitSnap = await adminDb.collection("brandKits").doc(session.user.id).get();
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

  const userSnap = await adminDb.collection("users").doc(session.user.id).get();
  const userData = userSnap.exists ? userSnap.data()! : null;
  const ownerIsPremium = isPremium((userData?.plan as string) ?? "free");
  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks as string);

  // Fetch comments for owner preview
  let initialComments: ProposalComment[] = [];
  if (ownerIsPremium) {
    try {
      const commentsSnap = await adminDb.collection("proposalComments")
        .where("proposalId", "==", proposal.id)
        .get();
      initialComments = commentsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          proposalId: data.proposalId as string,
          blockId: data.blockId as string,
          xPct: data.xPct as number,
          yPct: data.yPct as number,
          authorName: data.authorName as string,
          authorEmail: (data.authorEmail as string | null) ?? null,
          content: data.content as string,
          resolved: (data.resolved as boolean) ?? false,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
          replies: ((data.replies as unknown[]) ?? []).map((r: unknown) => {
            const reply = r as { id: string; content: string; authorName: string; isOwner: boolean; createdAt: string };
            return { id: reply.id, content: reply.content, authorName: reply.authorName, isOwner: reply.isOwner ?? false, createdAt: reply.createdAt };
          }),
        };
      });
    } catch { /* non-critical */ }
  }

  return (
    <>
      {/* Preview banner */}
      <div className="fixed top-0 inset-x-0 z-[999] flex items-center justify-between px-4 py-2 text-xs font-medium text-white"
        style={{ backgroundColor: "#111184" }}>
        <span>👁 Mode prévisualisation — les stats ne sont pas enregistrées</span>
        <a href={`/proposals/${id}/edit`} className="underline opacity-80 hover:opacity-100">← Retour à l&apos;éditeur</a>
      </div>
      <div className="pt-9">
        <ProposalPublicPage
          proposalId={proposal.id}
          slug={proposal.slug as string}
          title={proposal.title as string}
          blocks={blocks}
          brandKit={brandKit}
          banner={banner}
          clientLogoUrl={proposal.clientLogoUrl as string | null | undefined}
          authorEmail={userData?.email as string | undefined}
          authorPhone={userData?.phone as string | undefined}
          authorName={userData?.name as string | undefined}
          showPdfButton={(proposal.showPdfButton as boolean) ?? true}
          downloadUrl={(proposal.downloadUrl as string | null) ?? null}
          downloadButtonLabel={(proposal.downloadButtonLabel as string | null) ?? null}
          preview={true}
          commentsEnabled={ownerIsPremium}
          initialComments={initialComments}
        />
      </div>
    </>
  );
}
