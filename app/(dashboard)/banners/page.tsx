import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { BannersManager, type Banner } from "@/components/banners/banners-manager";

export default async function BannersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bannersSnap = await adminDb.collection("banners")
    .where("userId", "==", session.user.id)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  raw.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  const banners: Banner[] = raw.map(b => ({
    id:         b.id,
    userId:     b.userId     as string | undefined,
    name:       b.name       as string,
    bgColor:    b.bgColor    as string,
    bgImageUrl: (b.bgImageUrl as string | null | undefined) ?? null,
    title:      b.title      as string,
    subtitle:   b.subtitle   as string,
    textColor:  b.textColor  as string,
    logoUrl:    (b.logoUrl   as string | null | undefined) ?? null,
    imageOnly:  b.imageOnly  as boolean,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create reusable banners to display at the top of your proposals.
        </p>
      </div>
      <BannersManager initialBanners={banners} />
    </div>
  );
}
