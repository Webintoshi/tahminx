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

  const upcoming = teamMatches.filter((match) => match.status === "scheduled" || match.status === "live");
  const recent = teamMatches.filter((match) => match.status === "completed");

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
            <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
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

            <SectionCard title="Son Maclar" subtitle="Tamamlanan karsilasmalar">
              <RecentMatchesTable matches={recent} />
            </SectionCard>

            <SectionCard title="Yaklasan Maclar" subtitle="Takvimdeki bir sonraki maclar">
              <DataFeedback
                isLoading={matchesQuery.isLoading}
                error={matchesQuery.error as Error | undefined}
                isEmpty={upcoming.length === 0}
                emptyTitle="Yaklasan mac yok"
                emptyDescription="Takim icin planli mac verisi bulunamadi."
                onRetry={() => void matchesQuery.refetch()}
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  {upcoming.map((match) => (
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
