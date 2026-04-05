import { jsonEnvelope } from "@/lib/api/response";
import { membershipData } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(membershipData);
}

