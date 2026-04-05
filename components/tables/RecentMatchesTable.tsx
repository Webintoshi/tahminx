import Link from "next/link";
import type { MatchListItem } from "@/types/api-contract";
import { formatDateTime, safeScore } from "@/lib/utils";

export function RecentMatchesTable({ matches }: { matches: MatchListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th scope="col" className="px-3 py-2">Mac</th>
            <th scope="col" className="px-3 py-2">Tarih</th>
            <th scope="col" className="px-3 py-2">Skor</th>
            <th scope="col" className="px-3 py-2">Detay</th>
          </tr>
        </thead>
        <tbody>
          {matches.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-sm text-[color:var(--muted)]">
                Gosterilecek mac kaydi yok.
              </td>
            </tr>
          ) : (
            matches.map((match) => (
              <tr key={match.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 text-[color:var(--foreground)]">{match.homeTeamName} vs {match.awayTeamName}</td>
                <td className="px-3 py-2 text-[color:var(--muted)]">{formatDateTime(match.kickoffAt)}</td>
                <td className="px-3 py-2">{safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/matches/${match.id}`}
                    className="text-[color:var(--accent)] hover:text-[color:var(--accent-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                  >
                    Ac
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

