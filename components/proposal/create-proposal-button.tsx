"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProposal } from "@/app/actions/proposals";
import { Plus, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { FREE_LIMITS } from "@/lib/plan";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  proposalCount?: number;
  isPremium?: boolean;
  showCounter?: boolean;
}

export function CreateProposalButton({ proposalCount = 0, isPremium = false, showCounter = true }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useLanguage();

  const atLimit = !isPremium && proposalCount >= FREE_LIMITS.proposals;

  function handleCreate() {
    if (atLimit) {
      toast.error(t("proposals_free_limit", { n: FREE_LIMITS.proposals }));
      return;
    }
    startTransition(async () => {
      const result = await createProposal();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.push(`/proposals/${result.id}/edit`);
    });
  }

  return (
    <div className="flex items-center gap-3">
      {/* Free plan usage indicator — only shown when explicitly requested */}
      {showCounter && !isPremium && (
        <span className="text-xs text-gray-400">
          {t("proposals_free_counter", { count: proposalCount, max: FREE_LIMITS.proposals })}
        </span>
      )}

      <button
        onClick={handleCreate}
        disabled={isPending || atLimit}
        title={atLimit ? t("proposals_limit_reached") : undefined}
        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-60 hover:opacity-90"
        style={{
          backgroundColor: atLimit ? "#9ca3af" : "var(--primary)",
          boxShadow: atLimit ? "none" : "0 4px 14px rgba(17,17,132,0.25)",
          cursor: atLimit ? "not-allowed" : undefined,
        }}
      >
        {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {isPending ? t("proposals_creating") : atLimit ? t("proposals_limit_reached") : t("proposals_new")}
      </button>
    </div>
  );
}
