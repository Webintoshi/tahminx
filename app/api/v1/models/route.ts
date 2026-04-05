import { jsonEnvelope } from "@/lib/api/response";
import { modelData } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(modelData);
}

