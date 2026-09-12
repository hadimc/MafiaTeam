import { requireUser } from "@/lib/auth";
import { getEventBySlug, listRules } from "@/lib/queries";
import { hasFinalizedScenario } from "@/lib/stats";
import { notFound } from "next/navigation";
import { EventBriefing } from "@/components/screens/EventBriefing";

export const dynamic = "force-dynamic";

export default async function EventBriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/events/${slug}/briefing`);
  const event = await getEventBySlug(slug);
  if (!event || !hasFinalizedScenario(event.status) || !event.scenario) notFound();
  const rules = await listRules();
  return (
    <EventBriefing
      event={JSON.parse(
        JSON.stringify({
          slug: event.slug,
          title: event.title,
          titleEn: event.titleEn,
          scenarioSnapshot: event.games[0]?.scenarioSnapshot ?? null,
          scenario: {
            name: event.scenario.name,
            nameEn: event.scenario.nameEn,
            description: event.scenario.description,
            descriptionEn: event.scenario.descriptionEn,
            supportedPlayerCount: event.scenario.supportedPlayerCount,
            roles: event.scenario.roles,
            exitCards: event.scenario.exitCards,
          },
        }),
      )}
      rules={JSON.parse(
        JSON.stringify(
          rules.map((rule) => ({
            title: rule.title,
            titleEn: rule.titleEn,
            body: rule.body,
            bodyEn: rule.bodyEn,
          })),
        ),
      )}
    />
  );
}
