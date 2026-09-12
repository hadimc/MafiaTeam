"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, FactionPill, Panel } from "@/components/ui";
import { EXIT_CARDS, HOUSE_RULES } from "@/lib/catalog";
import { displayScenarioName, lockInBriefingRoles, briefingPlayerCount } from "@/lib/briefing";
import { t, type Lang, type Msg } from "@/lib/i18n";
import { asFaction } from "@/lib/stats";

const LANG_KEY = "mafia-lang";
const LANG_EVENT = "mafia-lang";
const FACTIONS = ["citizen", "mafia", "independent"] as const;

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

type RoleRow = {
  key: string;
  name: string;
  nameEn: string;
  faction: string;
  description: string;
  descriptionEn: string;
  quantity: number;
};

type ExitRow = {
  key: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
};

type RuleRow = {
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
};

export function EventBriefing({
  event,
  rules,
}: {
  event: {
    slug: string;
    title: string;
    titleEn: string;
    scenarioSnapshot?: string | null;
    scenario: {
      name: string;
      nameEn: string;
      description: string;
      descriptionEn: string;
      supportedPlayerCount: number;
      roles: RoleRow[];
      exitCards: ExitRow[];
    };
  };
  rules: RuleRow[];
}) {
  const lang = useSyncExternalStore(subscribeLang, readLang, readServerLang);
  const [copied, setCopied] = useState(false);
  const tx = (key: Msg) => t(key, lang);
  const fa = lang === "fa";
  const scenario = event.scenario;
  const roles = lockInBriefingRoles(scenario.roles, event.scenarioSnapshot);
  const playerCount = briefingPlayerCount(roles);
  const grouped = FACTIONS.map((faction) => ({
    faction,
    roles: roles.filter((role) => role.faction === faction),
  })).filter((group) => group.roles.length);
  const extra = roles.filter((role) => !FACTIONS.includes(role.faction as (typeof FACTIONS)[number]));
  const houseRules = rules.length ? rules : HOUSE_RULES;
  const exitCards =
    scenario.exitCards.length > 0
      ? scenario.exitCards
      : EXIT_CARDS.map(([key, name, nameEn, description, descriptionEn]) => ({
          key,
          name,
          nameEn,
          description,
          descriptionEn,
        }));
  const title = fa ? event.title || event.titleEn : event.titleEn || event.title;
  const notes = (fa ? scenario.description : scenario.descriptionEn).trim() || (fa ? scenario.descriptionEn : scenario.description).trim();

  function switchLang(next: Lang) {
    window.localStorage.setItem(LANG_KEY, next);
    window.dispatchEvent(new Event(LANG_EVENT));
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}/briefing`);
    setCopied(true);
  }

  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      lang={fa ? "fa" : "en"}
      className={`flex flex-1 flex-col gap-4 ${fa ? "farsi" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Button href={`/events/${event.slug}`} variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
          {tx("back")}
        </Button>
        <div className="flex gap-1 rounded-full border border-line bg-bg-elev p-1">
          <LangChip active={!fa} onClick={() => switchLang("en")}>
            {tx("langEnglish")}
          </LangChip>
          <LangChip active={fa} onClick={() => switchLang("fa")}>
            {tx("langFarsi")}
          </LangChip>
        </div>
      </div>

      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tx("scenarioBriefing")}</p>
        <h1 className={`${fa ? "" : "display"} mt-1 text-3xl font-semibold leading-tight`}>{title}</h1>
      </header>

      <Panel className="space-y-3">
        <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("briefingIntro")}</h2>
        <BiTitle
          fa={displayScenarioName(scenario, event.slug, "fa")}
          en={displayScenarioName(scenario, event.slug, "en")}
          lang={lang}
          large
        />
        <p className="text-sm text-muted">
          {playerCount} {tx("players").toLowerCase()}
        </p>
        {notes ? <BiBody fa={scenario.description} en={scenario.descriptionEn} lang={lang} /> : null}
      </Panel>

      <Panel className="space-y-4">
        <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("characters")}</h2>
        {grouped.map((group) => {
          const faction = asFaction(group.faction);
          return (
            <div key={group.faction} className="space-y-2">
              {faction ? <FactionPill faction={faction} farsi={fa} /> : null}
              {group.roles.map((role) => (
                <article key={role.key} className="rounded-2xl bg-bg-elev px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <BiTitle fa={role.name} en={role.nameEn} lang={lang} />
                    <span className="shrink-0 text-lg font-semibold text-gold">×{role.quantity}</span>
                  </div>
                  <div className="mt-2">
                    <BiBody fa={role.description} en={role.descriptionEn} lang={lang} />
                  </div>
                </article>
              ))}
            </div>
          );
        })}
        {extra.map((role) => (
          <article key={role.key} className="rounded-2xl bg-bg-elev px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <BiTitle fa={role.name} en={role.nameEn} lang={lang} />
              <span className="shrink-0 text-lg font-semibold text-gold">×{role.quantity}</span>
            </div>
            <div className="mt-2">
              <BiBody fa={role.description} en={role.descriptionEn} lang={lang} />
            </div>
          </article>
        ))}
      </Panel>

      <Panel className="space-y-3">
        <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("houseRules")}</h2>
        {houseRules.map((rule) => (
          <article key={`${rule.titleEn}-${rule.title}`} className="rounded-2xl bg-bg-elev px-4 py-3.5">
            <BiTitle fa={rule.title} en={rule.titleEn} lang={lang} />
            <div className="mt-2">
              <BiBody fa={rule.body} en={rule.bodyEn} lang={lang} />
            </div>
          </article>
        ))}
      </Panel>

      <Panel className="space-y-3">
        <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("exitCards")}</h2>
        {exitCards.map((card) => (
          <article key={card.key} className="rounded-2xl bg-bg-elev px-4 py-3.5">
            <BiTitle fa={card.name} en={card.nameEn} lang={lang} />
            <div className="mt-2">
              <BiBody fa={card.description} en={card.descriptionEn} lang={lang} />
            </div>
          </article>
        ))}
      </Panel>

      <Panel className="space-y-2">
        <p className="text-sm text-muted">{tx("shareBriefingHint")}</p>
        <Button variant="ghost" onClick={() => void copyLink()}>
          {copied ? tx("copied") : tx("shareBriefing")}
        </Button>
      </Panel>
    </div>
  );
}

function LangChip({
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

function BiTitle({
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

function BiBody({ fa, en, lang }: { fa: string; en: string; lang: Lang }) {
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
