import { jsonEnvelope } from "@/lib/api/response";
import { performanceData } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(performanceData);
}

