import type { FeatureGroup } from "@/types/api-contract";
import { FeatureToggleList } from "@/components/admin/FeatureToggleList";
import { formatDateTime } from "@/lib/utils";

export function FeatureGroupCard({
  group,
  onToggleGroup,
  onToggleFeature
}: {
  group: FeatureGroup;
  onToggleGroup: (groupId: string, enabled: boolean) => void;
  onToggleFeature: (groupId: string, featureKey: string, enabled: boolean) => void;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{group.name}</h3>
          <p className="text-xs text-[color:var(--muted)]">{group.description ?? "Aciklama bulunmuyor."}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
          <input
            type="checkbox"
            checked={group.isEnabled}
            onChange={(event) => onToggleGroup(group.id, event.target.checked)}
          />
          Group {group.isEnabled ? "On" : "Off"}
        </label>
      </div>

      <FeatureToggleList
        items={group.features}
        disabled={!group.isEnabled}
        onToggle={(featureKey, enabled) => onToggleFeature(group.id, featureKey, enabled)}
      />

      <p className="mt-3 text-xs text-[color:var(--muted)]">Updated: {formatDateTime(group.updatedAt)}</p>
    </article>
  );
}
