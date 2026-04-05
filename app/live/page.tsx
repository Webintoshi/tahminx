"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchCard } from "@/components/cards/MatchCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { SectionCard } from "@/components/ui/SectionCard";
import { MatchEventsTimeline } from "@/components/match/MatchEventsTimeline";
import { formatDateTime } from "@/lib/utils";
import { useLiveMatches, useMatchEvents } from "@/lib/hooks/use-api";
import { useLiveStream } from "@/lib/hooks/use-live-stream";

const streamStatusLabel: Record<"idle" | "connecting" | "live" | "fallback", string> = {
  idle: "Hazir",
  connecting: "Baglaniyor",
  live: "Canli bagli",
  fallback: "Polling fallback"
};

export default function LivePage() {
  const liveQuery = useLiveMatches({ pageSize: 12, sortBy: "kickoffAt", sortOrder: "asc", status: "live" });
  const liveMatches = liveQuery.data?.data ?? [];
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const effectiveMatchId = selectedMatchId ?? liveMatches[0]?.id ?? undefined;
  const eventsQuery = useMatchEvents(effectiveMatchId);

  const stream = useLiveStream({
    enabled: true,
    selectedMatchId: effectiveMatchId,
    onRefetchLive: () => {
      void liveQuery.refetch();
    },
    onRefetchEvents: () => {
      if (!effectiveMatchId) return;
      void eventsQuery.refetch();
    }
  });

  const selectedMatch = liveMatches.find((match) => match.id === effectiveMatchId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title="Canli Analiz" description="Canli mac listesi, olay akisi ve veri akisi durumu" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--muted)]">Canli Mac</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">{liveMatches.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--muted)]">Akis Modu</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{stream.mode.toUpperCase()}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--muted)]">Baglanti</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{streamStatusLabel[stream.status]}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--muted)]">Son Guncelleme</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{formatDateTime(stream.lastUpdatedAt)}</p>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">Mesaj: {stream.messageCount}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Canli Mac Listesi" subtitle="Secim yap, olay akisinda anlik takip et">
          <DataFeedback
            isLoading={liveQuery.isLoading}
            error={liveQuery.error as Error | undefined}
            isEmpty={liveMatches.length === 0}
            emptyTitle="Canli mac bulunmuyor"
            emptyDescription="Su an canli istatistik akisi veren mac yok."
            onRetry={() => void liveQuery.refetch()}
            loadingCount={6}
            loadingVariant="list"
          >
            <div className="grid gap-3 lg:grid-cols-1">
              {liveMatches.map((match) => {
                const isSelected = effectiveMatchId === match.id;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={`rounded-2xl text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
                      isSelected ? "ring-2 ring-sky-500/65" : "hover:ring-1 hover:ring-[var(--border)]"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${match.homeTeamName} ve ${match.awayTeamName} macini sec`}
                  >
                    <MatchCard match={match} />
                  </button>
                );
              })}
            </div>
          </DataFeedback>
        </SectionCard>

        <SectionCard title="Canli Olay Akisi" subtitle="Secili macin olay akisi ve momentum guncellemeleri">
          <DataFeedback
            isLoading={eventsQuery.isLoading}
            error={eventsQuery.error as Error | undefined}
            isEmpty={!eventsQuery.data?.data || eventsQuery.data.data.length === 0}
            isPartial={Boolean(selectedMatch) && (eventsQuery.data?.data ?? []).length < 2}
            emptyTitle="Olay verisi yok"
            emptyDescription="Secili mac icin olay akis kaydi yok."
            partialTitle="Kisitli canli veri"
            partialDescription="Bu mac icin su an az sayida olay verisi geliyor. Akis devam ettikce guncellenecek."
            onRetry={() => void eventsQuery.refetch()}
            loadingCount={5}
            loadingVariant="list"
          >
            <MatchEventsTimeline
              events={eventsQuery.data?.data ?? []}
              isLive
              isStreaming={stream.status === "live"}
              lastUpdatedAt={stream.lastUpdatedAt}
              ariaLabel={selectedMatch ? `${selectedMatch.homeTeamName} - ${selectedMatch.awayTeamName} olay akisi` : "Canli olay akisi"}
            />
          </DataFeedback>
        </SectionCard>
      </section>
    </div>
  );
}
