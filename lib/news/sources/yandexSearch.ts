import { COUNTRY_LABELS } from "@/data/i18n";
import { Country, Locale, NewsItem } from "@/lib/types";
import { dedupeNews, getDomain, normalizeArticleUrl, parseFeedXml, stripHtml } from "@/lib/news/sources/rssTools";

interface YandexFetchResult {
  items: NewsItem[];
  status: "healthy" | "degraded" | "down";
  error?: string;
}

const REQUEST_TIMEOUT_MS = 8_000;

function buildSearchQuery(countryLabel: string, locale: Locale): string {
  if (locale === "ru") {
    return `${countryLabel} банки кредиты вклады ипотека финтех`;
  }
  return `${countryLabel} banking loans deposits mortgage fintech`;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
    clearTimeout(timeout);
  }
}

function parseYandexXml(xml: string, countryLabel: string): NewsItem[] {
  const items: NewsItem[] = [];
  const docRegex = /<doc>([\s\S]*?)<\/doc>/gi;
  let match = docRegex.exec(xml);
  while (match) {
    const block = match[1] ?? "";
    const url = stripHtml(block.match(/<url>([\s\S]*?)<\/url>/i)?.[1] ?? "");
    const title = stripHtml(
      block.match(/<headline>([\s\S]*?)<\/headline>/i)?.[1] ??
        block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ??
        ""
    );
    const summary = stripHtml(block.match(/<passages>([\s\S]*?)<\/passages>/i)?.[1] ?? "");
    const dateRaw = stripHtml(
      block.match(/<(pubdate|modtime|saved-copy-url)>([\s\S]*?)<\/(pubdate|modtime|saved-copy-url)>/i)?.[2] ??
        ""
    );

    const articleUrl = normalizeArticleUrl(url);
    const publishedAt = new Date(dateRaw || Date.now()).toISOString();
    if (!title || !articleUrl) {
      match = docRegex.exec(xml);
      continue;
    }

    items.push({
      id: "",
      title,
      summary: summary || title,
      tag: "Banking",
      country: countryLabel,
      publishedAt,
      url: articleUrl,
      articleUrl,
      canonicalUrl: articleUrl,
      sourceDomain: getDomain(articleUrl),
      openStatus: "ready"
    });

    match = docRegex.exec(xml);
  }
  return items;
}

async function fetchYandexXmlApi(country: Country, locale: Locale): Promise<NewsItem[]> {
  const user = process.env.YANDEX_XML_USER;
  const key = process.env.YANDEX_XML_KEY;
  if (!user || !key) {
    return [];
  }

  const countryLabel = COUNTRY_LABELS.en[country];
  const query = encodeURIComponent(buildSearchQuery(countryLabel, locale));
  const l10n = locale === "ru" ? "ru" : "en";
  const endpoint =
    `https://yandex.com/search/xml?user=${encodeURIComponent(user)}` +
    `&key=${encodeURIComponent(key)}` +
    `&query=${query}` +
    `&l10n=${encodeURIComponent(l10n)}` +
    "&sortby=tm.order%3Ddescending" +
    "&filter=none" +
    "&groupby=attr%3Dd.mode%3Ddeep.groups-on-page%3D30.docs-in-group%3D1";

  const xml = await fetchText(endpoint);
  return parseYandexXml(xml, countryLabel);
}

async function fetchYandexRss(country: Country): Promise<NewsItem[]> {
  const countryLabel = COUNTRY_LABELS.en[country];
  const endpoints = [
    "https://news.yandex.com/business.rss",
    "https://news.yandex.com/finance.rss",
    "https://news.yandex.ru/business.rss",
    "https://news.yandex.ru/finance.rss"
  ];

  const responses = await Promise.allSettled(endpoints.map((url) => fetchText(url)));
  const items = responses.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    return parseFeedXml(result.value, countryLabel, 16);
  });
  return items;
}

export async function fetchYandexNews(country: Country, locale: Locale): Promise<YandexFetchResult> {
  try {
    const [xmlItems, rssItems] = await Promise.all([
      fetchYandexXmlApi(country, locale).catch(() => []),
      fetchYandexRss(country).catch(() => [])
    ]);
    const merged = dedupeNews([...xmlItems, ...rssItems], 28);
    if (merged.length === 0) {
      return {
        items: [],
        status: "down",
        error: "Yandex source returned no fresh items"
      };
    }
    return {
      items: merged,
      status: xmlItems.length > 0 && rssItems.length > 0 ? "healthy" : "degraded"
    };
  } catch (error) {
    return {
      items: [],
      status: "down",
      error: error instanceof Error ? error.message : "Unknown yandex source error"
    };
  }
}

