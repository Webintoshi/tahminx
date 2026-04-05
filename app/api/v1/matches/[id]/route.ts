import { getMatchById } from "@/lib/api/mock-service";
import { jsonEnvelope, jsonNotFound } from "@/lib/api/response";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const match = getMatchById(id);
  if (!match) return jsonNotFound("Match not found");
  return jsonEnvelope(match);
}

