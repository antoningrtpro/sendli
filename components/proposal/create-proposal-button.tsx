"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProposal } from "@/app/actions/proposals";
import { Plus } from "lucide-react";

export function CreateProposalButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    startTransition(async () => {
      const { id } = await createProposal();
      router.push(`/proposals/${id}/edit`);
    });
  }

  return (
    <button onClick={handleCreate} disabled={isPending}
      className="flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-60 hover:opacity-90"
      style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.25)" }}>
      <Plus className="w-4 h-4" />
      {isPending ? "Création…" : "Nouvelle Proposal"}
    </button>
  );
}
