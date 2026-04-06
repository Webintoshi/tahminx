import { getLeagueById } from "@/lib/api/mock-service";
import { jsonEnvelope, jsonNotFound } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;

  const { id } = await context.params;
  const league = getLeagueById(id);
  if (!league) return jsonNotFound("League not found");
  return jsonEnvelope(league);
}
