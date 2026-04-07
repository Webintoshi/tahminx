"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeagueTable } from "@/components/tables/LeagueTable";
import { StandingsTable } from "@/components/tables/StandingsTable";
import { MatchCard } from "@/components/cards/MatchCard";
import { RecentMatchesTable } from "@/components/tables/RecentMatchesTable";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useLeagueDetail, useLeagueStandings, useMatches } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

// Tab definitions
const tabs = [
  { id: "standings", label: "Puan Tablosu", icon: "🏆" },
  { id: "form", label: "Form Durumu", icon: "📈" },
  { id: "matches", label: "Maçlar", icon: "⚽" },
] as const;

type TabId = (typeof tabs)[number]["id"];

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  suffix = "",
  icon, 
  color = "default" 
}: { 
  label: string; 
  value: string | number; 
  suffix?: string;
  icon: React.ReactNode;
  color?: "default" | "accent" | "success" | "warning";
}) {
  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl border p-4 transition-all",
      color === "accent"
        ? "border-[#7A84FF]/30 bg-[#7A84FF]/5"
        : color === "success"
        ? "border-[#34C759]/30 bg-[#34C759]/5"
        : color === "warning"
        ? "border-[#FF9500]/30 bg-[#FF9500]/5"
        : "border-[#2A3035] bg-[#171C1F]"
    )}>
      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
        color === "accent"
          ? "bg-[#7A84FF] text-black"
          : color === "success"
          ? "bg-[#34C759] text-black"
          : color === "warning"
          ? "bg-[#FF9500] text-black"
          : "bg-[#1F2529] text-[#9CA3AF]"
      )}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
        <p className={cn(
          "text-2xl font-bold",
          color === "accent"
            ? "text-[#7A84FF]"
            : color === "success"
            ? "text-[#34C759]"
            : color === "warning"
            ? "text-[#FF9500]"
            : "text-[#ECEDEF]"
        )}>
          {value}{suffix}
        </p>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: typeof tabs[number]; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all",
        isActive
          ? "bg-[#7A84FF] text-black"
          : "border border-[#2A3035] bg-[#171C1F] text-[#9CA3AF] hover:border-[#7A84FF]/50 hover:text-[#ECEDEF]"
      )}
    >
      <span>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

// Section Header Component
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[#ECEDEF]">{title}</h2>
      {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
    </div>
  );
}

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [season, setSeason] = useState("2025/26");
  const [activeTab, setActiveTab] = useState<TabId>("standings");

  const detailQuery = useLeagueDetail(id);
  const standingsQuery = useLeagueStandings(id);
  const upcomingQuery = useMatches({ leagueId: id, status: "scheduled", pageSize: 6, sortBy: "kickoffAt", sortOrder: "asc" });
  const recentQuery = useMatches({ leagueId: id, status: "completed", pageSize: 8, sortBy: "kickoffAt", sortOrder: "desc" });

  const league = detailQuery.data?.data;
  const standings = standingsQuery.data?.data ?? [];
  const upcoming = upcomingQuery.data?.data ?? [];
  const recent = recentQuery.data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={league ? league.name : "Lig Detay"}
        description={league ? `${league.country} • Sezon ${season}` : "Lig bilgisi yükleniyor..."}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9CA3AF]">Sezon</span>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="2025/26">2025/26</option>
              <option value="2024/25">2024/25</option>
            </select>
          </div>
        }
      />

      <DataFeedback
        isLoading={detailQuery.isLoading || standingsQuery.isLoading}
        error={(detailQuery.error as Error | undefined) ?? (standingsQuery.error as Error | undefined)}
        isEmpty={!league}
        emptyTitle="Lig verisi bulunamadı"
        emptyDescription="Lig detay endpoint'i veri döndürmedi."
        onRetry={() => {
          void detailQuery.refetch();
          void standingsQuery.refetch();
          void upcomingQuery.refetch();
          void recentQuery.refetch();
        }}
      >
        {league ? (
          <>
            {/* Hero Stats Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Ortalama Skor"
                value={league.statsSummary?.avgScore ?? "-"}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                color="accent"
              />
              <StatCard
                label="Ev Sahibi Kazanma"
                value={league.statsSummary?.homeWinRate ?? "-"}
                suffix="%"
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
                color="success"
              />
              <StatCard
                label="Deplasman Kazanma"
                value={league.statsSummary?.awayWinRate ?? "-"}
                suffix="%"
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
                color="warning"
              />
              <StatCard
                label="Beraberlik Oranı"
                value={league.statsSummary?.drawRate ?? "-"}
                suffix="%"
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
              />
            </section>

            {/* Tab Navigation */}
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </nav>

            {/* Tab Content */}
            <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
              {/* STANDINGS TAB */}
              {activeTab === "standings" && (
                <>
                  <SectionHeader title="Puan Tablosu" subtitle="Takım sıralaması ve istatistikler" />
                  <LeagueTable rows={standings} />
                </>
              )}

              {/* FORM TAB */}
              {activeTab === "form" && (
                <>
                  <SectionHeader title="Form Durumu" subtitle="Son 5 maç performansı" />
                  <StandingsTable rows={standings} />
                </>
              )}

              {/* MATCHES TAB */}
              {activeTab === "matches" && (
                <div className="space-y-6">
                  {/* Upcoming Matches */}
                  <div>
                    <SectionHeader title="Yaklaşan Maçlar" subtitle="Planlanmış karşılaşmalar" />
                    <DataFeedback
                      isLoading={upcomingQuery.isLoading}
                      error={upcomingQuery.error as Error | undefined}
                      isEmpty={upcoming.length === 0}
                      emptyTitle="Yaklaşan maç yok"
                      emptyDescription="Bu ligde yaklaşan maç verisi yok."
                      onRetry={() => void upcomingQuery.refetch()}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        {upcoming.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </DataFeedback>
                  </div>

                  {/* Recent Results */}
                  <div>
                    <SectionHeader title="Son Sonuçlar" subtitle="Tamamlanan maçlar" />
                    <DataFeedback
                      isLoading={recentQuery.isLoading}
                      error={recentQuery.error as Error | undefined}
                      isEmpty={recent.length === 0}
                      emptyTitle="Sonuç verisi yok"
                      emptyDescription="Bu lig için tamamlanan maç listesi boş."
                      onRetry={() => void recentQuery.refetch()}
                    >
                      <RecentMatchesTable matches={recent} />
                    </DataFeedback>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}
