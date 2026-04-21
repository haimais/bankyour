import { randomUUID } from "crypto";
import Redis from "ioredis";
import { getRedisUrl } from "@/lib/db/env";

let redis: Redis | null = null;
const localLocks = new Set<string>();

function getRedis(): Redis | null {
  if (redis) {
    return redis;
  }

  const url = getRedisUrl();
  if (!url) {
    return null;
  }

  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true
  });
  return redis;
}

async function runWithLocalLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  if (localLocks.has(key)) {
    return null;
  }

  localLocks.add(key);
  try {
    return await fn();
  } finally {
    localLocks.delete(key);
  }
}

export async function runWithDistributedLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const client = getRedis();
  if (!client) {
    return runWithLocalLock(key, fn);
  }

  await client.connect().catch(() => {
    // Ignore connect race errors and fallback to lock command attempt.
  });

  const token = randomUUID();
  const acquired = await client.set(key, token, "PX", ttlMs, "NX");
  if (!acquired) {
    return null;
  }

  try {
    return await fn();
  } finally {
    // Release lock only if we still own it.
    await client.eval(
      `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
      `,
      1,
      key,
      token
    ).catch(() => {
      // Lock expiration is acceptable during shutdown/network failures.
    });
  }
}

