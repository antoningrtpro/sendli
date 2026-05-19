"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Eye, Share2 } from "lucide-react";
import { SharePanel } from "@/components/proposal/share-panel";

interface Props {
  proposalId: string;
  slug: string;
  published: boolean;
  isPremium: boolean;
}

export function AnalyticsActions({ proposalId, slug, published, isPremium }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePos, setSharePos] = useState<{ top: number; left: number } | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const handleShare = useCallback(() => {
    if (shareOpen) { setShareOpen(false); return; }
    const rect = shareButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const PANEL_H = 480;
    const top = window.innerHeight - rect.bottom < PANEL_H
      ? rect.top - PANEL_H - 4
      : rect.bottom + 4;
    setSharePos({ top, left: rect.right - 380 });
    setShareOpen(true);
  }, [shareOpen]);

  return (
    <div className="flex items-center gap-2">
      {published && (
        <Link
          href={`/proposals/${proposalId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <Eye className="w-3.5 h-3.5" />
          Aperçu
        </Link>
      )}
      <button
        ref={shareButtonRef}
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{ backgroundColor: "var(--primary)", color: "#fff" }}
      >
        <Share2 className="w-3.5 h-3.5" />
        Partager
      </button>

      {shareOpen && sharePos && (
        <SharePanel
          proposalId={proposalId}
          slug={slug}
          pos={sharePos}
          onClose={() => setShareOpen(false)}
          isPremium={isPremium}
        />
      )}
    </div>
  );
}
