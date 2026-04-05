import { NextResponse } from "next/server";

export const jsonEnvelope = <T>(data: T) =>
  NextResponse.json({
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      source: "mock"
    }
  });

export const jsonNotFound = (message: string) => NextResponse.json({ error: message }, { status: 404 });

