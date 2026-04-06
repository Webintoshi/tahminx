import type { SportType } from "@/types/domain";
import { jsonEnvelope } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";
import { queryPredictions } from "@/lib/api/mock-service";

export async function GET(request: Request) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;

  const url = new URL(request.url);
  const sport = (url.searchParams.get("sport") as SportType | "all" | null) ?? undefined;
  const league = url.searchParams.get("league") ?? undefined;
  const risk = (url.searchParams.get("risk") as "all" | "low" | "medium" | "high" | null) ?? undefined;
  const type =
    (url.searchParams.get("type") as "all" | "winner" | "total-score" | "first-half" | "handicap" | null) ??
    undefined;

  return jsonEnvelope(queryPredictions({ sport, league, risk, type }));
}
