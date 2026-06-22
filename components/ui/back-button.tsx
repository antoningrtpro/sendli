"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
}

export function BackButton({ label = "Retour", fallbackHref }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (fallbackHref && window.history.length <= 1) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
