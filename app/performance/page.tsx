"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataFeedback } from "@/components/states/DataFeedback";
import { usePerformance } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((mod) => mod.LineChart), { ssr: false });
const BarChart = dynamic(() => import("@/components/charts/BarChart").then((mod) => mod.BarChart), { ssr: false });

// Stat Card Component
function StatCard({ label, value, subtext, trend }: { label: string; value: string; subtext?: string; trend?: "up" | "down" | "neutral" }) {
  const trendColors = {
    up: "text-[#34C759]",
    down: "text-[#FF3B30]",
    neutral: "text-[#9CA3AF]"
  };
  
  const trendIcons = {
    up: "↑",
    down: "↓",
    neutral: "→"
  };
  
  return (
    <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#ECEDEF]">{value}</span>
        {trend && <span className={cn("text-sm", trendColors[trend])}>{trendIcons[trend]}</span>}
      </div>
      {subtext && <p className="mt-1 text-xs text-[#9CA3AF]">{subtext}</p>}
    </div>
  );
}

// Chart Container Component
function ChartContainer({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#ECEDEF]">{title}</h3>
        {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function PerformancePage() {
  const { data, error, isLoading, refetch } = usePerformance();
  const performanceRows = data?.data ?? [];
  
  // Calculate averages
  const avgOverall = performanceRows.reduce((sum, item) => sum + item.overall, 0) / Math.max(performanceRows.length, 1);
  const avgFootball = performanceRows.reduce((sum, item) => sum + item.football, 0) / Math.max(performanceRows.length, 1);
  const avgBasketball = performanceRows.reduce((sum, item) => sum + item.basketball, 0) / Math.max(performanceRows.length, 1);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Performans"
        description="Geçmiş tahmin sonuçları, başarı oranı, analiz türü bazlı performans"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard 
          label="Genel Başarı" 
          value={`%${Math.round(avgOverall)}`} 
          subtext={`${performanceRows.length} dönem`}
          trend={avgOverall > 60 ? "up" : avgOverall < 40 ? "down" : "neutral"}
        />
        <StatCard 
          label="Futbol Ortalama" 
          value={`%${Math.round(avgFootball)}`}
          trend={avgFootball > avgOverall ? "up" : "neutral"}
        />
        <StatCard 
          label="Basketbol Ortalama" 
          value={`%${Math.round(avgBasketball)}`}
          trend={avgBasketball > avgOverall ? "up" : "neutral"}
        />
      </div>

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={performanceRows.length === 0}
        emptyTitle="Performans verisi yok"
        emptyDescription="Geçmiş performans kaydı bulunamadı."
        onRetry={() => void refetch()}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer title="Zaman İçinde Başarı Trendi" subtitle="Günlük / Haftalık / Aylık genel başarı çizgisi">
            <LineChart data={performanceRows.map((item) => ({ label: item.period, value: item.overall }))} />
          </ChartContainer>

          <ChartContainer title="Spor Türü Bazlı Karşılaştırma" subtitle="Futbol ve basketbol başarı oranları">
            <BarChart
              data={[
                { label: "Futbol", value: avgFootball },
                { label: "Basketbol", value: avgBasketball },
                { label: "Genel Ortalama", value: avgOverall }
              ]}
            />
          </ChartContainer>
        </div>

        {/* Performance Table */}
        <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
          <h3 className="mb-4 text-lg font-semibold text-[#ECEDEF]">Detaylı Performans</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A3035]">
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Dönem</th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Genel</th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Futbol</th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Basketbol</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row, index) => (
                  <tr key={row.period} className={cn(
                    "border-b border-[#2A3035]/50",
                    index % 2 === 1 ? "bg-[#1F2529]/50" : ""
                  )}>
                    <td className="py-3 text-[#ECEDEF]">{row.period}</td>
                    <td className="py-3">
                      <span className={cn(
                        "font-semibold",
                        row.overall >= 70 ? "text-[#34C759]" : row.overall >= 50 ? "text-[#7A84FF]" : "text-[#FF9500]"
                      )}>
                        %{Math.round(row.overall)}
                      </span>
                    </td>
                    <td className="py-3 text-[#9CA3AF]">%{Math.round(row.football)}</td>
                    <td className="py-3 text-[#9CA3AF]">%{Math.round(row.basketball)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataFeedback>
    </div>
  );
}
