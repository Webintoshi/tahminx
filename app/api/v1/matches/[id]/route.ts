import { getMatchById } from "@/lib/api/mock-service";
import { jsonEnvelope, jsonNotFound } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;

  const { id } = await context.params;
  const match = getMatchById(id);
  if (!match) return jsonNotFound("Match not found");
  return jsonEnvelope(match);
}
