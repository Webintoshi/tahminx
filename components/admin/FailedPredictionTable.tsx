import Link from "next/link";
import type { FailedPredictionItem } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function FailedPredictionTable({ rows }: { rows: FailedPredictionItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Maç</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Prediction</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Actual</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Confidence</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Risk Flags</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Failure Reason</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Updated</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Detay</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr 
              key={item.id} 
              className={cn(
                "transition-colors hover:bg-[#2A3035]/50",
                index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]",
                (item.confidenceScore ?? 0) >= 75 && "border-l-2 border-l-[#FF9500]"
              )}
            >
              <td className="px-4 py-3.5 font-semibold text-[#ECEDEF]">{item.matchLabel}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.predictedResult}</td>
              <td className="px-4 py-3.5 font-medium text-[#ECEDEF]">{item.actualResult}</td>
              <td className="px-4 py-3.5">
                <span className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  (item.confidenceScore ?? 0) >= 75 
                    ? "bg-[#FF9500]/10 text-[#FF9500]" 
                    : "bg-[#1F2529] text-[#9CA3AF]"
                )}>
                  {item.confidenceScore == null ? "-" : `${item.confidenceScore}%`}
                </span>
              </td>
              <td className="px-4 py-3.5">
                {(item.riskFlags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(item.riskFlags ?? []).map((flag, flagIndex) => (
                      <span key={`${item.id}-${flagIndex}`} className="rounded-md border border-[#FF9500]/30 bg-[#FF9500]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#FF9500]">
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[#9CA3AF]">-</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.failureReasonSummary ?? "-"}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</td>
              <td className="px-4 py-3.5">
                <Link href={`/admin/predictions/failed/${item.id}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[#7A84FF] transition-colors hover:bg-[#7A84FF]/10">
                  İncele
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
