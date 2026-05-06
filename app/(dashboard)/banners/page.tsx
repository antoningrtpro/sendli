import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BannersManager } from "@/components/banners/banners-manager";

export default async function BannersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const banners = await prisma.banner.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

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
