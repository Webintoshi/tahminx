import type { LeagueListItem, SeasonListItem, TeamListItem } from "@/types/api-contract";
import type { TeamComparisonFormState } from "@/lib/team-comparison";
import { DataWindowSelector } from "@/components/team-comparison/DataWindowSelector";

export function TeamComparisonForm({
  form,
  teams,
  leagues,
  seasons,
  onChange,
  onSubmit,
  disabled,
  isSubmitting,
  validationMessage,
  isTeamsLoading,
  isLeaguesLoading,
  isSeasonsLoading
}: {
  form: TeamComparisonFormState;
  teams: TeamListItem[];
  leagues: LeagueListItem[];
  seasons: SeasonListItem[];
  onChange: (patch: Partial<TeamComparisonFormState>) => void;
  onSubmit: () => void;
  disabled: boolean;
  isSubmitting?: boolean;
  validationMessage?: string;
  isTeamsLoading?: boolean;
  isLeaguesLoading?: boolean;
  isSeasonsLoading?: boolean;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#ECEDEF]">Ev sahibi takim</span>
          <select
            aria-label="Ev sahibi takim"
            value={form.homeTeamId}
            onChange={(event) => onChange({ homeTeamId: event.target.value })}
            className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] outline-none focus:border-[#7A84FF]"
          >
            <option value="">{isTeamsLoading ? "Takimlar yukleniyor..." : "Takim sec"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#ECEDEF]">Deplasman takim</span>
          <select
            aria-label="Deplasman takim"
            value={form.awayTeamId}
            onChange={(event) => onChange({ awayTeamId: event.target.value })}
            className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] outline-none focus:border-[#7A84FF]"
          >
            <option value="">{isTeamsLoading ? "Takimlar yukleniyor..." : "Takim sec"}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#ECEDEF]">Lig</span>
          <select
            aria-label="Lig"
            value={form.leagueId}
            onChange={(event) => onChange({ leagueId: event.target.value, seasonId: "" })}
            className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] outline-none focus:border-[#7A84FF]"
          >
            <option value="">{isLeaguesLoading ? "Ligler yukleniyor..." : "Lig sec (opsiyonel)"}</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[#ECEDEF]">Sezon</span>
          <select
            aria-label="Sezon"
            value={form.seasonId}
            disabled={!form.leagueId}
            onChange={(event) => onChange({ seasonId: event.target.value })}
            className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] outline-none focus:border-[#7A84FF] disabled:opacity-60"
          >
            <option value="">
              {!form.leagueId ? "Once lig sec" : isSeasonsLoading ? "Sezonlar yukleniyor..." : "Sezon sec (opsiyonel)"}
            </option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 text-sm">
          <span className="font-medium text-[#ECEDEF]">Veri penceresi</span>
          <DataWindowSelector value={form.window} onChange={(value) => onChange({ window: value })} />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-h-5 text-sm text-[#9CA3AF]" role="status" aria-live="polite">
          {validationMessage || "Karsilastirma, secilen iki takim icin mevcut backend endpoint'ini kullanir."}
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#7A84FF] px-5 text-sm font-semibold text-black transition-colors hover:bg-[#8D95FF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Karsilastiriliyor..." : "Karsilastir"}
        </button>
      </div>
    </form>
  );
}
