export type TimerCue = "none" | "tick" | "urgent" | "buzz";

export function timerCue(from: number, to: number): TimerCue {
  if (to === from || to > from) return "none";
  if (to === 0) return "buzz";
  if (to <= 3) return "urgent";
  if (to <= 10) return "tick";
  return "none";
}

export function tickHz(secondsLeft: number) {
  return 420 + (11 - secondsLeft) * 70;
}
