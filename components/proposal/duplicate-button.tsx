"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateProposal } from "@/app/actions/proposals";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

export function DuplicateButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await duplicateProposal(proposalId);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("Proposal dupliquée !");
      router.push(`/proposals/${result.id}/edit`);
    });
  }

  return (
    <button onClick={handleDuplicate} disabled={isPending}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all duration-150">
      <Copy className="w-3 h-3" />
      {isPending ? "…" : "Dupliquer"}
    </button>
  );
}
