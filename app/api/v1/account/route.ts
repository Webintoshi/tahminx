import { jsonEnvelope } from "@/lib/api/response";
import { accountData } from "@/lib/api/mock-service";

export async function GET() {
  return jsonEnvelope(accountData);
}

