"use client";

import { useState } from "react";
import { Plus, Lock } from "lucide-react";
import { FREE_LIMITS } from "@/lib/plan";
import { useLanguage } from "@/contexts/language-context";
import { ProposalOnboardingModal } from "@/components/proposals/proposal-onboarding-modal";
import toast from "react-hot-toast";

interface Props {
  proposalCount?: number;
  isPremium?: boolean;
  showCounter?: boolean;
}

export function CreateProposalButton({ proposalCount = 0, isPremium = false, showCounter = true }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const atLimit = !isPremium && proposalCount >= FREE_LIMITS.proposals;

  function handleClick() {
    if (atLimit) {
      toast.error(t("proposals_free_limit", { n: FREE_LIMITS.proposals }));
      return;
    }
    setOpen(true);
  }

  return (
    <div className="flex items-center gap-3">
      {showCounter && !isPremium && (
        <span className="text-xs text-gray-400">
          {t("proposals_free_counter", { count: proposalCount, max: FREE_LIMITS.proposals })}
        </span>
      )}

      <button
        onClick={handleClick}
        disabled={atLimit}
        title={atLimit ? t("proposals_limit_reached") : undefined}
        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-60 hover:opacity-90"
        style={{
          backgroundColor: atLimit ? "#9ca3af" : "var(--primary)",
          boxShadow: atLimit ? "none" : "0 4px 14px rgba(17,17,132,0.25)",
          cursor: atLimit ? "not-allowed" : undefined,
        }}
      >
        {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {atLimit ? t("proposals_limit_reached") : t("proposals_new")}
      </button>

      {open && (
        <ProposalOnboardingModal
          mode="create"
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
