import { NewsItem } from "@/lib/types";

const MAX_NEWS_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripHtml(input: string): string {
  return decodeHtml(input).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return stripHtml(match?.[1] ?? "");
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`, "i");
  const match = xml.match(regex);
  return stripHtml(match?.[1] ?? "");
}

function getTag(title: string, summary?: string): NewsItem["tag"] {
  const value = `${title} ${summary ?? ""}`.toLowerCase();
  if (value.includes("crypto") || value.includes("bitcoin")) return "Crypto";
  if (value.includes("forex") || value.includes("fx")) return "Forex";
  if (value.includes("stock") || value.includes("equity") || value.includes("market")) return "Stocks";
  if (value.includes("fintech") || value.includes("digital")) return "Fintech";
  return "Banking";
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizeArticleUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // google redirect style
    const direct = parsed.searchParams.get("url");
    const out = direct ? new URL(decodeURIComponent(direct)) : parsed;
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ysclid", "gclid"].forEach(
      (key) => out.searchParams.delete(key)
    );
    out.hash = "";
    return out.toString();
  } catch {
    return url;
  }
}

function isFresh(publishedAt: string): boolean {
  const now = Date.now();
  const publishedAtMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedAtMs)) return false;
  const publishedYear = new Date(publishedAt).getUTCFullYear();
  const currentYear = new Date(now).getUTCFullYear();
  return now - publishedAtMs <= MAX_NEWS_AGE_MS && publishedYear >= currentYear;
}

function parseRssItem(rawItem: string, countryLabel: string): NewsItem | null {
  const title = extractTag(rawItem, "title");
  const link = extractTag(rawItem, "link");
  const description = extractTag(rawItem, "description");
  const pubDate = extractTag(rawItem, "pubDate");
  const sourceDomain = extractTag(rawItem, "source") || getDomain(link);
  const imageUrl =
    extractAttribute(rawItem, "media:content", "url") ||
    extractAttribute(rawItem, "media:thumbnail", "url");
  const articleUrl = normalizeArticleUrl(link);
  const publishedAt = new Date(pubDate || Date.now()).toISOString();

  if (!title || !articleUrl || !isFresh(publishedAt)) {
    return null;
  }

  return {
    id: "",
    title,
    summary: description || title,
    tag: getTag(title, description),
    country: countryLabel,
    publishedAt,
    url: articleUrl,
    articleUrl,
    canonicalUrl: articleUrl,
    sourceDomain,
    imageUrl: /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined,
    openStatus: "ready"
  };
}

function parseAtomEntry(rawEntry: string, countryLabel: string): NewsItem | null {
  const title = extractTag(rawEntry, "title");
  const summary = extractTag(rawEntry, "summary") || extractTag(rawEntry, "content");
  const updated = extractTag(rawEntry, "updated");
  const linkMatch = rawEntry.match(/<link[^>]+href="([^"]+)"[^>]*>/i);
  const link = stripHtml(linkMatch?.[1] ?? "");
  const articleUrl = normalizeArticleUrl(link);
  const publishedAt = new Date(updated || Date.now()).toISOString();

  if (!title || !articleUrl || !isFresh(publishedAt)) {
    return null;
  }

  return {
    id: "",
    title,
    summary: summary || title,
    tag: getTag(title, summary),
    country: countryLabel,
    publishedAt,
    url: articleUrl,
    articleUrl,
    canonicalUrl: articleUrl,
    sourceDomain: getDomain(articleUrl),
    openStatus: "ready"
  };
}

export function parseFeedXml(
  xml: string,
  countryLabel: string,
  limit = 24
): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch = itemRegex.exec(xml);

  while (itemMatch && items.length < limit) {
    const item = parseRssItem(itemMatch[1] ?? "", countryLabel);
    if (item) {
      items.push(item);
    }
    itemMatch = itemRegex.exec(xml);
  }

  if (items.length >= limit) {
    return items;
  }

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch = entryRegex.exec(xml);
  while (entryMatch && items.length < limit) {
    const item = parseAtomEntry(entryMatch[1] ?? "", countryLabel);
    if (item) {
      items.push(item);
    }
    entryMatch = entryRegex.exec(xml);
  }

  return items;
}

export function dedupeNews(items: NewsItem[], limit = 24): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  for (const item of sorted) {
    const key = normalizeArticleUrl(item.articleUrl ?? item.url);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      ...item,
      url: key,
      articleUrl: key,
      canonicalUrl: key
    });
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

