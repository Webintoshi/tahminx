import type { StandingRow } from "@/types/api-contract";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th scope="col" className="px-3 py-2">#</th>
            <th scope="col" className="px-3 py-2">Takim</th>
            <th scope="col" className="px-3 py-2">O</th>
            <th scope="col" className="px-3 py-2">G</th>
            <th scope="col" className="px-3 py-2">B</th>
            <th scope="col" className="px-3 py-2">M</th>
            <th scope="col" className="px-3 py-2">P</th>
            <th scope="col" className="px-3 py-2">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-4 text-center text-sm text-[color:var(--muted)]">
                Puan tablosu verisi bulunmuyor.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.teamId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 text-[color:var(--muted)]">{row.position}</td>
                <td className="px-3 py-2 font-semibold text-[color:var(--foreground)]">{row.teamName}</td>
                <td className="px-3 py-2">{row.played}</td>
                <td className="px-3 py-2">{row.won}</td>
                <td className="px-3 py-2">{row.drawn}</td>
                <td className="px-3 py-2">{row.lost}</td>
                <td className="px-3 py-2 font-semibold text-[color:var(--accent-2)]">{row.points}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {(row.form ?? []).length > 0 ? (
                      (row.form ?? []).map((item, index) => (
                        <span
                          key={`${row.teamId}-${index}`}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                            item === "W"
                              ? "bg-emerald-500/70 text-emerald-100"
                              : item === "D"
                                ? "bg-amber-500/70 text-amber-100"
                                : "bg-rose-500/70 text-rose-100"
                          }`}
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[color:var(--muted)]">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

