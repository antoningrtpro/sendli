import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { BannersManager, type Banner } from "@/components/banners/banners-manager";

export default async function BannersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bannersSnap = await adminDb.collection("banners")
    .where("userId", "==", session.user.id)
    .orderBy("createdAt", "desc")
    .get();

  const banners = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));

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
