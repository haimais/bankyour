import { NextRequest, NextResponse } from "next/server";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { getAllCountrySnapshots, refreshAllSnapshots } from "@/lib/catalog/snapshotStore";
import { SourceRun } from "@/lib/types";

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const cycleId = `agentic-${Date.now()}`;

  try {
    await refreshAllSnapshots();
    const snapshots = await getAllCountrySnapshots();

    const sourceRuns: SourceRun[] = COUNTRY_OPTIONS.map((option) => {
      const countrySnapshot = snapshots.byCountry[option.value];
      const sourceHealth = countrySnapshot.sourceHealth;
      const status =
        sourceHealth.bankSites === "healthy" && sourceHealth.registries === "healthy"
          ? "ok"
          : sourceHealth.bankSites === "down" || sourceHealth.registries === "down"
            ? "failed"
            : "degraded";
      return {
        runId: `${cycleId}-${option.value}`,
        cycleId,
        source: "agentic_refresh",
        country: option.value,
        status,
        itemsFetched: countrySnapshot.products.length
      };
    });

    return NextResponse.json({
      cycleId,
      status: "completed",
      startedAt,
      currentSnapshotId: snapshots.currentSnapshotId,
      updatedAt: snapshots.updatedAt,
      sourceRuns
    });
  } catch (error) {
    console.error("Agentic refresh API error", error);
    return NextResponse.json(
      {
        cycleId,
        status: "failed",
        startedAt,
        error: "Failed to run agentic refresh"
      },
      { status: 500 }
    );
  }
}

