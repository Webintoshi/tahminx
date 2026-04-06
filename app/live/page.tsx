"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchCard } from "@/components/cards/MatchCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { MatchEventsTimeline } from "@/components/match/MatchEventsTimeline";
import { formatDateTime } from "@/lib/utils";
import { useLiveMatches, useMatchEvents } from "@/lib/hooks/use-api";
import { useLiveStream } from "@/lib/hooks/use-live-stream";
import { cn } from "@/lib/utils";

const streamStatusConfig = {
  idle: { label: "Hazır", color: "text-[#9CA3AF]", bg: "bg-[#1F2529]" },
  connecting: { label: "Bağlanıyor", color: "text-[#7A84FF]", bg: "bg-[#7A84FF]/10" },
  live: { label: "Canlı Bağlı", color: "text-[#34C759]", bg: "bg-[#34C759]/10" },
  fallback: { label: "Yedek Mod", color: "text-[#FF9500]", bg: "bg-[#FF9500]/10" }
} as const;

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  subtext,
  icon, 
  color = "default"
}: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  icon: React.ReactNode;
  color?: "default" | "success" | "warning" | "accent";
}) {
  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border p-4 transition-all duration-300",
      color === "success"
        ? "border-[#34C759]/30 bg-[#34C759]/5"
        : color === "warning"
        ? "border-[#FF9500]/30 bg-[#FF9500]/5"
        : color === "accent"
        ? "border-[#7A84FF]/30 bg-[#7A84FF]/5"
        : "border-[#2A3035] bg-[#171C1F]"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        color === "success"
          ? "bg-[#34C759] text-black"
          : color === "warning"
          ? "bg-[#FF9500] text-black"
          : color === "accent"
          ? "bg-[#7A84FF] text-black"
          : "bg-[#1F2529] text-[#9CA3AF]"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-2xl font-bold transition-colors",
          color === "success" ? "text-[#34C759]" : 
          color === "warning" ? "text-[#FF9500]" : 
          color === "accent" ? "text-[#7A84FF]" : 
          "text-[#ECEDEF]"
        )}>
          {value}
        </p>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
        {subtext && <p className="text-[10px] text-[#9CA3AF]/70">{subtext}</p>}
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({ 
  title, 
  subtitle, 
  icon,
  badge
}: { 
  title: string; 
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: { text: string; color: "live" | "default" };
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F2529] text-[#7A84FF]">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-[#ECEDEF]">{title}</h2>
          {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          badge.color === "live" 
            ? "bg-[#34C759]/20 text-[#34C759]"
            : "bg-[#1F2529] text-[#9CA3AF]"
        )}>
          {badge.text}
        </span>
      )}
    </div>
  );
}

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
  const streamConfig = streamStatusConfig[stream.status];

  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Canlı Analiz" 
        description="Canlı maç listesi, olay akışı ve veri akışı durumu" 
      />

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Canlı Maç"
          value={liveMatches.length}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="success"
        />
        <StatCard
          label="Akış Modu"
          value={stream.mode.toUpperCase()}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="accent"
        />
        <StatCard
          label="Bağlantı"
          value={streamConfig.label}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          }
          color={stream.status === "live" ? "success" : stream.status === "connecting" ? "accent" : "default"}
        />
        <StatCard
          label="Son Güncelleme"
          value={formatDateTime(stream.lastUpdatedAt).split(" · ")[0]}
          subtext={`Mesaj: ${stream.messageCount}`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

      {/* Main Content */}
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Live Matches List */}
        <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
          <SectionHeader 
            title="Canlı Maç Listesi" 
            subtitle="Seçim yap, olay akışında anlık takip et"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            badge={{ text: `${liveMatches.length} Aktif`, color: "live" }}
          />
          
          <DataFeedback
            isLoading={liveQuery.isLoading}
            error={liveQuery.error as Error | undefined}
            isEmpty={liveMatches.length === 0}
            emptyTitle="Canlı maç bulunmuyor"
            emptyDescription="Şu an canlı istatistik akışı veren maç yok."
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
                    className={cn(
                      "rounded-xl text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A84FF]",
                      isSelected 
                        ? "ring-2 ring-[#34C759] ring-offset-2 ring-offset-[#171C1F]" 
                        : "hover:ring-1 hover:ring-[#2A3035]"
                    )}
                    aria-pressed={isSelected}
                    aria-label={`${match.homeTeamName} ve ${match.awayTeamName} maçını seç`}
                  >
                    <MatchCard match={match} />
                  </button>
                );
              })}
            </div>
          </DataFeedback>
        </div>

        {/* Events Timeline */}
        <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
          <SectionHeader 
            title="Canlı Olay Akışı" 
            subtitle={selectedMatch 
              ? `${selectedMatch.homeTeamName} vs ${selectedMatch.awayTeamName}`
              : "Seçili maçın olay akışı ve momentum güncellemeleri"
            }
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            badge={stream.status === "live" ? { text: "● Canlı", color: "live" } : undefined}
          />
          
          <DataFeedback
            isLoading={eventsQuery.isLoading}
            error={eventsQuery.error as Error | undefined}
            isEmpty={!eventsQuery.data?.data || eventsQuery.data.data.length === 0}
            isPartial={Boolean(selectedMatch) && (eventsQuery.data?.data ?? []).length < 2}
            emptyTitle="Olay verisi yok"
            emptyDescription="Seçili maç için olay akış kaydı yok."
            partialTitle="Kısıtlı canlı veri"
            partialDescription="Bu maç için şu an az sayıda olay verisi geliyor. Akış devam ettikçe güncellenecek."
            onRetry={() => void eventsQuery.refetch()}
            loadingCount={5}
            loadingVariant="list"
          >
            <MatchEventsTimeline
              events={eventsQuery.data?.data ?? []}
              isLive
              isStreaming={stream.status === "live"}
              lastUpdatedAt={stream.lastUpdatedAt}
              ariaLabel={selectedMatch ? `${selectedMatch.homeTeamName} - ${selectedMatch.awayTeamName} olay akışı` : "Canlı olay akışı"}
            />
          </DataFeedback>
        </div>
      </section>
    </div>
  );
}

