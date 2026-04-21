import { NewsItem } from "@/lib/types";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CachedItem {
  expiresAt: number;
  item: NewsItem;
}

const byStableId = new Map<string, CachedItem>();
const byUrl = new Map<string, CachedItem>();

function isAlive(entry?: CachedItem): entry is CachedItem {
  return Boolean(entry && entry.expiresAt > Date.now());
}

export function cachePulseItems(items: NewsItem[]) {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  items.forEach((item) => {
    const stableId = item.stableId ?? item.id;
    const entry: CachedItem = {
      expiresAt,
      item: {
        ...item,
        stableId
      }
    };

    byStableId.set(stableId, entry);
    byUrl.set(item.url, entry);
    if (item.articleUrl) {
      byUrl.set(item.articleUrl, entry);
    }
    if (item.resolvedUrl) {
      byUrl.set(item.resolvedUrl, entry);
    }
  });
}

export function getPulseItemByStableId(stableId: string): NewsItem | null {
  const entry = byStableId.get(stableId);
  if (!isAlive(entry)) {
    if (entry) {
      byStableId.delete(stableId);
    }
    return null;
  }
  return entry.item;
}

export function getPulseItemByUrl(url: string): NewsItem | null {
  const entry = byUrl.get(url);
  if (!isAlive(entry)) {
    if (entry) {
      byUrl.delete(url);
    }
    return null;
  }
  return entry.item;
}
