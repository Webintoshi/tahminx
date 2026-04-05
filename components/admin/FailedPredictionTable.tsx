import Link from "next/link";
import type { FailedPredictionItem } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

const confidenceClass = (confidence?: number | null) => {
  if ((confidence ?? 0) >= 75) return "border-amber-500/45 bg-amber-500/10";
  return "border-[var(--border)] bg-[color:var(--surface)]";
};

export function FailedPredictionTable({ rows }: { rows: FailedPredictionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th className="px-3 py-2">Mac</th>
            <th className="px-3 py-2">Prediction</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Risk Flags</th>
            <th className="px-3 py-2">Failure Reason</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Detay</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className={`border-t ${confidenceClass(item.confidenceScore)}`}>
              <td className="px-3 py-2 font-semibold text-[color:var(--foreground)]">{item.matchLabel}</td>
              <td className="px-3 py-2">{item.predictedResult}</td>
              <td className="px-3 py-2">{item.actualResult}</td>
              <td className="px-3 py-2">{item.confidenceScore == null ? "-" : `${item.confidenceScore}%`}</td>
              <td className="px-3 py-2">
                {(item.riskFlags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(item.riskFlags ?? []).map((flag, index) => (
                      <span key={`${item.id}-${index}`} className="rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-200">
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-2">{item.failureReasonSummary ?? "-"}</td>
              <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
              <td className="px-3 py-2">
                <Link href={`/admin/predictions/failed/${item.id}`} className="text-[color:var(--accent)] underline underline-offset-2">
                  Incele
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
