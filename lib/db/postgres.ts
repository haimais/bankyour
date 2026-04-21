import { Pool, PoolClient } from "pg";
import { getDatabaseUrl } from "@/lib/db/env";

let pool: Pool | null = null;

function createPool(): Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
}

export function getPgPool(): Pool | null {
  if (pool === null) {
    pool = createPool();
  }
  return pool;
}

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pg = getPgPool();
  if (!pg) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = await pg.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

