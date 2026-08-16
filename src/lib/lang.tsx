"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "./i18n";
import { t, type Msg } from "./i18n";

type Ctx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: Msg) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("fa");

  useEffect(() => {
    const saved = window.localStorage.getItem("mafia-lang");
    if (saved === "en" || saved === "fa") setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mafia-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);

  const value: Ctx = {
    lang,
    setLang,
    toggle: () => setLang((current) => (current === "fa" ? "en" : "fa")),
    t: (key) => t(key, lang),
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
