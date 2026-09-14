import { loadNarratorGame } from "@/lib/narrator";
import { NarratorHistory } from "@/components/screens/NarratorHistory";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game } = await loadNarratorGame(id);
  return <NarratorHistory game={game as never} />;
}
