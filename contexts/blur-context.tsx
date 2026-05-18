"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface BlurContextValue {
  blurProposals: boolean;
  toggleBlur: () => void;
}

const BlurContext = createContext<BlurContextValue>({
  blurProposals: false,
  toggleBlur: () => {},
});

export function BlurProvider({ children }: { children: React.ReactNode }) {
  const [blurProposals, setBlurProposals] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem("blur-proposals") === "true") {
        setBlurProposals(true);
      }
    } catch { /* ignore */ }
  }, []);

  function toggleBlur() {
    setBlurProposals(prev => {
      const next = !prev;
      try { localStorage.setItem("blur-proposals", String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <BlurContext.Provider value={{ blurProposals, toggleBlur }}>
      {children}
    </BlurContext.Provider>
  );
}

export function useBlur() {
  return useContext(BlurContext);
}
