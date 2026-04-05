import { jsonEnvelope } from "@/lib/api/response";
import { liveMatches } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(liveMatches);
}

