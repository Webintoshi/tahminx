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
        className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
      />
    );
  }

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[color:var(--surface-alt)] text-xs font-semibold text-[color:var(--muted)]">
      {placeholderLogo(name)}
    </span>
  );
}

export function MatchCard({ match }: { match: MatchListItem }) {
  const leagueName = match.leagueName || "Lig bilgisi yok";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{leagueName}</p>
          <p className="text-sm text-[color:var(--muted)]">
            {formatDateTime(match.kickoffAt)} - {getSportLabel(match.sportKey)}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </header>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-end gap-2">
          <p className="text-right font-semibold text-[color:var(--foreground)]">{match.homeTeamName || "Ev sahibi"}</p>
          <TeamToken name={match.homeTeamName || "EV"} logoUrl={match.homeLogoUrl} />
        </div>

        <p className="rounded-md border border-[var(--border)] px-2 py-1 text-sm font-semibold text-[color:var(--foreground)]">
          {safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}
        </p>

        <div className="flex items-center gap-2">
          <TeamToken name={match.awayTeamName || "DEP"} logoUrl={match.awayLogoUrl} />
          <p className="font-semibold text-[color:var(--foreground)]">{match.awayTeamName || "Deplasman"}</p>
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--muted)]">Guven skoru: {match.confidenceScore ?? "-"}%</p>
        <Link
          href={`/matches/${match.id}`}
          className="rounded-md px-1 text-sm font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        >
          Detay
        </Link>
      </footer>
    </article>
  );
}
