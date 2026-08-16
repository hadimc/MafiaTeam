"use client";

import { createContext, useContext } from "react";
import { t, type Msg } from "./i18n";

type Ctx = {
  lang: "en";
  t: (key: Msg) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  return (
    <LangContext.Provider value={{ lang: "en", t: (key) => t(key, "en") }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export function enName(person: { displayName: string; displayNameEn?: string | null }) {
  return person.displayNameEn?.trim() || person.displayName;
}
