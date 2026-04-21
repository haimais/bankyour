import { COUNTRY_LABELS } from "@/data/i18n";
import { Country, Locale, NewsItem } from "@/lib/types";
import { dedupeNews, parseFeedXml } from "@/lib/news/sources/rssTools";

interface TrustedFeedResult {
  items: NewsItem[];
  status: "healthy" | "degraded" | "down";
  errors: string[];
}

const REQUEST_TIMEOUT_MS = 8_000;
const GLOBAL_FEEDS = [
  "https://feeds.bbci.co.uk/news/business/rss.xml",
  "https://feeds.marketwatch.com/marketwatch/topstories/",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html",
  "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"
];

const LOCAL_FEEDS: Record<Country, string[]> = {
  russia: [
    "https://lenta.ru/rss/news/economics",
    "https://www.kommersant.ru/RSS/news.xml",
    "https://www.rbc.ru/v10/ajax/get-news-feed/project/rbcnewsline?limit=20"
  ],
  belarus: ["https://belta.by/rss/economics"],
  kazakhstan: ["https://www.inform.kz/ru/rss"],
  georgia: ["https://agenda.ge/en/rss"],
  armenia: ["https://armenpress.am/eng/rss/"],
  azerbaijan: ["https://azertag.az/rss"],
  uae: ["https://www.khaleejtimes.com/rss/uae"]
};

function getFeeds(country: Country, locale: Locale): string[] {
  const local = LOCAL_FEEDS[country] ?? [];
  const localeExtra =
    locale === "ru"
      ? ["https://www.finanz.ru/rss/news"]
      : ["https://finance.yahoo.com/news/rssindex"];
  const merged = [...local, ...GLOBAL_FEEDS, ...localeExtra];
  const deduplicated: string[] = [];
  const seen = new Set<string>();
  for (const feed of merged) {
    if (seen.has(feed)) {
      continue;
    }
    seen.add(feed);
    deduplicated.push(feed);
  }
  return deduplicated;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTrustedFeedNews(country: Country, locale: Locale): Promise<TrustedFeedResult> {
  const countryLabel = COUNTRY_LABELS.en[country];
  const feeds = getFeeds(country, locale).slice(0, 10);
  const settled = await Promise.allSettled(feeds.map((feed) => fetchText(feed)));
  const errors: string[] = [];
  const items: NewsItem[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...parseFeedXml(result.value, countryLabel, 12));
      return;
    }
    errors.push(`${feeds[index]}: ${result.reason instanceof Error ? result.reason.message : "failed"}`);
  });

  const merged = dedupeNews(items, 28);
  if (merged.length === 0) {
    return {
      items: [],
      status: "down",
      errors
    };
  }

  return {
    items: merged,
    status: errors.length === 0 ? "healthy" : "degraded",
    errors
  };
}
