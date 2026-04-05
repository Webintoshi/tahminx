"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { LeagueTable } from "@/components/tables/LeagueTable";
import { StandingsTable } from "@/components/tables/StandingsTable";
import { MatchCard } from "@/components/cards/MatchCard";
import { RecentMatchesTable } from "@/components/tables/RecentMatchesTable";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useLeagueDetail, useLeagueStandings, useMatches } from "@/lib/hooks/use-api";

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [season, setSeason] = useState("2025/26");

  const detailQuery = useLeagueDetail(id);
  const standingsQuery = useLeagueStandings(id);
  const upcomingQuery = useMatches({ leagueId: id, status: "scheduled", pageSize: 6, sortBy: "kickoffAt", sortOrder: "asc" });
  const recentQuery = useMatches({ leagueId: id, status: "completed", pageSize: 8, sortBy: "kickoffAt", sortOrder: "desc" });

  const league = detailQuery.data?.data;
  const standings = standingsQuery.data?.data ?? [];
  const upcoming = upcomingQuery.data?.data ?? [];
  const recent = recentQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={league ? `${league.name} Detay` : "Lig Detay"}
        description="Lig basligi, puan tablosu, form tablosu, yaklasan maclar, son sonuclar"
        actions={
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-[color:var(--muted)]">Sezon</span>
            <select
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3"
            >
              <option value="2025/26">2025/26</option>
              <option value="2024/25">2024/25</option>
            </select>
          </label>
        }
      />

      <DataFeedback
        isLoading={detailQuery.isLoading || standingsQuery.isLoading}
        error={(detailQuery.error as Error | undefined) ?? (standingsQuery.error as Error | undefined)}
        isEmpty={!league}
        emptyTitle="Lig verisi bulunamadi"
        emptyDescription="Lig detay endpoint'i veri dondurmedi."
        onRetry={() => {
          void detailQuery.refetch();
          void standingsQuery.refetch();
          void upcomingQuery.refetch();
          void recentQuery.refetch();
        }}
      >
        {league ? (
          <>
            <SectionCard title="Lig Header" subtitle={`${league.country} • Sezon ${season}`}>
              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Ortalama skor</p>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">{league.statsSummary?.avgScore ?? "-"}</p>
                </article>
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Ev kazanma</p>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">{league.statsSummary?.homeWinRate ?? "-"}%</p>
                </article>
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Dep kazanma</p>
                  <p className="text-xl font-semibold text-[color:var(--foreground)]">{league.statsSummary?.awayWinRate ?? "-"}%</p>
                </article>
              </div>
            </SectionCard>

            <SectionCard title="Puan Tablosu" subtitle="League standings">
              <LeagueTable rows={standings} />
            </SectionCard>

            <SectionCard title="Form Tablosu" subtitle="Son 5 mac form dagilimi">
              <StandingsTable rows={standings} />
            </SectionCard>

            <SectionCard title="Yaklasan Maclar" subtitle="Lig takviminden secili maclar">
              <DataFeedback
                isLoading={upcomingQuery.isLoading}
                error={upcomingQuery.error as Error | undefined}
                isEmpty={upcoming.length === 0}
                emptyTitle="Yaklasan mac yok"
                emptyDescription="Bu ligde yaklasan mac verisi yok."
                onRetry={() => void upcomingQuery.refetch()}
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  {upcoming.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </DataFeedback>
            </SectionCard>

            <SectionCard title="Son Sonuclar" subtitle="Tamamlanan maclar">
              <DataFeedback
                isLoading={recentQuery.isLoading}
                error={recentQuery.error as Error | undefined}
                isEmpty={recent.length === 0}
                emptyTitle="Sonuc verisi yok"
                emptyDescription="Bu lig icin tamamlanan mac listesi bos."
                onRetry={() => void recentQuery.refetch()}
              >
                <RecentMatchesTable matches={recent} />
              </DataFeedback>
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}
