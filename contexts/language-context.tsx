"use client";

import { createContext, useContext, useState, useTransition, useCallback } from "react";
import { createTranslator, type Lang, type TranslationKey } from "@/lib/i18n";
import { updateLanguage } from "@/app/actions/settings";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => {},
  t: createTranslator("fr"),
  isPending: false,
});

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [isPending, startTransition] = useTransition();
  const t = useCallback(createTranslator(lang), [lang]); // eslint-disable-line

  function setLang(next: Lang) {
    setLangState(next);
    startTransition(async () => {
      await updateLanguage(next);
    });
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
