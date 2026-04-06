import type { StandingRow } from "@/types/api-contract";
import { cn } from "@/lib/utils";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">#</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Takım</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">O</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">G</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">B</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">M</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">P</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="bg-[#171C1F]">
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                Puan tablosu verisi bulunmuyor.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr 
                key={row.teamId} 
                className={cn(
                  "transition-colors hover:bg-[#2A3035]/50",
                  index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]",
                  row.position <= 3 && "border-l-2 border-l-[#7A84FF]"
                )}
              >
                <td className="px-4 py-3.5 font-medium text-[#9CA3AF]">{row.position}</td>
                <td className="px-4 py-3.5 font-semibold text-[#ECEDEF]">{row.teamName}</td>
                <td className="px-4 py-3.5 text-center text-[#ECEDEF]">{row.played}</td>
                <td className="px-4 py-3.5 text-center text-[#34C759]">{row.won}</td>
                <td className="px-4 py-3.5 text-center text-[#FF9500]">{row.drawn}</td>
                <td className="px-4 py-3.5 text-center text-[#FF3B30]">{row.lost}</td>
                <td className="px-4 py-3.5 text-center font-bold text-[#7A84FF]">{row.points}</td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1">
                    {(row.form ?? []).length > 0 ? (
                      (row.form ?? []).map((item, formIndex) => (
                        <span
                          key={`${row.teamId}-${formIndex}`}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                            item === "W"
                              ? "bg-[#34C759] text-black"
                              : item === "D"
                                ? "bg-[#FF9500] text-black"
                                : "bg-[#FF3B30] text-white"
                          }`}
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">-</span>
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
