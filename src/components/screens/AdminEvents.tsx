"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel, fieldClass } from "@/components/ui";
import { ShareJoinLink } from "@/components/CopyLink";
import { createEventAction, deleteEventAction } from "@/server/actions/events";
import { eventLane } from "@/lib/stats";

export function AdminEvents({
  events,
}: {
  events: { id: string; slug: string; title: string; titleEn: string; status: string; date: string }[];
}) {
  const { t } = useLang();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const upcoming = events
    .filter((event) => eventLane(event.status) !== "past")
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter((event) => eventLane(event.status) === "past")
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  async function create(formData: FormData) {
    setError(null);
    const result = await createEventAction(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.slug) router.push(`/events/${result.slug}`);
  }

  async function remove(eventId: string) {
    setRemoving(eventId);
    await deleteEventAction(eventId);
    setRemoving(null);
    setConfirming(null);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {creating ? (
        <form action={create}>
          <Panel className="space-y-3">
            <h2 className="display text-lg font-semibold">{t("createNewEvent")}</h2>
            <input name="title" placeholder="Title" className={fieldClass} />
            <input name="location" placeholder={t("location")} className={fieldClass} />
            <input name="date" type="datetime-local" className={fieldClass} />
            {error ? <p className="text-sm text-mafia">{error}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">{t("confirm")}</Button>
            </div>
          </Panel>
        </form>
      ) : (
        <Button onClick={() => setCreating(true)}>{t("createNewEvent")}</Button>
      )}

      <section className="space-y-3">
        <h2 className="display text-xl font-semibold">{t("upcoming")}</h2>
        {upcoming.length === 0 ? <p className="text-sm text-muted">{t("noUpcomingEvents")}</p> : null}
        {upcoming.map((event) => (
          <Panel key={event.id} className="space-y-3">
            <h3 className="display text-lg font-semibold">{event.titleEn || event.title}</h3>
            <p className="text-sm capitalize text-muted">{event.status.replaceAll("_", " ")}</p>
            {confirming === event.id ? (
              <>
                <p className="text-sm text-muted">{t("removeEventWarn")}</p>
                <Button
                  variant="danger"
                  disabled={removing === event.id}
                  onClick={() => void remove(event.id)}
                >
                  {t("yesRemoveEvent")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  {t("cancel")}
                </Button>
              </>
            ) : (
              <>
                <ShareJoinLink slug={event.slug} />
                <Button href={`/events/${event.slug}`}>{t("openEvent")}</Button>
                <Button variant="danger" onClick={() => setConfirming(event.id)}>
                  {t("removeEvent")}
                </Button>
              </>
            )}
          </Panel>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="display text-xl font-semibold">{t("pastEvents")}</h2>
        {past.length === 0 ? <p className="text-sm text-muted">{t("noPastNights")}</p> : null}
        {past.map((event) => (
          <Panel key={event.id} className="space-y-3">
            <h3 className="display text-lg font-semibold">{event.titleEn || event.title}</h3>
            <p className="text-sm text-muted">
              {new Date(event.date).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <Button href={`/events/${event.slug}`}>{t("viewEvent")}</Button>
            <Button
              variant="danger"
              disabled={removing === event.id}
              onClick={() => void remove(event.id)}
            >
              {t("removeFromHistory")}
            </Button>
          </Panel>
        ))}
      </section>
    </div>
  );
}
