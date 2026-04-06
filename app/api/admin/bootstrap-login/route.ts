import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_EMAIL = "admin@tahminx.local";
const DEFAULT_PASSWORD = "Admin123!";
const DEFAULT_SUBJECT = "admin-bootstrap";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

const toBase64Url = (value: string) => Buffer.from(value).toString("base64url");

const signJwt = (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
};

const secureEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export async function POST(request: Request) {
  const accessSecret = process.env.ADMIN_BOOTSTRAP_ACCESS_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "ADMIN_BOOTSTRAP_DISABLED",
          message: "Admin bootstrap oturumu sunucuda etkin degil."
        }
      },
      { status: 503 }
    );
  }

  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? DEFAULT_EMAIL;
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? DEFAULT_PASSWORD;
  const subject = process.env.ADMIN_BOOTSTRAP_SUBJECT ?? DEFAULT_SUBJECT;

  let payload: { email?: string; password?: string } | null = null;
  try {
    payload = (await request.json()) as { email?: string; password?: string };
  } catch {
    payload = null;
  }

  const email = String(payload?.email ?? "");
  const password = String(payload?.password ?? "");

  if (!secureEqual(email, bootstrapEmail) || !secureEqual(password, bootstrapPassword)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Gecersiz admin giris bilgileri."
        }
      },
      { status: 401 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt(
    {
      sub: subject,
      email: bootstrapEmail,
      role: "admin",
      iat: now,
      exp: now + ACCESS_TTL_SECONDS
    },
    accessSecret
  );

  return NextResponse.json({
    success: true,
    data: {
      accessToken,
      refreshToken: "bootstrap"
    },
    meta: null,
    error: null
  });
}
