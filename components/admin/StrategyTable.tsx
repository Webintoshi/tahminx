import type { ModelStrategy } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sport</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">League</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Prediction Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Primary Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Fallback Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Updated</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr 
              key={item.id} 
              className={cn(
                "transition-colors hover:bg-[#2A3035]/50",
                index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]"
              )}
            >
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.sportKey}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.leagueName ?? "-"}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{item.predictionType}</td>
              <td className="px-4 py-3.5 font-semibold text-[#7A84FF]">{item.primaryModel}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.fallbackModel ?? "-"}</td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium",
                    item.isActive
                      ? "border-[#34C759]/30 bg-[#34C759]/10 text-[#34C759]"
                      : "border-[#FF9500]/30 bg-[#FF9500]/10 text-[#FF9500]"
                  )}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</td>
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(item, !item.isActive)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF] disabled:opacity-50"
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
