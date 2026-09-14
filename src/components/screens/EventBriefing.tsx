"use client";

import { Button, FactionPill, Panel } from "@/components/ui";
import { BiBody, BiTitle, LangToggle, usePageLang } from "@/components/bilingual";
import { CopyLinkIcon } from "@/components/CopyLink";
import { EXIT_CARDS, HOUSE_RULES } from "@/lib/catalog";
import { displayScenarioName, lockInBriefingRoles, briefingPlayerCount } from "@/lib/briefing";
import { asFaction } from "@/lib/stats";

const FACTIONS = ["citizen", "mafia", "independent"] as const;

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
  const { lang, fa, tx, switchLang } = usePageLang();
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
        <LangToggle
          fa={fa}
          onSwitch={switchLang}
          englishLabel={tx("langEnglish")}
          farsiLabel={tx("langFarsi")}
        />
      </div>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tx("scenarioBriefing")}</p>
          <h1 className={`${fa ? "" : "display"} mt-1 text-3xl font-semibold leading-tight`}>{title}</h1>
        </div>
        <CopyLinkIcon path={`/events/${event.slug}/briefing`} label={tx("copyLink")} />
      </header>

      <Panel className="space-y-3">
        <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("briefingIntro")}</h2>
        <BiTitle
          fa={displayScenarioName(scenario, event.slug, "fa", event)}
          en={displayScenarioName(scenario, event.slug, "en", event)}
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
    </div>
  );
}
