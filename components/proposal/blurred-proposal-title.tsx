"use client";

import { useBlur } from "@/contexts/blur-context";

const BLUR_STYLE = { filter: "blur(6px)", userSelect: "none" as const, pointerEvents: "none" as const };

export function BlurredProposalTitle({
  title,
  className,
  style,
}: {
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { blurProposals } = useBlur();
  return (
    <span
      className={className}
      style={blurProposals ? { ...style, ...BLUR_STYLE } : style}
    >
      {title}
    </span>
  );
}
