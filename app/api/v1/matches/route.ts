import type { MatchStatus, SportType } from "@/types/domain";
import { jsonEnvelope } from "@/lib/api/response";
import { queryMatches } from "@/lib/api/mock-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = (url.searchParams.get("sport") as SportType | "all" | null) ?? undefined;
  const league = url.searchParams.get("league") ?? undefined;
  const team = url.searchParams.get("team") ?? undefined;
  const status = (url.searchParams.get("status") as MatchStatus | "all" | null) ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;

  return jsonEnvelope(queryMatches({ sport, league, team, status, date }));
}

