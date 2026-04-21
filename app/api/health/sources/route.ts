import { NextResponse } from "next/server";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { getAssistantHealth } from "@/lib/ai/assistantHealth";
import { getAllCountrySnapshots, getSnapshotRuntimeMeta } from "@/lib/catalog/snapshotStore";
import { getSravniHealth } from "@/lib/sources/sravniSession";
import { Country } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await getAllCountrySnapshots();
    const runtimeMeta = await getSnapshotRuntimeMeta();
    const sravni = getSravniHealth();
    const assistant = getAssistantHealth();

    const countries: Record<
      Country,
      {
        updatedAt: string;
        sourceHealth: {
          sravni: "healthy" | "degraded" | "down";
          bankSites: "healthy" | "degraded" | "down";
          registries: "healthy" | "degraded" | "down";
        };
        stale: boolean;
      }
    > = {} as Record<Country, {
      updatedAt: string;
      sourceHealth: {
        sravni: "healthy" | "degraded" | "down";
        bankSites: "healthy" | "degraded" | "down";
        registries: "healthy" | "degraded" | "down";
      };
      stale: boolean;
    }>;

    COUNTRY_OPTIONS.forEach((option) => {
      const snapshot = snapshots.byCountry[option.value];
      const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime();
      countries[option.value] = {
        updatedAt: snapshot.updatedAt,
        sourceHealth: {
          ...snapshot.sourceHealth,
          sravni
        },
        stale:
          !Number.isFinite(ageMs) ||
          (runtimeMeta.refreshIntervalMs > 0
            ? ageMs > runtimeMeta.refreshIntervalMs * 2
            : ageMs > 20 * 60_000)
      };
    });

    return NextResponse.json({
      currentSnapshotId: snapshots.currentSnapshotId,
      updatedAt: snapshots.updatedAt,
      cycleAgeSec: runtimeMeta.cycleAgeSec,
      refreshIntervalMs: runtimeMeta.refreshIntervalMs,
      lastSuccessfulCycle: runtimeMeta.lastSuccessfulCycle,
      sravni,
      assistant,
      countries
    });
  } catch (error) {
    console.error("Sources health API error", error);
    return NextResponse.json({ error: "Failed to load sources health" }, { status: 500 });
  }
}
