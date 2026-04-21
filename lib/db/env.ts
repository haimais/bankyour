const DEFAULT_REFRESH_MS = 15 * 60_000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getSnapshotRefreshMs(): number {
  return parsePositiveInt(process.env.SNAPSHOT_REFRESH_MS, DEFAULT_REFRESH_MS);
}

export function getDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isDatabaseEnabled(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getRedisUrl(): string | null {
  const value = process.env.REDIS_URL?.trim();
  return value ? value : null;
}

export function isRedisEnabled(): boolean {
  return Boolean(getRedisUrl());
}
