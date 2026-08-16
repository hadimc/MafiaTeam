"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel, fieldClass } from "@/components/ui";
import { createEventAction } from "@/server/actions/events";

export function AdminEvents({
  events,
}: {
  events: { id: string; slug: string; title: string; titleEn: string; status: string; date: string }[];
}) {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function create(formData: FormData) {
    setError(null);
    const result = await createEventAction(formData);
    if (result?.error) setError(result.error);
    if (result?.slug) router.push(`/events/${result.slug}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="display text-2xl font-semibold">{t("events")}</h1>
      {events.map((event) => (
        <Panel key={event.id}>
          <h2 className="display text-lg font-semibold">{event.titleEn || event.title}</h2>
          <p className="mt-1 text-sm capitalize text-muted">{event.status.replaceAll("_", " ")}</p>
          <p className="text-sm text-muted">/events/{event.slug}</p>
          <Button href={`/events/${event.slug}`} className="mt-4">
            {t("openEvent")}
          </Button>
        </Panel>
      ))}
      <form action={create}>
        <Panel className="space-y-3">
          <h2 className="font-semibold">New event</h2>
          <input name="title" placeholder="Title" className={fieldClass} />
          <input name="location" placeholder={t("location")} className={fieldClass} />
          <input name="date" type="datetime-local" className={fieldClass} />
          {error ? <p className="text-sm text-red-2">{error}</p> : null}
          <Button type="submit">{t("confirm")}</Button>
        </Panel>
      </form>
    </div>
  );
}
