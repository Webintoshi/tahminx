import { z } from "zod";
import { apiEnvelopeSchema } from "@/lib/api/schemas";
import { env, normalizeBrowserUrl } from "@/lib/config/env";

const makeUrl = (path: string) => {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return normalizeBrowserUrl(`${base}${safePath}`);
};

export async function getJson<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit) {
  const response = await fetch(makeUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload = await response.json();
  const parsed = apiEnvelopeSchema(schema).safeParse(payload);

  if (!parsed.success) {
    throw new Error(`Schema validation failed: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }

  return (parsed.data as { data: z.infer<T> }).data;
}
