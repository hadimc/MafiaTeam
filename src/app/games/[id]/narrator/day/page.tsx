import { loadNarratorGame } from "@/lib/narrator";
import { NarratorDay } from "@/components/screens/NarratorDay";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game } = await loadNarratorGame(id);
  return <NarratorDay game={game as never} />;
}
