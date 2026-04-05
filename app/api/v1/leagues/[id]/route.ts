import { getLeagueById } from "@/lib/api/mock-service";
import { jsonEnvelope, jsonNotFound } from "@/lib/api/response";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const league = getLeagueById(id);
  if (!league) return jsonNotFound("League not found");
  return jsonEnvelope(league);
}

