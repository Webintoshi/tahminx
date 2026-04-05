import type { LeagueListItem, SportKey } from "@/types/api-contract";

const sportOptions: Array<{ value: "all" | SportKey; label: string }> = [
  { value: "all", label: "Tum sporlar" },
  { value: "football", label: "Futbol" },
  { value: "basketball", label: "Basketbol" }
];

export function SportLeagueFilters({
  sport,
  leagueId,
  leagues,
  onChange
}: {
  sport: "all" | SportKey;
  leagueId: string;
  leagues: LeagueListItem[];
  onChange: (value: { sport?: "all" | SportKey; leagueId?: string }) => void;
}) {
  return (
    <>
      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Spor</span>
        <select
          value={sport}
          onChange={(event) => onChange({ sport: event.target.value as "all" | SportKey })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        >
          {sportOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Lig</span>
        <select
          value={leagueId}
          onChange={(event) => onChange({ leagueId: event.target.value })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        >
          <option value="">Tum ligler</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
