import { ensureDbSchema } from "@/lib/db/schema";
import { getSnapshotRefreshMs } from "@/lib/db/env";
import { runWithDistributedLock } from "@/lib/db/redis";
import { refreshAllSnapshots } from "@/lib/catalog/snapshotStore";

const LOCK_KEY = "bankyour:refresh_cycle:lock";
const LOCK_TTL_MS = 9 * 60_000;
const refreshIntervalMs = getSnapshotRefreshMs();

async function runCycle(trigger: "startup" | "interval") {
  const startedAt = Date.now();
  const result = await runWithDistributedLock(LOCK_KEY, LOCK_TTL_MS, async () => {
    await ensureDbSchema();
    await refreshAllSnapshots();
  });

  if (result == null) {
    console.log(
      `[worker] cycle skipped (${trigger}) - another worker holds lock`
    );
    return;
  }

  const duration = Date.now() - startedAt;
  console.log(`[worker] cycle completed (${trigger}) in ${duration}ms`);
}

async function main() {
  console.log(`[worker] starting ingestion worker, interval=${refreshIntervalMs}ms`);
  await runCycle("startup");

  setInterval(() => {
    void runCycle("interval");
  }, refreshIntervalMs);
}

void main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exitCode = 1;
});
