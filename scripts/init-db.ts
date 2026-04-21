import { ensureDbSchema } from "@/lib/db/schema";

async function main() {
  await ensureDbSchema();
  console.log("[db] schema is ready");
}

void main().catch((error) => {
  console.error("[db] failed to initialize schema", error);
  process.exitCode = 1;
});

