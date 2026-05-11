"use client";

import { useState } from "react";
import { OnboardingModal } from "./onboarding-modal";

export function OnboardingGate({
  onboardingCompleted,
  children,
}: {
  onboardingCompleted: boolean;
  children: React.ReactNode;
}) {
  const [completed, setCompleted] = useState(onboardingCompleted);
  return (
    <>
      {children}
      {!completed && <OnboardingModal onComplete={() => setCompleted(true)} />}
    </>
  );
}
