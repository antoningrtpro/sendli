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
    adminDb.collection("banners").where("userId", "==", session.user.id).orderBy("createdAt", "desc").get(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandKit = brandKitSnap.exists ? ({ id: brandKitSnap.id, ...brandKitSnap.data() } as any) : null;
  const banners = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));

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
