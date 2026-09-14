import { sixthSenseGuess, type NightLine } from "./stages";

export type NightFocus = {
  task: string;
  step: string;
};

export type NightFocusAction = {
  id: string;
  actionType: string;
  dayNumber: number;
  phase?: string | null;
  targetPlayerId?: string | null;
  metadata?: string | null;
  reversed?: boolean;
};

const NIGHT_PHASES = new Set(["night", "intro_night", "night_resolution"]);

const COMPLETE_TYPES = new Set([
  "faceChange",
  "nostradamus",
  "jack",
  "zodiac",
  "mafiaShot",
  "sixthSense",
  "saul",
  "lecter",
  "matador",
  "watson",
  "leon",
  "kane",
  "constantine",
  "gunner",
]);

type FocusStep = {
  task: string;
  step: string;
  types: string[];
  role?: string;
};

const NIGHT_FOCUS_STEPS: FocusStep[] = [
  { task: "faceChange", step: "faceChange", types: ["faceChange"] },
  { task: "nostradamus", step: "nostradamus", types: ["nostradamus"], role: "nostradamus" },
  { task: "jack", step: "jack", types: ["jack"], role: "jack" },
  { task: "zodiac", step: "zodiac", types: ["zodiac"], role: "zodiac" },
  { task: "mafia", step: "mafia", types: ["mafiaShot", "sixthSense", "saul"] },
  { task: "mafia", step: "lecter", types: ["lecter"], role: "lecter" },
  { task: "mafia", step: "matador", types: ["matador"], role: "matador" },
  { task: "town", step: "watson", types: ["watson"], role: "watson" },
  { task: "town", step: "leon", types: ["leon"], role: "leon" },
  { task: "town", step: "kane", types: ["kane"], role: "kane" },
  { task: "town", step: "detective", types: ["detective"], role: "detective" },
  { task: "town", step: "constantine", types: ["constantine"], role: "constantine" },
  { task: "town", step: "gunner", types: ["gunner"], role: "gunner" },
  { task: "nightEnd", step: "nightEnd", types: [] },
];

function stepAvailable(step: FocusStep, tasks: Set<string>, lineFor: (role: string) => NightLine) {
  if (!tasks.has(step.task)) return false;
  if (!step.role) return true;
  return lineFor(step.role) === "record";
}

/** Where the narrator should look next after the last completed night pick (or at the start of the night). */
export function nextNightFocus(
  lastType: string | null,
  tasks: string[],
  lineFor: (role: string) => NightLine,
): NightFocus | null {
  const available = new Set(tasks);
  const start = lastType == null ? -1 : NIGHT_FOCUS_STEPS.findIndex((step) => step.types.includes(lastType));
  if (lastType != null && start < 0) return null;
  for (let i = start + 1; i < NIGHT_FOCUS_STEPS.length; i++) {
    const step = NIGHT_FOCUS_STEPS[i];
    if (!stepAvailable(step, available, lineFor)) continue;
    return { task: step.task, step: step.step };
  }
  return null;
}

function isCompletedTonightPick(action: NightFocusAction, dayNumber: number) {
  if (action.reversed) return false;
  if (action.dayNumber !== dayNumber) return false;
  if (action.phase && !NIGHT_PHASES.has(action.phase)) return false;
  if (!COMPLETE_TYPES.has(action.actionType)) return false;
  if (!action.targetPlayerId) return false;
  if (action.actionType === "sixthSense" && !sixthSenseGuess(action)) return false;
  return true;
}

/** Latest tonight pick that is done enough to advance the night script. */
export function lastCompletedTonightPick(actions: NightFocusAction[], dayNumber: number) {
  let found: NightFocusAction | null = null;
  for (const action of actions) {
    if (!isCompletedTonightPick(action, dayNumber)) continue;
    found = action;
  }
  return found;
}

export function completedTonightTypes(actions: NightFocusAction[], dayNumber: number) {
  const types = new Set<string>();
  for (const action of actions) {
    if (!isCompletedTonightPick(action, dayNumber)) continue;
    types.add(action.actionType);
  }
  return types;
}

/** Newest completed night type that was not already in `previous`. Null if nothing new. */
export function latestNewCompletedType(
  previous: Iterable<string>,
  actions: NightFocusAction[],
  dayNumber: number,
) {
  const added = new Set<string>();
  const seen = new Set(previous);
  for (const type of completedTonightTypes(actions, dayNumber)) {
    if (seen.has(type)) continue;
    added.add(type);
  }
  if (added.size === 0) return null;
  let found: string | null = null;
  for (const action of actions) {
    if (!isCompletedTonightPick(action, dayNumber)) continue;
    if (!added.has(action.actionType)) continue;
    found = action.actionType;
  }
  return found;
}

export function nightStepElementId(step: string) {
  return `night-step-${step}`;
}
