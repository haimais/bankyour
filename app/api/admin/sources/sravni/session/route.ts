import { NextRequest, NextResponse } from "next/server";
import { getSravniSession, setSravniSession } from "@/lib/sources/sravniSession";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.BANKYOUR_ADMIN_TOKEN;
  if (!expected) {
    return true;
  }

  const provided = request.headers.get("x-admin-token");
  return Boolean(provided && provided === expected);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      cookie?: string;
      ttlMinutes?: number;
    };

    const cookie = body.cookie?.trim();
    if (!cookie) {
      return NextResponse.json({ error: "cookie is required" }, { status: 400 });
    }

    const ttlMinutes =
      typeof body.ttlMinutes === "number" && Number.isFinite(body.ttlMinutes)
        ? Math.min(24 * 60, Math.max(5, Math.round(body.ttlMinutes)))
        : 120;

    setSravniSession({ cookie, ttlMinutes });
    const session = getSravniSession();

    return NextResponse.json({
      ok: true,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    console.error("Sravni session update API error", error);
    return NextResponse.json(
      { error: "Failed to update Sravni session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = getSravniSession();
  return NextResponse.json({
    cookiePresent: Boolean(session.cookie),
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt
  });
}

