"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { t, type Lang, type Msg } from "@/lib/i18n";

const LANG_KEY = "mafia-lang";
const LANG_EVENT = "mafia-lang";

function subscribeLang(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_EVENT, onChange);
  };
}

function readLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_KEY) === "fa" ? "fa" : "en";
  } catch {
    return "en";
  }
}

function readServerLang(): Lang {
  return "en";
}

export function usePageLang() {
  const lang = useSyncExternalStore(subscribeLang, readLang, readServerLang);
  const fa = lang === "fa";
  return {
    lang,
    fa,
    tx: (key: Msg) => t(key, lang),
    switchLang(next: Lang) {
      window.localStorage.setItem(LANG_KEY, next);
      window.dispatchEvent(new Event(LANG_EVENT));
    },
  };
}

export function LangToggle({
  fa,
  onSwitch,
  englishLabel,
  farsiLabel,
}: {
  fa: boolean;
  onSwitch: (next: Lang) => void;
  englishLabel: string;
  farsiLabel: string;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-bg-elev p-1">
      <LangChip active={!fa} onClick={() => onSwitch("en")}>
        {englishLabel}
      </LangChip>
      <LangChip active={fa} onClick={() => onSwitch("fa")}>
        {farsiLabel}
      </LangChip>
    </div>
  );
}

export function LangChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-gold text-black" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function BiTitle({
  fa,
  en,
  lang,
  large = false,
}: {
  fa: string;
  en: string;
  lang: Lang;
  large?: boolean;
}) {
  const primary = lang === "fa" ? fa || en : en || fa;
  const secondary = lang === "fa" ? en : fa;
  const showSecondary = Boolean(secondary && secondary !== primary);
  return (
    <div className="min-w-0">
      {lang === "fa" ? (
        <p dir="rtl" lang="fa" className={`farsi font-semibold leading-tight ${large ? "text-xl" : "text-base"}`}>
          {primary}
        </p>
      ) : (
        <p className={`font-semibold leading-tight ${large ? "display text-xl" : "text-base"}`}>{primary}</p>
      )}
      {showSecondary ? (
        lang === "fa" ? (
          <p className="display mt-0.5 text-sm text-gold">{secondary}</p>
        ) : (
          <p dir="rtl" lang="fa" className="farsi mt-0.5 text-sm text-muted">
            {secondary}
          </p>
        )
      ) : null}
    </div>
  );
}

export function BiBody({ fa, en, lang }: { fa: string; en: string; lang: Lang }) {
  const primary = (lang === "fa" ? fa || en : en || fa).trim();
  const secondary = (lang === "fa" ? en : fa).trim();
  const showSecondary = Boolean(secondary && secondary !== primary);
  if (!primary) return null;
  return (
    <div className="space-y-2 text-sm leading-6 text-muted">
      {lang === "fa" ? (
        <p dir="rtl" lang="fa" className="farsi whitespace-pre-wrap">
          {primary}
        </p>
      ) : (
        <p className="whitespace-pre-wrap">{primary}</p>
      )}
      {showSecondary ? (
        lang === "fa" ? (
          <p className="whitespace-pre-wrap">{secondary}</p>
        ) : (
          <p dir="rtl" lang="fa" className="farsi whitespace-pre-wrap">
            {secondary}
          </p>
        )
      ) : null}
    </div>
  );
}
