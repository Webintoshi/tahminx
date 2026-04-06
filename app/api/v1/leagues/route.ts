import type { SportType } from "@/types/domain";
import { getLeaguesBySport } from "@/lib/api/mock-service";
import { jsonEnvelope } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";

export async function GET(request: Request) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;

  const url = new URL(request.url);
  const sport = (url.searchParams.get("sport") as SportType | "all" | null) ?? undefined;
  return jsonEnvelope(getLeaguesBySport(sport));
}
