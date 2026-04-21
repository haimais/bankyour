import { NextResponse } from "next/server";
import { getNewsProvidersHealth } from "@/lib/news/fetchFinancialNews";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = getNewsProvidersHealth();
    return NextResponse.json({
      ...health,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("News providers health API error", error);
    return NextResponse.json(
      {
        yandex: "down",
        trustedFeeds: "down",
        fulltextExtractor: "degraded",
        lastSuccessfulFetch: null,
        lastError: "Health probe failed",
        checkedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  }
}

