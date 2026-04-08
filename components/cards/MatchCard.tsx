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
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 rounded-xl border border-[#2A3035] object-cover bg-[#1F2529]"
      />
    );
  }

  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A3035] bg-[#1F2529] text-sm font-bold text-[#7A84FF]">
      {placeholderLogo(name)}
    </span>
  );
}

export function MatchCard({ match }: { match: MatchListItem }) {
  const leagueName = match.leagueName || "Lig bilgisi yok";
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#2A3035] bg-gradient-to-br from-[#171C1F] to-[#1F2529] p-5 transition-all duration-300 hover:border-[#7A84FF]/50 hover:shadow-lg hover:shadow-[#7A84FF]/5">
      {isLive && (
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#34C759] to-[#34C759]/50" />
      )}

      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[#1F2529] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            {leagueName}
          </span>
          <span className="text-xs text-[#9CA3AF]">{formatDateTime(match.kickoffAt)}</span>
        </div>
        <StatusBadge status={match.status} />
      </header>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <TeamToken name={match.homeTeamName || "EV"} logoUrl={match.homeLogoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#ECEDEF]">{match.homeTeamName || "Ev sahibi"}</p>
            <p className="text-xs text-[#9CA3AF]">Ev sahibi</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {isLive || isCompleted ? (
            <>
              <div
                className={
                  isLive
                    ? "rounded-xl border border-[#34C759]/30 bg-[#34C759]/10 px-4 py-2 text-xl font-bold tracking-wider text-[#34C759]"
                    : "rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 py-2 text-xl font-bold tracking-wider text-[#ECEDEF]"
                }
              >
                {safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}
              </div>
              {isLive ? (
                <span className="mt-1 flex items-center gap-1 text-xs font-medium text-[#34C759]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34C759]" />
                  Canli
                </span>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] px-6 py-2 text-lg font-bold text-[#7A84FF]">
              VS
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-sm font-semibold text-[#ECEDEF]">{match.awayTeamName || "Deplasman"}</p>
            <p className="text-xs text-[#9CA3AF]">Deplasman</p>
          </div>
          <TeamToken name={match.awayTeamName || "DEP"} logoUrl={match.awayLogoUrl} />
        </div>
      </div>

      <footer className="mt-5 flex items-center justify-between border-t border-[#2A3035]/50 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-[#9CA3AF]">
              Guven: <span className="text-[#ECEDEF]">{match.confidenceScore ?? "-"}%</span>
            </span>
          </div>
          <span className="text-[#2A3035]">|</span>
          <span className="text-xs text-[#9CA3AF]">{getSportLabel(match.sportKey)}</span>
        </div>

        <Link
          href={`/matches/${match.id}`}
          className="group/btn flex items-center gap-1 rounded-lg bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#ECEDEF] transition-all hover:bg-[#7A84FF] hover:text-black"
        >
          Detay
          <svg className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </footer>
    </article>
  );
}
