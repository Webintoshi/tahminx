"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useModels } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

// Progress Bar Component
function ProgressBar({ value, label, color = "accent" }: { value: number; label: string; color?: "accent" | "success" | "warning" }) {
  const colorClasses = {
    accent: "bg-[#7A84FF]",
    success: "bg-[#34C759]",
    warning: "bg-[#FF9500]"
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#9CA3AF]">{label}</span>
        <span className={cn("font-semibold", color === "accent" ? "text-[#7A84FF]" : color === "success" ? "text-[#34C759]" : "text-[#FF9500]")}>%{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1F2529]">
        <div 
          className={cn("h-full rounded-full transition-all", colorClasses[color])} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// Model Card Component
function ModelCard({ model }: { model: { id: string; name: string; confidence: number; dataReliability: number; uncertainty: number; explanation: string } }) {
  return (
    <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5 transition-all hover:border-[#7A84FF]/30">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#ECEDEF]">{model.name}</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F2529] text-[#9CA3AF]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      <div className="space-y-4">
        <ProgressBar value={model.confidence} label="Model Güven Skoru" color="accent" />
        <ProgressBar value={model.dataReliability} label="Veri Güven Seviyesi" color="success" />
        <ProgressBar value={100 - model.uncertainty} label="Belirsizlik Göstergesi" color={model.uncertainty > 30 ? "warning" : "success"} />
      </div>
      
      <p className="mt-4 text-sm leading-relaxed text-[#9CA3AF]">{model.explanation}</p>
    </div>
  );
}

export default function ModelsPage() {
  const { data, error, isLoading, refetch } = useModels();
  const models = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Modeller ve Güven Skoru"
        description="Tahmin nasıl oluştu, veri güveni ve belirsizlik göstergesi"
      />

      {/* Info Banner */}
      <div className="rounded-2xl border border-[#7A84FF]/20 bg-[#7A84FF]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7A84FF]">
            <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-[#ECEDEF]">Nasıl Okunmalı?</h4>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Model confidence, data quality ve uncertainty birlikte değerlendirilmelidir. 
              Yüksek güven + düşük belirsizlik = daha güvenilir tahmin.
            </p>
          </div>
        </div>
      </div>

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={models.length === 0}
        emptyTitle="Model verisi yok"
        emptyDescription="Model kartları şu an listelenemiyor."
        onRetry={() => void refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </DataFeedback>
    </div>
  );
}
