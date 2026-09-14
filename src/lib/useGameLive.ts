"use client";

import { useCallback } from "react";
import { useLivePull } from "@/lib/live";
import { pullGameAction } from "@/server/actions/live";

export function useGameLive(gameId: string, active = true) {
  const pull = useCallback((seen: string) => pullGameAction(gameId, seen), [gameId]);
  useLivePull(pull, active, 1000);
}
