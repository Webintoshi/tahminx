import type { FeatureSet, LeagueListItem } from "@/types/api-contract";
import { ModelSelector } from "@/components/admin/ModelSelector";
import { LeagueSelector } from "@/components/admin/LeagueSelector";

export interface ExperimentDraft {
  modelVersion: string;
  featureSetId: string;
  leagueId: string;
  from: string;
  to: string;
}

export function ExperimentForm({
  modelOptions,
  featureSets,
  leagues,
  draft,
  running,
  onChange,
  onSubmit
}: {
  modelOptions: string[];
  featureSets: FeatureSet[];
  leagues: LeagueListItem[];
  draft: ExperimentDraft;
  running?: boolean;
  onChange: (next: Partial<ExperimentDraft>) => void;
  onSubmit: () => void;
}) {
  const disabled =
    running ||
    !draft.modelVersion ||
    !draft.featureSetId ||
    !draft.leagueId ||
    !draft.from ||
    !draft.to;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ModelSelector value={draft.modelVersion} options={modelOptions} onChange={(value) => onChange({ modelVersion: value })} />

      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Feature set</span>
        <select
          value={draft.featureSetId}
          onChange={(event) => onChange({ featureSetId: event.target.value })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        >
          <option value="">Feature set sec</option>
          {featureSets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </label>

      <LeagueSelector value={draft.leagueId} leagues={leagues} onChange={(value) => onChange({ leagueId: value })} />

      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">From</span>
        <input
          type="date"
          value={draft.from}
          onChange={(event) => onChange({ from: event.target.value })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">To</span>
        <input
          type="date"
          value={draft.to}
          onChange={(event) => onChange({ to: event.target.value })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm font-semibold disabled:opacity-60"
        >
          {running ? "Calisiyor..." : "Experiment Baslat"}
        </button>
      </div>
    </div>
  );
}
