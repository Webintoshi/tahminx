"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamFormCard } from "@/components/cards/TeamFormCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { RecentMatchesTable } from "@/components/tables/RecentMatchesTable";
import { MatchCard } from "@/components/cards/MatchCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useTeamDetail, useTeamForm, useTeamMatches, useTeamSquad } from "@/lib/hooks/use-api";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((mod) => mod.LineChart), { ssr: false });
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

const formatShortDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return dateFormatter.format(date);
};

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();

  const detailQuery = useTeamDetail(id);
  const matchesQuery = useTeamMatches(id, { pageSize: 20, sortBy: "kickoffAt", sortOrder: "desc" });
  const formQuery = useTeamForm(id);
  const squadQuery = useTeamSquad(id);

  const team = detailQuery.data?.data;
  const teamMatches = matchesQuery.data?.data ?? [];
  const teamForm = formQuery.data?.data ?? [];
  const teamSquad = squadQuery.data?.data ?? [];
  const leagueHistory = team?.leagueHistory ?? [];
  const visibleLeagueHistory = leagueHistory.slice(0, 8);
  const recent = teamMatches.filter((match) => match.status === "completed");
  const upcoming = teamMatches.filter((match) => match.status === "scheduled" || match.status === "live");
  const visibleRecent = recent.slice(0, 40);
  const visibleUpcoming = upcoming.slice(0, 6);
  const primaryLeague = team?.currentLeague ?? team?.latestLeague ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={team ? `${team.name} Detay` : "Takim Detay"}
        description="Takim profil, son maclar, form trendi, home/away metrik ve kadro"
      />

      <DataFeedback
        isLoading={detailQuery.isLoading || matchesQuery.isLoading || formQuery.isLoading || squadQuery.isLoading}
        error={(detailQuery.error as Error | undefined) ?? (matchesQuery.error as Error | undefined)}
        isEmpty={!team}
        emptyTitle="Takim verisi bulunamadi"
        emptyDescription="Takim detayi backend'den alinamadi."
        onRetry={() => {
          void detailQuery.refetch();
          void matchesQuery.refetch();
          void formQuery.refetch();
          void squadQuery.refetch();
        }}
      >
        {team ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[0.72fr_1fr_1fr]">
              <TeamFormCard team={team} form={teamForm} />

              <SectionCard title="Form Trendi" subtitle="Son mac performans puani">
                <LineChart
                  data={
                    teamForm.length > 0
                      ? teamForm.map((point, index) => ({ label: String(index + 1), value: point.value ?? 50 }))
                      : [
                          { label: "1", value: 50 },
                          { label: "2", value: 50 },
                          { label: "3", value: 50 }
                        ]
                  }
                />
              </SectionCard>

              <SectionCard title="Lig ve Arsiv" subtitle="Takimin son ligi ve tarihsel arsiv ozeti">
                <div className="space-y-3">
                  <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">{team.currentLeague ? "Guncel lig" : "Son kayitli lig"}</p>
                    <p className="mt-1 text-base font-semibold">{primaryLeague?.leagueName ?? "Lig bilgisi yok"}</p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {[primaryLeague?.country, primaryLeague?.seasonLabel].filter(Boolean).join(" • ") || "Sezon bilgisi yok"}
                    </p>
                  </article>

                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <dt className="text-xs text-[color:var(--muted)]">Toplam mac</dt>
                      <dd className="mt-1 text-lg font-semibold">{team.matchHistorySummary?.totalMatches ?? recent.length}</dd>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <dt className="text-xs text-[color:var(--muted)]">Oynadigi lig</dt>
                      <dd className="mt-1 text-lg font-semibold">{leagueHistory.length}</dd>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <dt className="text-xs text-[color:var(--muted)]">Ilk kayit</dt>
                      <dd className="mt-1 text-sm font-semibold">{formatShortDate(team.matchHistorySummary?.firstMatchAt)}</dd>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <dt className="text-xs text-[color:var(--muted)]">Son kayit</dt>
                      <dd className="mt-1 text-sm font-semibold">{formatShortDate(team.matchHistorySummary?.lastMatchAt)}</dd>
                    </div>
                  </dl>
                </div>
              </SectionCard>
            </section>

            <SectionCard title="Home / Away Metrics" subtitle="Ic saha-dis saha ve hucum-savunma dengesi">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Ic saha</p>
                  <p className="text-xl font-semibold">{team.homeMetric ?? "-"}%</p>
                </article>
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Dis saha</p>
                  <p className="text-xl font-semibold">{team.awayMetric ?? "-"}%</p>
                </article>
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Hucum</p>
                  <p className="text-xl font-semibold">{team.attackMetric ?? "-"}</p>
                </article>
                <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Savunma</p>
                  <p className="text-xl font-semibold">{team.defenseMetric ?? "-"}</p>
                </article>
              </div>
            </SectionCard>

            <SectionCard title="Kadro" subtitle="Takim oyuncu listesi">
              <DataFeedback
                isLoading={squadQuery.isLoading}
                error={squadQuery.error as Error | undefined}
                isEmpty={teamSquad.length === 0}
                emptyTitle="Kadro verisi yok"
                emptyDescription="Bu takim icin kadro listesi gelmedi."
                onRetry={() => void squadQuery.refetch()}
                loadingCount={2}
              >
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teamSquad.map((player) => (
                    <li key={player.id} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm">
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-[color:var(--muted)]">{player.position} {player.number ? `#${player.number}` : ""}</p>
                    </li>
                  ))}
                </ul>
              </DataFeedback>
            </SectionCard>

            <SectionCard title="Lig Gecmisi" subtitle="Takimin oynadigi ligler ve arsiv kapsami">
              <DataFeedback
                isLoading={detailQuery.isLoading}
                error={detailQuery.error as Error | undefined}
                isEmpty={visibleLeagueHistory.length === 0}
                emptyTitle="Lig arsivi yok"
                emptyDescription="Bu takim icin lig eslesmesi olusturulamadi."
                onRetry={() => void detailQuery.refetch()}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {visibleLeagueHistory.map((league) => (
                    <article key={league.leagueId} className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{league.leagueName}</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {[league.country, league.seasonLabel].filter(Boolean).join(" • ") || "Sezon bilgisi yok"}
                          </p>
                        </div>
                        {league.isCurrent ? (
                          <span className="rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#34C759]">
                            Guncel
                          </span>
                        ) : null}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-[color:var(--muted)]">Mac</dt>
                          <dd className="font-semibold">{league.matchCount}</dd>
                        </div>
                        <div>
                          <dt className="text-[color:var(--muted)]">Sezon</dt>
                          <dd className="font-semibold">{league.seasonCount ?? 0}</dd>
                        </div>
                        <div>
                          <dt className="text-[color:var(--muted)]">Ilk</dt>
                          <dd className="font-semibold">{formatShortDate(league.firstMatchAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-[color:var(--muted)]">Son</dt>
                          <dd className="font-semibold">{formatShortDate(league.lastMatchAt)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </DataFeedback>
            </SectionCard>

            <SectionCard
              title="Karsilasma Arsivi"
              subtitle={`Tamamlanan karsilasmalar${team.matchHistorySummary?.totalMatches ? ` • Son ${visibleRecent.length} kayit gosteriliyor` : ""}`}
            >
              <RecentMatchesTable matches={visibleRecent} showLeague />
            </SectionCard>

            <SectionCard title="Yaklasan Maclar" subtitle="Takvimdeki bir sonraki maclar">
              <DataFeedback
                isLoading={matchesQuery.isLoading}
                error={matchesQuery.error as Error | undefined}
                isEmpty={visibleUpcoming.length === 0}
                emptyTitle="Yaklasan mac yok"
                emptyDescription="Takim icin planli mac verisi bulunamadi."
                onRetry={() => void matchesQuery.refetch()}
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  {visibleUpcoming.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </DataFeedback>
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}
