import type { LeagueListItem } from "@/types/api-contract";

export function LeagueSelector({
  value,
  leagues,
  onChange
}: {
  value: string;
  leagues: LeagueListItem[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-[color:var(--muted)]">League</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
      >
        <option value="">Lig sec</option>
        {leagues.map((league) => (
          <option key={league.id} value={league.id}>
            {league.name}
          </option>
        ))}
      </select>
    </label>
  );
}
