import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGameForNarrator } from "@/lib/queries";

export async function loadNarratorGame(gameId: string) {
  const user = await requireUser();
  const game = await getGameForNarrator(gameId, user);
  if (!game) notFound();
  return { user, game: JSON.parse(JSON.stringify(game)) as typeof game };
}
