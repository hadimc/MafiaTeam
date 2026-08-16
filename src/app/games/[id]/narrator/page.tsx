import { loadNarratorGame } from "@/lib/narrator";
import { NarratorStage } from "@/components/screens/NarratorStage";

export const dynamic = "force-dynamic";

export default async function NarratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game } = await loadNarratorGame(id);
  return <NarratorStage game={game as never} />;
}
