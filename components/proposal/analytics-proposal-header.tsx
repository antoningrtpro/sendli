"use client";

import { useBlur } from "@/contexts/blur-context";
import { BlurredProposalTitle } from "@/components/proposal/blurred-proposal-title";

export function AnalyticsProposalHeader({
  title,
}: {
  title: string;
  clientLogoUrl?: string | null;
}) {
  const { blurProposals } = useBlur();
  void blurProposals;

  return (
    <div className="flex items-start gap-4 mb-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          <BlurredProposalTitle title={title} />
        </h1>
        <p className="text-sm text-gray-400 mt-1">Analytics</p>
      </div>
    </div>
  );
}
