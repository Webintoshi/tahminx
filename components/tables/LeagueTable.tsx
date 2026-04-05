import type { StandingRow } from "@/types/api-contract";
import { StandingsTable } from "@/components/tables/StandingsTable";

export function LeagueTable({ rows }: { rows: StandingRow[] }) {
  return <StandingsTable rows={rows} />;
}
