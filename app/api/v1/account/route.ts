import { accountData } from "@/lib/api/mock-service";
import { jsonEnvelope } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";

export async function GET(request: Request) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;
  return jsonEnvelope(accountData);
}
