"use client";

import { useEffect, useRef } from "react";

export function useLivePull(
  pull: (seen: string) => Promise<string>,
  active = true,
  ms = 1500,
) {
  const seen = useRef("");
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function tick() {
      try {
        const next = await pull(seen.current);
        if (!cancelled) seen.current = next;
      } catch {
        /* keep polling */
      }
    }
    void tick();
    const id = setInterval(tick, ms);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, ms, pull]);
}
