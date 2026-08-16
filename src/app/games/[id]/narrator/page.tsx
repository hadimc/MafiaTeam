import { loadNarratorGame } from "@/lib/narrator";
import { NarratorHub } from "@/components/screens/NarratorHub";

export default async function NarratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game } = await loadNarratorGame(id);
  return <NarratorHub game={game as never} />;
}
