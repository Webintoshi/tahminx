import { getTeamById } from "@/lib/api/mock-service";
import { jsonEnvelope, jsonNotFound } from "@/lib/api/response";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const team = getTeamById(id);
  if (!team) return jsonNotFound("Team not found");
  return jsonEnvelope(team);
}

