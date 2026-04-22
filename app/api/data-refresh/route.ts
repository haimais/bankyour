import { NextRequest, NextResponse } from "next/server";
import { runRefreshCycle, logRefreshStatus } from "@/lib/ingestion/dataRefresh";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for data collection

interface DataCollectionResponse {
  status: "success" | "partial" | "failed";
  message: string;
  timestamp: string;
  duration: number;
  summary: {
    productsCollected: number;
    newsCollected: number;
    countriesProcessed: number;
    fxUpdated: boolean;
  };
}

interface ErrorResponse {
  error: string;
}

type Response = DataCollectionResponse | ErrorResponse;

export async function GET(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.DATA_REFRESH_SECRET;

    // Simple auth check
    if (secret && (!authHeader || authHeader !== `Bearer ${secret}`)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[api] Starting manual data refresh cycle via API");

    const result = await runRefreshCycle();
    await logRefreshStatus(result.reports);

    // Calculate totals
    let totalProducts = 0;
    let totalNews = 0;

    for (const report of result.reports) {
      totalProducts += report.products.updated;
      totalNews += report.news.fetched;
    }

    const response: DataCollectionResponse = {
      status: result.status,
      message:
        result.status === "success"
          ? "Data refresh completed successfully"
          : result.status === "partial"
            ? "Data refresh completed with some errors"
            : "Data refresh failed",
      timestamp: new Date().toISOString(),
      duration: result.totalDuration,
      summary: {
        productsCollected: totalProducts,
        newsCollected: totalNews,
        countriesProcessed: result.reports.length,
        fxUpdated: result.fxRefresh.success
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[api] Data refresh error:", errorMsg);

    return NextResponse.json(
      {
        status: "failed",
        message: `Data refresh failed: ${errorMsg}`,
        timestamp: new Date().toISOString(),
        duration: 0,
        summary: {
          productsCollected: 0,
          newsCollected: 0,
          countriesProcessed: 0,
          fxUpdated: false
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint - allows triggering refresh with optional parameters
 */
export async function POST(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.DATA_REFRESH_SECRET;

    if (secret && (!authHeader || authHeader !== `Bearer ${secret}`)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    interface PostBody {
      force?: boolean;
    }
    let body: PostBody = {};
    try {
      body = (await request.json()) as PostBody;
    } catch {
      // No body is fine
    }

    const force = body.force === true;

    if (force) {
      console.log("[api] Force refresh triggered via POST");
    }

    // Same logic as GET
    const result = await runRefreshCycle();
    await logRefreshStatus(result.reports);

    let totalProducts = 0;
    let totalNews = 0;

    for (const report of result.reports) {
      totalProducts += report.products.updated;
      totalNews += report.news.fetched;
    }

    return NextResponse.json({
      status: result.status,
      message:
        result.status === "success"
          ? "Data refresh triggered and completed successfully"
          : "Data refresh completed with warnings",
      timestamp: new Date().toISOString(),
      duration: result.totalDuration,
      summary: {
        productsCollected: totalProducts,
        newsCollected: totalNews,
        countriesProcessed: result.reports.length,
        fxUpdated: result.fxRefresh.success
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[api] POST refresh error:", errorMsg);

    return NextResponse.json(
      {
        status: "failed",
        message: `Refresh trigger failed: ${errorMsg}`,
        timestamp: new Date().toISOString(),
        duration: 0,
        summary: {
          productsCollected: 0,
          newsCollected: 0,
          countriesProcessed: 0,
          fxUpdated: false
        }
      },
      { status: 500 }
    );
  }
}
