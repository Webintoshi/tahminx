"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { usePerformance } from "@/lib/hooks/use-api";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((mod) => mod.LineChart), { ssr: false });
const BarChart = dynamic(() => import("@/components/charts/BarChart").then((mod) => mod.BarChart), { ssr: false });

export default function PerformancePage() {
  const { data, error, isLoading, refetch } = usePerformance();
  const performanceRows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performans"
        description="Gecmis tahmin sonuclari, basari orani, analiz turu bazli performans"
      />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={performanceRows.length === 0}
        emptyTitle="Performans verisi yok"
        emptyDescription="Gecmis performans kaydi bulunamadi."
        onRetry={() => void refetch()}
      >
        <SectionCard title="Gunluk / Haftalik / Aylik trend" subtitle="Overall basari cizgisi">
          <LineChart data={performanceRows.map((item) => ({ label: item.period, value: item.overall }))} />
        </SectionCard>

        <SectionCard title="Analiz turu bazli basari" subtitle="Futbol ve basketbol karsilastirmasi">
          <BarChart
            data={[
              {
                label: "Futbol ortalama",
                value: performanceRows.reduce((sum, item) => sum + item.football, 0) / Math.max(performanceRows.length, 1)
              },
              {
                label: "Basketbol ortalama",
                value: performanceRows.reduce((sum, item) => sum + item.basketball, 0) / Math.max(performanceRows.length, 1)
              },
              {
                label: "Genel ortalama",
                value: performanceRows.reduce((sum, item) => sum + item.overall, 0) / Math.max(performanceRows.length, 1)
              }
            ]}
          />
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

