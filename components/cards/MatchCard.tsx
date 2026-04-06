import Image from "next/image";
import Link from "next/link";
import type { MatchListItem } from "@/types/api-contract";
import { formatDateTime, getSportLabel, placeholderLogo, safeScore } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

function TeamToken({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={32}
        height={32}
        unoptimized
        className="h-8 w-8 rounded-lg border border-[#2A3035] object-cover"
      />
    );
  }

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-xs font-semibold text-[#9CA3AF]">
      {placeholderLogo(name)}
    </span>
  );
}

export function MatchCard({ match }: { match: MatchListItem }) {
  const leagueName = match.leagueName || "Lig bilgisi yok";

  return (
    <article className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4 transition-colors hover:border-[#3A4047]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{leagueName}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            {formatDateTime(match.kickoffAt)} · {getSportLabel(match.sportKey)}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </header>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-end gap-2">
          <p className="text-right text-sm font-medium text-[#ECEDEF]">{match.homeTeamName || "Ev sahibi"}</p>
          <TeamToken name={match.homeTeamName || "EV"} logoUrl={match.homeLogoUrl} />
        </div>

        <div className="rounded-lg border border-[#2A3035] bg-[#000000] px-3 py-1.5 text-sm font-semibold text-[#ECEDEF]">
          {safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}
        </div>

        <div className="flex items-center gap-2">
          <TeamToken name={match.awayTeamName || "DEP"} logoUrl={match.awayLogoUrl} />
          <p className="text-sm font-medium text-[#ECEDEF]">{match.awayTeamName || "Deplasman"}</p>
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[#9CA3AF]">Güven skoru: {match.confidenceScore ?? "-"}%</p>
        <Link
          href={`/matches/${match.id}`}
          className="rounded-lg px-2 py-1 text-sm font-medium text-[#7A84FF] transition-colors hover:text-[#8B94FF]"
        >
          Detay →
        </Link>
      </footer>
    </article>
  );
}
