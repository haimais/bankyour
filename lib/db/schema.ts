import { isDatabaseEnabled } from "@/lib/db/env";
import { withPgClient } from "@/lib/db/postgres";

let schemaPromise: Promise<void> | null = null;

const DDL = [
  "CREATE EXTENSION IF NOT EXISTS pg_trgm",
  `
  CREATE TABLE IF NOT EXISTS app_state (
    state_key TEXT PRIMARY KEY,
    state_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banks_registry (
    country TEXT NOT NULL,
    canonical_bank_id TEXT NOT NULL,
    name TEXT NOT NULL,
    website TEXT NOT NULL,
    registry_status TEXT NOT NULL DEFAULT 'unknown',
    regulator_source TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (country, canonical_bank_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS bank_aliases (
    country TEXT NOT NULL,
    alias_name TEXT NOT NULL,
    canonical_bank_id TEXT NOT NULL,
    confidence NUMERIC(5,4) NOT NULL DEFAULT 0.8,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (country, alias_name)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS products_raw (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    source_item_id TEXT NOT NULL,
    country TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id TEXT
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS products_normalized (
    product_id TEXT PRIMARY KEY,
    canonical_bank_id TEXT NOT NULL,
    country TEXT NOT NULL,
    category TEXT NOT NULL,
    fields_json JSONB NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    quality_flags TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS product_ai_summaries (
    product_id TEXT NOT NULL,
    lang TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    model TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash TEXT NOT NULL,
    PRIMARY KEY (product_id, lang, content_hash)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS snapshots (
    snapshot_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'published',
    cycle_id TEXT,
    payload_json JSONB NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS snapshot_products (
    snapshot_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    country TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, product_id),
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(snapshot_id) ON DELETE CASCADE
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS source_runs (
    run_id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL,
    source TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT NOT NULL,
    error_code TEXT,
    duration_ms INTEGER,
    items_fetched INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_text TEXT
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS search_index (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    lang TEXT NOT NULL,
    tsv tsvector,
    translit TEXT,
    tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, entity_id, lang)
  )
  `,
  "CREATE INDEX IF NOT EXISTS idx_banks_registry_country ON banks_registry(country)",
  "CREATE INDEX IF NOT EXISTS idx_products_normalized_country_category ON products_normalized(country, category)",
  "CREATE INDEX IF NOT EXISTS idx_products_normalized_bank ON products_normalized(country, canonical_bank_id)",
  "CREATE INDEX IF NOT EXISTS idx_snapshot_products_country ON snapshot_products(country)",
  "CREATE INDEX IF NOT EXISTS idx_source_runs_cycle ON source_runs(cycle_id)",
  "CREATE INDEX IF NOT EXISTS idx_search_index_tsv ON search_index USING GIN(tsv)",
  "CREATE INDEX IF NOT EXISTS idx_search_index_translit ON search_index USING GIN(translit gin_trgm_ops)"
];

async function applySchema(): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  await withPgClient(async (client) => {
    for (const statement of DDL) {
      await client.query(statement);
    }
  });
}

export async function ensureDbSchema(): Promise<void> {
  if (!isDatabaseEnabled()) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = applySchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

