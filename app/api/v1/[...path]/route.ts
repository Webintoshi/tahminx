import { jsonNotFound } from "@/lib/api/response";
import { proxyApiRequest } from "@/lib/api/server-proxy";

async function handle(request: Request) {
  const proxiedResponse = await proxyApiRequest(request);
  if (proxiedResponse) return proxiedResponse;
  return jsonNotFound("Route not available in mock mode");
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
