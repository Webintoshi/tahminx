import Link from "next/link";
import type { MatchListItem } from "@/types/api-contract";
import { formatDateTime, safeScore } from "@/lib/utils";

export function RecentMatchesTable({ matches }: { matches: MatchListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529] text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
          <tr>
            <th scope="col" className="px-4 py-3">Maç</th>
            <th scope="col" className="px-4 py-3">Tarih</th>
            <th scope="col" className="px-4 py-3">Skor</th>
            <th scope="col" className="px-4 py-3 text-right">Detay</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A3035]">
          {matches.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#9CA3AF]">
                Gösterilecek maç kaydı yok.
              </td>
            </tr>
          ) : (
            matches.map((match) => (
              <tr key={match.id} className="hover:bg-[#1F2529]/50">
                <td className="px-4 py-3 font-medium text-[#ECEDEF]">{match.homeTeamName} vs {match.awayTeamName}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">{formatDateTime(match.kickoffAt)}</td>
                <td className="px-4 py-3 font-medium text-[#ECEDEF]">{safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/matches/${match.id}`}
                    className="font-medium text-[#7A84FF] transition-colors hover:text-[#8B94FF]"
                  >
                    Aç →
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
