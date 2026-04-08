"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchCard } from "@/components/cards/MatchCard";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useMatches, usePredictions } from "@/lib/hooks/use-api";
import type { SportKey } from "@/types/api-contract";
import { cn } from "@/lib/utils";

const ComparisonRadarChart = dynamic(
  () => import("@/components/charts/ComparisonRadarChart").then((mod) => mod.ComparisonRadarChart),
  { ssr: false }
);

interface AnalysisModulePageProps {
  sport: SportKey;
  title: string;
  description: string;
  focusTitle: string;
}

// SVG Icons
const icons = {
  overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  preMatch: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  comparison: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  form: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  goal: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  ),
};

const navigationItems = [
  { href: "/football", label: "Genel Bakış", iconKey: "overview" as const },
  { href: "/football/pre-match", label: "Maç Ön Analiz", iconKey: "preMatch" as const },
  { href: "/football/team-comparison", label: "Takım Kıyasla", iconKey: "comparison" as const },
  { href: "/football/form-analysis", label: "Form", iconKey: "form" as const },
  { href: "/football/goal-expectation", label: "Gol Beklentisi", iconKey: "goal" as const },
];

// Section Header Component
function SectionHeader({ 
  title, 
  subtitle, 
  icon,
  action
}: { 
  title: string; 
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
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
      {action}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  color = "default"
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  color?: "default" | "success" | "accent";
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border p-4",
      color === "success"
        ? "border-[#34C759]/30 bg-[#34C759]/5"
        : color === "accent"
        ? "border-[#7A84FF]/30 bg-[#7A84FF]/5"
        : "border-[#2A3035] bg-[#171C1F]"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        color === "success"
          ? "bg-[#34C759] text-black"
          : color === "accent"
          ? "bg-[#7A84FF] text-black"
          : "bg-[#1F2529] text-[#9CA3AF]"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          "text-2xl font-bold",
          color === "success" ? "text-[#34C759]" : 
          color === "accent" ? "text-[#7A84FF]" : 
          "text-[#ECEDEF]"
        )}>
          {value}
        </p>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
      </div>
    </div>
  );
}

export function AnalysisModulePage({ sport, title, description, focusTitle }: AnalysisModulePageProps) {
  const pathname = usePathname();
  const [upcomingFrom] = useState(() => new Date().toISOString());
  const matchesQuery = useMatches({
    sport,
    status: "scheduled",
    from: upcomingFrom,
    pageSize: 8,
    sortBy: "kickoffAt",
    sortOrder: "asc"
  });
  const predictionsQuery = usePredictions({
    sport,
    pageSize: 8,
    sortBy: "confidenceScore",
    sortOrder: "desc"
  });

  const matches = (matchesQuery.data?.data ?? []).filter((match) => {
    const kickoffAt = Date.parse(match.kickoffAt);
    return Number.isNaN(kickoffAt) ? false : kickoffAt >= Date.parse(upcomingFrom);
  });
  const predictions = predictionsQuery.data?.data ?? [];

  // Yüksek güvenli tahmin sayısı
  const highConfidenceCount = predictions.filter(p => (p.confidenceScore ?? 0) >= 75).length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={title} description={description} />

      {/* Quick Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Yaklaşan Maç"
          value={matches.length}
          color="accent"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Model Tahmini"
          value={predictions.length}
          color="success"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Yüksek Güven"
          value={highConfidenceCount}
          color="success"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </section>

      {/* Navigation */}
      <nav className="flex flex-wrap gap-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const icon = icons[item.iconKey];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#7A84FF] text-black"
                  : "border border-[#2A3035] bg-[#171C1F] text-[#9CA3AF] hover:border-[#7A84FF]/50 hover:text-[#ECEDEF]"
              )}
            >
              <span className={cn("transition-colors", isActive ? "text-black" : "text-[#7A84FF]")}>{icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Radar Chart Section */}
      <section className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
        <SectionHeader 
          title={focusTitle} 
          subtitle="Model katmanında öne çıkan ana metrikler"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
        />
        <div className="flex justify-center py-4">
          <ComparisonRadarChart
            values={[
              { label: "Form", home: 78, away: 64 },
              { label: "Hücum", home: 82, away: 71 },
              { label: "Savunma", home: 74, away: 69 },
              { label: "Tempo", home: sport === "basketball" ? 80 : 61, away: sport === "basketball" ? 74 : 58 },
              { label: "Derinlik", home: 70, away: 66 }
            ]}
          />
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
        <SectionHeader 
          title="Yaklaşan Maçlar" 
          subtitle="Ön analiz ve form katmanı ile hazırlandı"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <DataFeedback
          isLoading={matchesQuery.isLoading}
          error={matchesQuery.error as Error | undefined}
          isEmpty={matches.length === 0}
          emptyTitle="Maç bulunamadı"
          emptyDescription="Seçili filtreye uygun analiz edilecek maç yok."
          onRetry={() => void matchesQuery.refetch()}
          loadingCount={4}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.slice(0, 4).map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </DataFeedback>
      </section>

      {/* Predictions */}
      <section className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
        <SectionHeader 
          title="Model Tahminleri" 
          subtitle="Güven skoru sıralamasına göre - En yüksek güvenli tahminler önde"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          action={
            <Link 
              href="/predictions"
              className="flex items-center gap-1 rounded-lg bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#7A84FF] transition-colors hover:bg-[#7A84FF]/10"
            >
              <span>Tümünü Gör</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          }
        />
        <DataFeedback
          isLoading={predictionsQuery.isLoading}
          error={predictionsQuery.error as Error | undefined}
          isEmpty={predictions.length === 0}
          emptyTitle="Tahmin bulunamadı"
          emptyDescription="Bu spor türü için tahmin bulunmuyor."
          onRetry={() => void predictionsQuery.refetch()}
          loadingCount={4}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {predictions.slice(0, 4).map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />)}
          </div>
        </DataFeedback>
      </section>
    </div>
  );
}
