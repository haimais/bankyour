import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ACADEMY_LESSONS } from "@/data/academy";
import { getCatalogResponse } from "@/lib/catalog/snapshotStore";
import { getFinancialNews } from "@/lib/news/fetchFinancialNews";
import { normalizeSearch, rankByQuery } from "@/lib/search/smartSearch";
import { Country, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

function asCountry(input: string | null): Country {
  if (!input) return "russia";
  return COUNTRIES.includes(input as Country) ? (input as Country) : "russia";
}

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

const INTENTS_RU = [
  "лучшая дебетовая карта",
  "ипотека с низкой ставкой",
  "вклад на 6 месяцев",
  "кредит без залога",
  "налоги и вычеты",
  "обучение по облигациям"
];

const INTENTS_EN = [
  "best debit card",
  "low-rate mortgage",
  "6-month deposit",
  "consumer loan options",
  "taxes and deductions",
  "bond basics course"
];

function newsId(url: string) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 20);
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const q = (params.get("q") ?? "").trim();

    const [catalog, news] = await Promise.all([
      getCatalogResponse({ country, locale: lang, q: q || undefined, page: 1, pageSize: 24 }),
      getFinancialNews(country, lang)
    ]);

    const queryNorm = normalizeSearch(q);
    const searchableProducts = catalog.products.filter((item) => item.category !== "investments");
    const productHits = q
      ? rankByQuery(queryNorm, searchableProducts, (item) => `${item.name} ${item.bankName} ${item.aiSummary ?? ""}`)
          .slice(0, 8)
          .map((entry) => ({
            id: entry.item.id,
            title: entry.item.name,
            subtitle: entry.item.bankName,
            category: entry.item.category
          }))
      : searchableProducts.slice(0, 8).map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.bankName,
          category: item.category
        }));

    const newsHits = q
      ? rankByQuery(queryNorm, news.items, (item) => `${item.title} ${item.summary}`)
          .slice(0, 6)
          .map((entry) => ({
            id: newsId(entry.item.url),
            title: entry.item.title,
            subtitle: entry.item.summary,
            articleUrl: entry.item.articleUrl ?? entry.item.url
          }))
      : news.items.slice(0, 6).map((item) => ({
          id: newsId(item.url),
          title: item.title,
          subtitle: item.summary,
          articleUrl: item.articleUrl ?? item.url
        }));

    const academyHits = q
      ? rankByQuery(queryNorm, ACADEMY_LESSONS, (item) => `${item.title} ${item.summary} ${item.tags.join(" ")}`)
          .slice(0, 6)
          .map((entry) => ({
            id: entry.item.id,
            slug: entry.item.slug,
            title: entry.item.title,
            subtitle: entry.item.summary
          }))
      : ACADEMY_LESSONS.slice(0, 6).map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          subtitle: item.summary
        }));

    const suggestionPool = [
      ...searchableProducts.map((item) => item.name),
      ...news.items.map((item) => item.title),
      ...ACADEMY_LESSONS.map((item) => item.title),
      ...(lang === "ru" ? INTENTS_RU : INTENTS_EN)
    ];
    const suggestions = q
      ? rankByQuery(queryNorm, uniq(suggestionPool), (value) => value)
          .slice(0, 10)
          .map((entry) => entry.item)
      : uniq([...(lang === "ru" ? INTENTS_RU : INTENTS_EN), ...searchableProducts.map((item) => item.name)]).slice(0, 10);

    return NextResponse.json({
      query: q,
      suggestions,
      intents: (lang === "ru" ? INTENTS_RU : INTENTS_EN).slice(0, 6),
      groups: {
        products: productHits,
        news: newsHits,
        academy: academyHits
      }
    });
  } catch (error) {
    console.error("Search widget API error", error);
    return NextResponse.json({ error: "Failed to load search widget data" }, { status: 500 });
  }
}
