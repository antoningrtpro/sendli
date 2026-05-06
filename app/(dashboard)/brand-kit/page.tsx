import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrandKitTabs } from "@/components/brand-kit-tabs";

const GOOGLE_FONTS = ["Inter","Poppins","Playfair Display","Roboto","Lato","Montserrat","Open Sans","Raleway","Nunito","DM Sans"];

export default async function BrandKitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [brandKit, banners] = await Promise.all([
    prisma.brandKit.findUnique({ where: { userId: session.user.id } }),
    prisma.banner.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

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
