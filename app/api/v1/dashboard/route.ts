import { jsonEnvelope } from "@/lib/api/response";
import { dashboard } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(dashboard);
}

