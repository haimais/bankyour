import { ensureDbSchema } from "@/lib/db/schema";
import { isDatabaseEnabled } from "@/lib/db/env";
import { withPgClient } from "@/lib/db/postgres";
import { normalizeSearch } from "@/lib/search/smartSearch";
import { BankRegistryItem, Country, ProductItem, SnapshotSourceHealth } from "@/lib/types";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface PersistedCountrySnapshot {
  snapshotId: string;
  country: Country;
  updatedAt: string;
  products: ProductItem[];
  banks: BankRegistryItem[];
  sourceHealth: SnapshotSourceHealth;
}

export interface PersistedSnapshotState {
  currentSnapshotId: string;
  updatedAt: string;
  byCountry: Record<Country, PersistedCountrySnapshot>;
}

export interface SourceRunRecord {
  runId: string;
  cycleId: string;
  source: string;
  country: Country;
  status: "ok" | "degraded" | "failed";
  errorCode?: string;
  durationMs?: number;
  itemsFetched?: number;
  errorText?: string;
}

interface DbRegistryBankRow {
  canonical_bank_id: string;
  name: string;
  website: string;
  registry_status: string;
  regulator_source: string | null;
}

const CURRENT_SNAPSHOT_KEY = "current_snapshot_id";
const LAST_SUCCESSFUL_CYCLE_KEY = "last_successful_cycle";
const LOCAL_SNAPSHOT_PATH = path.join(process.cwd(), ".tmp", "snapshot-state.json");

interface LocalSnapshotPayload {
  state: PersistedSnapshotState;
  lastSuccessfulCycle: string;
}

async function readLocalSnapshotPayload(): Promise<LocalSnapshotPayload | null> {
  try {
    const raw = await fs.readFile(LOCAL_SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalSnapshotPayload;
    if (!parsed?.state?.currentSnapshotId || !parsed?.state?.byCountry) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeLocalSnapshotPayload(payload: LocalSnapshotPayload): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_SNAPSHOT_PATH), { recursive: true });
  await fs.writeFile(LOCAL_SNAPSHOT_PATH, JSON.stringify(payload), "utf8");
}

function asRegistryStatus(
  input: string | null | undefined
): "active" | "suspended" | "unknown" {
  if (input === "active" || input === "suspended") {
    return input;
  }
  return "unknown";
}

export function isSnapshotPersistenceEnabled(): boolean {
  return isDatabaseEnabled();
}

export async function loadSnapshotStateFromDb(): Promise<PersistedSnapshotState | null> {
  if (!isSnapshotPersistenceEnabled()) {
    const local = await readLocalSnapshotPayload();
    return local?.state ?? null;
  }

  await ensureDbSchema();
  return withPgClient(async (client) => {
    const stateRes = await client.query<{ state_value: string }>(
      "SELECT state_value FROM app_state WHERE state_key = $1 LIMIT 1",
      [CURRENT_SNAPSHOT_KEY]
    );
    const snapshotId = stateRes.rows[0]?.state_value;
    if (!snapshotId) {
      return null;
    }

    const snapshotRes = await client.query<{ payload_json: PersistedSnapshotState }>(
      "SELECT payload_json FROM snapshots WHERE snapshot_id = $1 LIMIT 1",
      [snapshotId]
    );
    const payload = snapshotRes.rows[0]?.payload_json;
    if (!payload) {
      return null;
    }

    return payload;
  });
}

export async function loadRegistryBanksFromDb(country: Country): Promise<
  Array<{
    id: string;
    name: string;
    website: string;
    registryStatus: "active" | "suspended" | "unknown";
    regulatorSource?: string;
  }>
> {
  if (!isSnapshotPersistenceEnabled()) {
    const local = await readLocalSnapshotPayload();
    const banks = local?.state.byCountry?.[country]?.banks ?? [];
    return banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      website: bank.website,
      registryStatus: asRegistryStatus(bank.registryStatus),
      regulatorSource: bank.regulatorSource
    }));
  }

  await ensureDbSchema();
  return withPgClient(async (client) => {
    const result = await client.query<DbRegistryBankRow>(
      `
      SELECT canonical_bank_id, name, website, registry_status, regulator_source
      FROM banks_registry
      WHERE country = $1
      ORDER BY name ASC
      `,
      [country]
    );

    return result.rows.map((row) => ({
      id: row.canonical_bank_id,
      name: row.name,
      website: row.website,
      registryStatus: asRegistryStatus(row.registry_status),
      regulatorSource: row.regulator_source ?? undefined
    }));
  });
}

export async function getLastSuccessfulCycleFromDb(): Promise<string | null> {
  if (!isSnapshotPersistenceEnabled()) {
    const local = await readLocalSnapshotPayload();
    return local?.lastSuccessfulCycle ?? null;
  }

  await ensureDbSchema();
  return withPgClient(async (client) => {
    const result = await client.query<{ state_value: string }>(
      "SELECT state_value FROM app_state WHERE state_key = $1 LIMIT 1",
      [LAST_SUCCESSFUL_CYCLE_KEY]
    );
    return result.rows[0]?.state_value ?? null;
  });
}

export async function saveSnapshotStateToDb(input: {
  state: PersistedSnapshotState;
  cycleId: string;
  sourceRuns?: SourceRunRecord[];
}): Promise<void> {
  if (!isSnapshotPersistenceEnabled()) {
    await writeLocalSnapshotPayload({
      state: input.state,
      lastSuccessfulCycle: input.cycleId
    });
    return;
  }

  await ensureDbSchema();

  await withPgClient(async (client) => {
    await client.query("BEGIN");

    try {
      await client.query(
        `
        INSERT INTO snapshots (snapshot_id, status, cycle_id, payload_json)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (snapshot_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          cycle_id = EXCLUDED.cycle_id,
          payload_json = EXCLUDED.payload_json,
          created_at = NOW()
        `,
        [
          input.state.currentSnapshotId,
          "published",
          input.cycleId,
          JSON.stringify(input.state)
        ]
      );

      await client.query(
        `
        INSERT INTO app_state (state_key, state_value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (state_key)
        DO UPDATE SET
          state_value = EXCLUDED.state_value,
          updated_at = NOW()
        `,
        [CURRENT_SNAPSHOT_KEY, input.state.currentSnapshotId]
      );

      await client.query(
        `
        INSERT INTO app_state (state_key, state_value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (state_key)
        DO UPDATE SET
          state_value = EXCLUDED.state_value,
          updated_at = NOW()
        `,
        [LAST_SUCCESSFUL_CYCLE_KEY, input.cycleId]
      );

      await client.query(
        "DELETE FROM snapshot_products WHERE snapshot_id = $1",
        [input.state.currentSnapshotId]
      );

      for (const [country, countrySnapshot] of Object.entries(input.state.byCountry) as Array<
        [Country, PersistedCountrySnapshot]
      >) {
        for (const bank of countrySnapshot.banks) {
          await client.query(
            `
            INSERT INTO banks_registry (
              country,
              canonical_bank_id,
              name,
              website,
              registry_status,
              regulator_source,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (country, canonical_bank_id)
            DO UPDATE SET
              name = EXCLUDED.name,
              website = EXCLUDED.website,
              registry_status = EXCLUDED.registry_status,
              regulator_source = EXCLUDED.regulator_source,
              updated_at = NOW()
            `,
            [
              country,
              bank.id,
              bank.name,
              bank.website,
              bank.registryStatus ?? "unknown",
              bank.regulatorSource ?? null
            ]
          );

          await client.query(
            `
            INSERT INTO search_index (
              entity_type,
              entity_id,
              lang,
              tsv,
              translit,
              tags_json,
              updated_at
            )
            VALUES (
              'bank',
              $1,
              'ru',
              to_tsvector('simple', $2),
              $3,
              '[]'::jsonb,
              NOW()
            )
            ON CONFLICT (entity_type, entity_id, lang)
            DO UPDATE SET
              tsv = EXCLUDED.tsv,
              translit = EXCLUDED.translit,
              updated_at = NOW()
            `,
            [
              bank.id,
              `${bank.name} ${bank.website}`,
              normalizeSearch(`${bank.name} ${bank.website}`)
            ]
          );
        }

        for (const product of countrySnapshot.products) {
          await client.query(
            `
            INSERT INTO products_normalized (
              product_id,
              canonical_bank_id,
              country,
              category,
              fields_json,
              source,
              source_url,
              quality_flags,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
            ON CONFLICT (product_id)
            DO UPDATE SET
              canonical_bank_id = EXCLUDED.canonical_bank_id,
              country = EXCLUDED.country,
              category = EXCLUDED.category,
              fields_json = EXCLUDED.fields_json,
              source = EXCLUDED.source,
              source_url = EXCLUDED.source_url,
              quality_flags = EXCLUDED.quality_flags,
              updated_at = NOW()
            `,
            [
              product.id,
              product.canonicalBankId ?? product.bankId,
              country,
              product.category,
              JSON.stringify(product),
              product.source,
              product.sourceUrl ?? product.url,
              product.qualityFlags ?? []
            ]
          );

          await client.query(
            `
            INSERT INTO search_index (
              entity_type,
              entity_id,
              lang,
              tsv,
              translit,
              tags_json,
              updated_at
            )
            VALUES (
              'product',
              $1,
              'ru',
              to_tsvector('simple', $2),
              $3,
              $4::jsonb,
              NOW()
            )
            ON CONFLICT (entity_type, entity_id, lang)
            DO UPDATE SET
              tsv = EXCLUDED.tsv,
              translit = EXCLUDED.translit,
              tags_json = EXCLUDED.tags_json,
              updated_at = NOW()
            `,
            [
              product.id,
              `${product.name} ${product.bankName} ${product.description}`,
              normalizeSearch(
                `${product.name} ${product.bankName} ${product.description}`
              ),
              JSON.stringify(product.aiTags ?? [])
            ]
          );

          await client.query(
            `
            INSERT INTO snapshot_products (snapshot_id, product_id, country)
            VALUES ($1, $2, $3)
            ON CONFLICT (snapshot_id, product_id) DO NOTHING
            `,
            [input.state.currentSnapshotId, product.id, country]
          );
        }
      }

      if (input.sourceRuns && input.sourceRuns.length > 0) {
        for (const run of input.sourceRuns) {
          await client.query(
            `
            INSERT INTO source_runs (
              run_id,
              cycle_id,
              source,
              country,
              status,
              error_code,
              duration_ms,
              items_fetched,
              started_at,
              finished_at,
              error_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
            ON CONFLICT (run_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              error_code = EXCLUDED.error_code,
              duration_ms = EXCLUDED.duration_ms,
              items_fetched = EXCLUDED.items_fetched,
              finished_at = NOW(),
              error_text = EXCLUDED.error_text
            `,
            [
              run.runId,
              run.cycleId,
              run.source,
              run.country,
              run.status,
              run.errorCode ?? null,
              run.durationMs ?? null,
              run.itemsFetched ?? 0,
              run.errorText ?? null
            ]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
