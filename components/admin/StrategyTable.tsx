import type { ModelStrategy } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

export function StrategyTable({
  rows,
  busyId,
  onEdit,
  onToggle
}: {
  rows: ModelStrategy[];
  busyId?: string | null;
  onEdit: (item: ModelStrategy) => void;
  onToggle: (item: ModelStrategy, nextActive: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th className="px-3 py-2">Sport</th>
            <th className="px-3 py-2">League</th>
            <th className="px-3 py-2">Prediction Type</th>
            <th className="px-3 py-2">Primary Model</th>
            <th className="px-3 py-2">Fallback Model</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="px-3 py-2">{item.sportKey}</td>
              <td className="px-3 py-2">{item.leagueName ?? "-"}</td>
              <td className="px-3 py-2">{item.predictionType}</td>
              <td className="px-3 py-2 font-semibold text-[color:var(--foreground)]">{item.primaryModel}</td>
              <td className="px-3 py-2">{item.fallbackModel ?? "-"}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    item.isActive
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/35 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(item, !item.isActive)}
                    disabled={busyId === item.id}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    {busyId === item.id ? "Saving..." : item.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
