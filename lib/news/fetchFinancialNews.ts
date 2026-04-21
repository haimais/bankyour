import { COUNTRY_LABELS } from "@/data/i18n";
import { NEWS_MOCK } from "@/data/news";
import { Country, Locale, NewsItem } from "@/lib/types";
import { dedupeNews, getDomain } from "@/lib/news/sources/rssTools";
import { fetchTrustedFeedNews } from "@/lib/news/sources/trustedFeeds";
import { fetchYandexNews } from "@/lib/news/sources/yandexSearch";

const FEED_CACHE_TTL_MS = 2 * 60 * 1000;

interface CachedNews {
  expiresAt: number;
  payload: FinancialNewsResult;
}

interface FinancialNewsOptions {
  strictFinance?: boolean;
}

interface NewsProvidersHealth {
  yandex: "healthy" | "degraded" | "down";
  trustedFeeds: "healthy" | "degraded" | "down";
  fulltextExtractor: "healthy" | "degraded";
  lastSuccessfulFetch: string | null;
  lastError: string | null;
}

export interface FinancialNewsResult {
  items: NewsItem[];
  fallback: boolean;
  provider: "yandex+trusted" | "trusted" | "fallback";
  providerStatus: NewsProvidersHealth;
}

const cache = new Map<string, CachedNews>();
let providersHealth: NewsProvidersHealth = {
  yandex: "down",
  trustedFeeds: "down",
  fulltextExtractor: "healthy",
  lastSuccessfulFetch: null,
  lastError: null
};

function cacheKey(country: Country, locale: Locale, strictFinance: boolean) {
  return `${country}:${locale}:${strictFinance ? "strict" : "all"}`;
}

function createFallbackItems(country: Country, locale: Locale): NewsItem[] {
  const countryLabel = COUNTRY_LABELS.en[country];
  const now = Date.now();
  const currentYear = new Date(now).getUTCFullYear();
  const source = NEWS_MOCK.filter((item) => item.country === countryLabel || item.country === "Regional");

  return source.slice(0, 12).map((item, index) => ({
    ...item,
    id: `fallback-${country}-${index + 1}-${now}`,
    publishedAt: new Date(now - (index + 1) * 15 * 60 * 1000).toISOString(),
    title:
      locale === "ru"
        ? `Финансовая новость ${currentYear}: ${countryLabel}`
        : `${currentYear} financial update: ${countryLabel}`,
    summary:
      locale === "ru"
        ? "Резервный источник новостей. Для деталей откройте статью на сайте."
        : "Fallback source is active. Open the article for details.",
    canonicalUrl: item.url,
    articleUrl: item.url,
    sourceDomain: getDomain(item.url),
    imageUrl: item.imageUrl,
    openStatus: "fallback_only"
  }));
}

export function markFulltextExtractor(status: "healthy" | "degraded") {
  providersHealth = {
    ...providersHealth,
    fulltextExtractor: status
  };
}

export function getNewsProvidersHealth() {
  return { ...providersHealth };
}

const FINANCE_STRONG_DOMAINS = [
  "finance.yahoo.com",
  "bloomberg.com",
  "ft.com",
  "banki.ru",
  "cbr.ru",
  "frankmedia.ru",
  "vedomosti.ru",
  "interfax.ru",
  "reuters.com",
  "wsj.com"
];

const FINANCE_KEYWORDS = [
  "bank",
  "banking",
  "finance",
  "fintech",
  "loan",
  "mortgage",
  "deposit",
  "credit",
  "interest rate",
  "inflation",
  "earnings",
  "dividend",
  "liquidity",
  "stocks",
  "bond",
  "forex",
  "currency",
  "central bank",
  "банк",
  "банков",
  "финанс",
  "кредит",
  "ипотек",
  "вклад",
  "депозит",
  "ставк",
  "инфляц",
  "бирж",
  "валют",
  "центробанк",
  "цб",
  "ключевая ставка"
];

const NON_FINANCE_KEYWORDS = [
  "войн",
  "дрон",
  "пво",
  "ракет",
  "election",
  "sport",
  "football",
  "entertainment",
  "celebrity",
  "gossip",
  "fashion",
  "movie",
  "music",
  "concert",
  "game",
  "gaming",
  "chatgpt",
  "claude",
  "gemini",
  "crime",
  "murder"
];

function isFinanceNews(item: NewsItem): boolean {
  const domain = (item.sourceDomain ?? getDomain(item.url)).toLowerCase();
  const url = (item.articleUrl ?? item.url).toLowerCase();
  const text = `${item.title} ${item.summary} ${domain} ${url} ${item.tag ?? ""}`.toLowerCase();
  const hasFinanceKeyword = FINANCE_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasBlockedKeyword = NON_FINANCE_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasFinanceTag = /(banking|stocks|forex|crypto|fintech|банкинг|акции|форекс|крипто|финтех)/i.test(
    item.tag ?? ""
  );
  const isFinancePath =
    /(econom|financ|bank|market|currency|loan|mortgage|deposit|credit|бирж|финанс|эконом|банк|вклад|кредит|ипотек|ставк)/i.test(
      url
    );
  const isStrongDomain = FINANCE_STRONG_DOMAINS.some((allowed) => domain.endsWith(allowed));

  if (hasBlockedKeyword && !hasFinanceKeyword && !hasFinanceTag) {
    return false;
  }
  if (hasFinanceTag && (hasFinanceKeyword || isFinancePath || isStrongDomain)) {
    return true;
  }
  if (hasFinanceKeyword && (isFinancePath || isStrongDomain)) {
    return true;
  }
  if (isStrongDomain && isFinancePath) {
    return true;
  }
  return false;
}

export async function getFinancialNews(
  country: Country,
  locale: Locale,
  options?: FinancialNewsOptions
): Promise<FinancialNewsResult> {
  const strictFinance = options?.strictFinance !== false;
  const key = cacheKey(country, locale, strictFinance);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const [yandex, trusted] = await Promise.all([
    fetchYandexNews(country, locale),
    fetchTrustedFeedNews(country, locale)
  ]);

  const merged = dedupeNews([...yandex.items, ...trusted.items], 40);
  const filtered = strictFinance ? merged.filter(isFinanceNews).slice(0, 24) : merged.slice(0, 24);
  const hasYandex = yandex.items.length > 0;
  const successful = filtered.length > 0;

  if (successful) {
    providersHealth = {
      ...providersHealth,
      yandex: yandex.status,
      trustedFeeds: trusted.status,
      lastSuccessfulFetch: new Date().toISOString(),
      lastError: null
    };

    const payload: FinancialNewsResult = {
      items: filtered,
      fallback: false,
      provider: hasYandex ? "yandex+trusted" : "trusted",
      providerStatus: { ...providersHealth }
    };
    cache.set(key, {
      expiresAt: Date.now() + FEED_CACHE_TTL_MS,
      payload
    });
    return payload;
  }

  const fallbackItems = createFallbackItems(country, locale);
  providersHealth = {
    ...providersHealth,
    yandex: yandex.status,
    trustedFeeds: trusted.status,
    lastError: [yandex.error, ...trusted.errors].filter(Boolean).join(" | ") || "All sources failed"
  };

  const payload: FinancialNewsResult = {
    items: fallbackItems,
    fallback: true,
    provider: "fallback",
    providerStatus: { ...providersHealth }
  };
  cache.set(key, {
    expiresAt: Date.now() + FEED_CACHE_TTL_MS,
    payload
  });
  return payload;
}
