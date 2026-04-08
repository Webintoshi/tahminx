import Link from "next/link";
import type { MatchListItem } from "@/types/api-contract";
import { formatDateTime, safeScore } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function RecentMatchesTable({ matches, showLeague = false }: { matches: MatchListItem[]; showLeague?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Maç</th>
            {showLeague ? (
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Lig</th>
            ) : null}
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Tarih</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Skor</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Detay</th>
          </tr>
        </thead>
        <tbody>
          {matches.length === 0 ? (
            <tr className="bg-[#171C1F]">
              <td colSpan={showLeague ? 5 : 4} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                Gösterilecek maç kaydı yok.
              </td>
            </tr>
          ) : (
            matches.map((match, index) => (
              <tr 
                key={match.id} 
                className={cn(
                  "transition-colors hover:bg-[#2A3035]/50",
                  index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]"
                )}
              >
                <td className="px-4 py-3.5 font-medium text-[#ECEDEF]">{match.homeTeamName} vs {match.awayTeamName}</td>
                {showLeague ? (
                  <td className="px-4 py-3.5 text-[#9CA3AF]">{match.leagueName}</td>
                ) : null}
                <td className="px-4 py-3.5 text-[#9CA3AF]">{formatDateTime(match.kickoffAt)}</td>
                <td className="px-4 py-3.5">
                  <span className="rounded-lg bg-[#000000] px-3 py-1 font-semibold text-[#ECEDEF]">
                    {safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/matches/${match.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[#7A84FF] transition-colors hover:bg-[#7A84FF]/10"
                  >
                    Aç
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
