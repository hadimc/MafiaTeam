import { loadNarratorGame } from "@/lib/narrator";
import { NarratorNight } from "@/components/screens/NarratorNight";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game } = await loadNarratorGame(id);
  return <NarratorNight game={game as never} />;
}
