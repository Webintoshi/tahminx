"use client";

import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { FeatureGroupCard } from "@/components/admin/FeatureGroupCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { useToast } from "@/components/providers/ToastProvider";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useFeatureLab } from "@/lib/hooks/use-api";
import type { FeatureGroup, FeatureSet } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

function FeatureLabPageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");
  const { showToast } = useToast();

  const featureLabQuery = useFeatureLab({ sport: filters.sport });
  const lab = featureLabQuery.data?.data;

  const [groupOverrides, setGroupOverrides] = useState<Record<string, FeatureGroup>>({});
  const [customFeatureSets, setCustomFeatureSets] = useState<FeatureSet[]>([]);
  const [activeFeatureSetIdOverride, setActiveFeatureSetIdOverride] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState("");
  const [templateId, setTemplateId] = useState("");

  const groups = useMemo(() => {
    const base = lab?.featureGroups ?? [];
    return base.map((group) => groupOverrides[group.id] ?? group);
  }, [groupOverrides, lab?.featureGroups]);

  const activeFeatureSetId = activeFeatureSetIdOverride ?? lab?.activeFeatureSetId ?? "";

  const featureSets = useMemo(() => {
    const base = lab?.featureSets ?? [];
    const mergedBase = base.map((set) => ({ ...set, isActive: set.id === activeFeatureSetId }));
    const mergedCustom = customFeatureSets.map((set) => ({ ...set, isActive: set.id === activeFeatureSetId }));
    return [...mergedCustom, ...mergedBase];
  }, [activeFeatureSetId, customFeatureSets, lab?.featureSets]);

  const filteredGroups = useMemo(
    () => groups.filter((group) => filters.sport === "all" || group.sportKey === filters.sport),
    [groups, filters.sport]
  );

  const filteredFeatureSets = useMemo(
    () => featureSets.filter((set) => filters.sport === "all" || set.sportKey === filters.sport),
    [featureSets, filters.sport]
  );

  const templates = useMemo(
    () => (lab?.templates ?? []).filter((item) => filters.sport === "all" || item.sportKey === filters.sport),
    [filters.sport, lab?.templates]
  );

  const toggleGroup = (groupId: string, enabled: boolean) => {
    const current = groups.find((group) => group.id === groupId);
    if (!current) return;

    setGroupOverrides((prev) => ({
      ...prev,
      [groupId]: {
        ...current,
        isEnabled: enabled,
        features: current.features.map((feature) => ({
          ...feature,
          enabled: enabled ? feature.enabled : false
        }))
      }
    }));
  };

  const toggleFeature = (groupId: string, featureKey: string, enabled: boolean) => {
    const current = groups.find((group) => group.id === groupId);
    if (!current) return;

    setGroupOverrides((prev) => ({
      ...prev,
      [groupId]: {
        ...current,
        features: current.features.map((feature) =>
          feature.key === featureKey ? { ...feature, enabled } : feature
        )
      }
    }));
  };

  const createFeatureSet = () => {
    const name = newSetName.trim();
    if (!name) {
      showToast({ tone: "error", title: "Feature set adi gerekli" });
      return;
    }

    const enabledFeatureKeys = filteredGroups
      .flatMap((group) => group.features)
      .filter((feature) => feature.enabled)
      .map((feature) => feature.key);

    if (enabledFeatureKeys.length === 0) {
      showToast({ tone: "error", title: "En az bir feature aktif olmali" });
      return;
    }

    const id = `fs-local-${Date.now()}`;
    const sport = filters.sport === "all" ? filteredGroups[0]?.sportKey ?? "football" : filters.sport;

    const created: FeatureSet = {
      id,
      sportKey: sport,
      name,
      template: templateId || null,
      featureKeys: enabledFeatureKeys,
      isActive: false,
      updatedAt: new Date().toISOString()
    };

    setCustomFeatureSets((current) => [created, ...current]);
    setNewSetName("");
    setTemplateId("");
    showToast({
      tone: "success",
      title: "Feature set olusturuldu",
      description: `${enabledFeatureKeys.length} feature secildi.`
    });
  };

  const setActiveFeatureSet = (featureSetId: string) => {
    setActiveFeatureSetIdOverride(featureSetId);
    showToast({ tone: "info", title: "Aktif feature set guncellendi" });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Feature Lab"
        description="Feature group toggle, set olusturma ve aktif feature set yonetimi"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Feature Group" value={String(filteredGroups.length)} />
        <MetricCard title="Feature Set" value={String(filteredFeatureSets.length)} />
        <MetricCard title="Active Set" value={activeFeatureSetId || "-"} tone="success" />
      </section>

      <FilterPanel
        primaryFilters={
          <>
            <select
              value={filters.sport}
              onChange={(event) => setFilters({ sport: event.target.value as "all" | "football" | "basketball" })}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="all">Tüm sporlar</option>
              <option value="football">Futbol</option>
              <option value="basketball">Basketbol</option>
            </select>

            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Template seç (opsiyonel)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>

            <input
              value={newSetName}
              onChange={(event) => setNewSetName(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] focus:border-[#7A84FF] focus:outline-none"
              placeholder="Yeni feature set adı"
            />

            <button
              type="button"
              onClick={createFeatureSet}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm font-semibold text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF]"
            >
              Feature Set Oluştur
            </button>
          </>
        }
        advancedFilters={<></>}
      />

      <DataFeedback
        isLoading={featureLabQuery.isLoading}
        error={featureLabQuery.error as Error | undefined}
        isEmpty={!lab}
        emptyTitle="Feature lab verisi bulunamadi"
        emptyDescription="Endpoint su an feature lab datasini dondurmuyor."
        onRetry={() => void featureLabQuery.refetch()}
        loadingVariant="list"
        loadingCount={4}
      >
        <SectionCard title="Feature Groups" subtitle="Enable/disable toggle ve feature bazli kontrol">
          {filteredGroups.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredGroups.map((group) => (
                <FeatureGroupCard
                  key={group.id}
                  group={group}
                  onToggleGroup={toggleGroup}
                  onToggleFeature={toggleFeature}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Feature group yok" description="Secili sport icin feature group tanimi bulunmuyor." />
          )}
        </SectionCard>

        <SectionCard title="Feature Sets" subtitle="Aktif set gostergesi ve set listesi">
          {filteredFeatureSets.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFeatureSets.map((set) => (
                <article key={set.id} className={`rounded-xl border p-4 ${set.id === activeFeatureSetId ? "border-[#34C759]/30 bg-[#34C759]/10" : "border-[#2A3035] bg-[#171C1F]"}`}>
                  <p className="text-sm font-semibold text-[#ECEDEF]">{set.name}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">Template: {set.template ?? "-"}</p>
                  <p className="text-xs text-[#9CA3AF]">Features: {set.featureKeys.length}</p>
                  <p className="text-xs text-[#9CA3AF]">Updated: {formatDateTime(set.updatedAt)}</p>
                  <button
                    type="button"
                    onClick={() => setActiveFeatureSet(set.id)}
                    className="mt-3 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF]"
                  >
                    {set.id === activeFeatureSetId ? "Aktif" : "Aktif Yap"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Feature set bulunamadi" description="Secili filtrelerde feature set listesi bos." />
          )}
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

export default function FeatureLabPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <FeatureLabPageContent />
    </Suspense>
  );
}
