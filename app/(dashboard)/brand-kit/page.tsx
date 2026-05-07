import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { BrandKitTabs, type Banner } from "@/components/brand-kit-tabs";

const GOOGLE_FONTS = ["Inter","Poppins","Playfair Display","Roboto","Lato","Montserrat","Open Sans","Raleway","Nunito","DM Sans"];

export default async function BrandKitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [brandKitSnap, bannersSnap] = await Promise.all([
    adminDb.collection("brandKits").doc(session.user.id).get(),
    adminDb.collection("banners").where("userId", "==", session.user.id).get(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandKitRaw = brandKitSnap.exists ? brandKitSnap.data()! : null;
  const brandKit = brandKitRaw ? {
    id: brandKitSnap.id,
    primaryColor:   brandKitRaw.primaryColor   as string,
    secondaryColor: brandKitRaw.secondaryColor as string,
    fontFamily:     brandKitRaw.fontFamily     as string,
    bgColor:        brandKitRaw.bgColor        as string,
    textColor:      brandKitRaw.textColor      as string,
    logoUrl:        (brandKitRaw.logoUrl       as string | null | undefined) ?? null,
  } : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bannersRaw = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  bannersRaw.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  // Strip Firestore Timestamps before passing to Client Component
  const banners: Banner[] = bannersRaw.map(b => ({
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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Brand Kit</h1>
        <p className="text-sm text-gray-400 mt-1">Personnalisez l&apos;apparence de vos proposals.</p>
      </div>
      <BrandKitTabs brandKit={brandKit} fonts={GOOGLE_FONTS} banners={banners} />
    </div>
  );
}
