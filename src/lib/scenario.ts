import type { Faction, RoleDef, ScenarioConfig } from "@/engine";
import { parseConfig } from "@/engine";

export type SnapshotRole = RoleDef;

export type SnapshotExitCard = {
  id: string;
  key: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  used: boolean;
};

export type ScenarioSnapshot = {
  scenarioId: string;
  name: string;
  nameEn: string;
  playerCount: number;
  version: number;
  configuration: ScenarioConfig;
  roles: SnapshotRole[];
  exitCards: SnapshotExitCard[];
};

export function readSnapshot(raw: string): ScenarioSnapshot {
  return JSON.parse(raw) as ScenarioSnapshot;
}

export function snapshotFromScenario(scenario: {
  id: string;
  name: string;
  nameEn: string;
  supportedPlayerCount: number;
  configuration: string;
  version: number;
  roles: {
    key: string;
    name: string;
    nameEn: string;
    faction: string;
    description: string;
    descriptionEn: string;
    quantity: number;
    nightOrder: number;
  }[];
  exitCards: {
    id: string;
    key: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
  }[];
}): ScenarioSnapshot {
  return {
    scenarioId: scenario.id,
    name: scenario.name,
    nameEn: scenario.nameEn,
    playerCount: scenario.supportedPlayerCount,
    version: scenario.version,
    configuration: parseConfig(scenario.configuration),
    roles: scenario.roles.map((role) => ({
      key: role.key,
      name: role.name,
      nameEn: role.nameEn,
      faction: role.faction as Faction,
      description: role.description,
      descriptionEn: role.descriptionEn,
      quantity: role.quantity,
      nightOrder: role.nightOrder,
    })),
    exitCards: scenario.exitCards.map((card) => ({
      id: card.id,
      key: card.key,
      name: card.name,
      nameEn: card.nameEn,
      description: card.description,
      descriptionEn: card.descriptionEn,
      used: false,
    })),
  };
}

export function phaseLabel(phase: string, lang: "fa" | "en") {
  const map: Record<string, { fa: string; en: string }> = {
    lobby: { fa: "آماده", en: "Ready" },
    intro_day: { fa: "روز معارفه", en: "Introduction day" },
    intro_night: { fa: "شب معارفه", en: "Introduction night" },
    day_discussion: { fa: "بحث روز", en: "Day discussion" },
    defense_vote: { fa: "رأی دفاع", en: "Defense vote" },
    defense: { fa: "دفاع", en: "Defense" },
    elimination_vote: { fa: "رأی حذف", en: "Elimination vote" },
    tie_break: { fa: "تساوی", en: "Tie-break" },
    exit_card: { fa: "کارت خروج", en: "Exit card" },
    night: { fa: "شب", en: "Night" },
    night_resolution: { fa: "نتیجه شب", en: "Night resolution" },
    morning_report: { fa: "گزارش صبح", en: "Morning report" },
    game_over: { fa: "پایان", en: "Game over" },
  };
  return (map[phase] ?? { fa: phase, en: phase })[lang];
}
