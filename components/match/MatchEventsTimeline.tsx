import type { MatchEvent } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

export function MatchEventsTimeline({
  events,
  isLive = false,
  isStreaming = false,
  lastUpdatedAt,
  ariaLabel = "Mac olay akisi"
}: {
  events: MatchEvent[];
  isLive?: boolean;
  isStreaming?: boolean;
  lastUpdatedAt?: string | null;
  ariaLabel?: string;
}) {
  if (!events.length) {
    return <p className="text-sm text-[color:var(--muted)]">Bu mac icin olay akisi bulunmuyor.</p>;
  }

  const sorted = [...events].sort((a, b) => {
    const left = a.minute ?? -1;
    const right = b.minute ?? -1;
    return right - left;
  });

  return (
    <section aria-label={ariaLabel}>
      {(isLive || isStreaming) && lastUpdatedAt ? (
        <p className="mb-3 text-xs text-[color:var(--muted)]">
          Son guncelleme: {formatDateTime(lastUpdatedAt)} {isStreaming ? "- Canli bagli" : ""}
        </p>
      ) : null}

      <ol className="space-y-3" role={isLive ? "log" : undefined} aria-live={isLive ? "polite" : undefined} aria-relevant={isLive ? "additions text" : undefined}>
        {sorted.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span className="mt-1 inline-flex h-6 w-14 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[color:var(--muted)]">
              {event.minute == null ? "Dakika -" : `${event.minute}.dk`}
            </span>
            <div className="flex-1 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2">
              <p className="text-sm font-medium text-[color:var(--foreground)]">{event.title || "Mac olayi"}</p>
              {event.description ? <p className="text-sm text-[color:var(--muted)]">{event.description}</p> : null}
              <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--muted)]">
                {event.teamName ?? "Takim"} - {event.type || "Olay"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
