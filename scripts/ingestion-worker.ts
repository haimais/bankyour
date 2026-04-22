import { ensureDbSchema } from "@/lib/db/schema";
import { getSnapshotRefreshMs } from "@/lib/db/env";
import { runWithDistributedLock } from "@/lib/db/redis";
import { refreshAllSnapshots } from "@/lib/catalog/snapshotStore";
import { runRefreshCycle, logRefreshStatus } from "@/lib/ingestion/dataRefresh";

const LOCK_KEY = "bankyour:refresh_cycle:lock";
const LOCK_TTL_MS = 9 * 60_000;
const refreshIntervalMs = getSnapshotRefreshMs();

async function runCycle(trigger: "startup" | "interval") {
  const startedAt = Date.now();
  const result = await runWithDistributedLock(LOCK_KEY, LOCK_TTL_MS, async () => {
    await ensureDbSchema();

    // Run snapshot refresh (existing logic)
    await refreshAllSnapshots();

    // Run enhanced data refresh (new logic)
    const refreshResult = await runRefreshCycle();
    await logRefreshStatus(refreshResult.reports);

    return refreshResult;
  });

  if (result == null) {
    console.log(
      `[worker] cycle skipped (${trigger}) - another worker holds lock`
    );
    return;
  }

  const duration = Date.now() - startedAt;
  console.log(
    `[worker] cycle completed (${trigger}): status=${result?.status || "unknown"}, duration=${duration}ms`
  );
}

async function main() {
  console.log(`[worker] starting ingestion worker, interval=${refreshIntervalMs}ms`);
  console.log(
    "[worker] features: bank scraping, FX updates, financial news collection"
  );

  // Run initial cycle on startup
  await runCycle("startup");

  // Schedule periodic cycles
  setInterval(() => {
    void runCycle("interval");
  }, refreshIntervalMs);

  console.log("[worker] worker is running and waiting for refresh schedule");
}

void main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exitCode = 1;
});
