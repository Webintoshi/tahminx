import type { FeatureEntry } from "@/types/api-contract";

export function FeatureToggleList({
  items,
  onToggle,
  disabled
}: {
  items: FeatureEntry[];
  onToggle: (key: string, enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2">
          <div>
            <p className="text-sm text-[color:var(--foreground)]">{item.label}</p>
            <p className="text-xs text-[color:var(--muted)]">{item.key}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[color:var(--muted)]">
            <input
              type="checkbox"
              checked={item.enabled}
              disabled={disabled}
              onChange={(event) => onToggle(item.key, event.target.checked)}
            />
            {item.enabled ? "On" : "Off"}
          </label>
        </li>
      ))}
    </ul>
  );
}
