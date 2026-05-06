"use client";
import { useState } from "react";
import { BrandKitForm } from "./brand-kit-form";
import { BannersManager } from "./banners/banners-manager";
interface BrandKit { id?: string; primaryColor: string; secondaryColor: string; fontFamily: string; bgColor: string; textColor: string; logoUrl?: string | null; }
export interface Banner { id: string; userId?: string; name: string; bgColor: string; bgImageUrl?: string | null; title: string; subtitle: string; textColor: string; logoUrl?: string | null; imageOnly: boolean; createdAt?: Date; updatedAt?: Date; }

interface Props {
  brandKit: BrandKit | null;
  fonts: string[];
  banners: Banner[];
}

export function BrandKitTabs({ brandKit, fonts, banners }: Props) {
  const [tab, setTab] = useState<"brandkit" | "banners">("brandkit");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {(["brandkit", "banners"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "brandkit" ? "Brand Kit" : "Banners"}
          </button>
        ))}
      </div>

      {tab === "brandkit" && <BrandKitForm brandKit={brandKit} fonts={fonts} />}
      {tab === "banners" && <BannersManager initialBanners={banners} />}
    </div>
  );
}
