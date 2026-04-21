import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ACADEMY_LESSONS, buildAcademySearchText, getAcademyModuleBySlug } from "@/data/academy";
import { isDatabaseEnabled } from "@/lib/db/env";
import { withPgClient } from "@/lib/db/postgres";
import { getBanksSnapshot, getCatalogResponse } from "@/lib/catalog/snapshotStore";
import { translateText } from "@/lib/news/articleTools";
import { getFinancialNews } from "@/lib/news/fetchFinancialNews";
import { normalizeSearch, rankByQuery, scoreMatch } from "@/lib/search/smartSearch";
import { Country, Locale, SearchResponse } from "@/lib/types";

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

function buildSuggestions(query: string, values: string[]) {
  const unique = new Set(values.filter(Boolean));
  const ranked = Array.from(unique)
    .map((value) => ({
      value,
      score: rankByQuery(query, [value], (item) => item)[0]?.score ?? 0
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 8).map((item) => item.value);
}

function uniqueReasons<T extends string>(items: Array<T | null | undefined | false>): T[] {
  return Array.from(new Set(items.filter(Boolean) as T[]));
}

function newsId(url: string) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 20);
}

async function fetchDbSearchBoost(query: string): Promise<{
  banks: Map<string, number>;
  products: Map<string, number>;
}> {
  if (!isDatabaseEnabled()) {
    return {
      banks: new Map<string, number>(),
      products: new Map<string, number>()
    };
  }

  try {
    return await withPgClient(async (client) => {
      const banks = new Map<string, number>();
      const products = new Map<string, number>();
      const result = await client.query<{
        entity_type: string;
        entity_id: string;
        score: number;
      }>(
        `
        SELECT
          entity_type,
          entity_id,
          (
            ts_rank(tsv, plainto_tsquery('simple', $1))
            + similarity(translit, $2)
          ) AS score
        FROM search_index
        WHERE entity_type IN ('bank', 'product')
          AND lang = 'ru'
          AND (
            tsv @@ plainto_tsquery('simple', $1)
            OR similarity(translit, $2) > 0.2
          )
        ORDER BY score DESC
        LIMIT 300
        `,
        [query, normalizeSearch(query)]
      );

      result.rows.forEach((row) => {
        const numericScore = Number(row.score) || 0;
        if (row.entity_type === "bank") {
          banks.set(row.entity_id, numericScore);
        } else if (row.entity_type === "product") {
          products.set(row.entity_id, numericScore);
        }
      });

      return {
        banks,
        products
      };
    });
  } catch {
    return {
      banks: new Map<string, number>(),
      products: new Map<string, number>()
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const q = (params.get("q") ?? "").trim();
    const includeBanks =
      params.get("includeBanks") === "1" || params.get("includeBanks") === "true";

    if (!q) {
      const empty: SearchResponse = {
        query: "",
        suggestions: [],
        products: { total: 0, items: [] },
        news: { total: 0, items: [] },
        academy: { total: 0, items: [] }
      };
      if (includeBanks) {
        empty.banks = { total: 0, items: [] };
      }
      return NextResponse.json(empty);
    }

    const banksPromise = includeBanks
      ? getBanksSnapshot(country)
      : Promise.resolve({ banks: [] });
    const [catalog, banksSnapshot, news] = await Promise.all([
      getCatalogResponse({ country, locale: lang, q, page: 1, pageSize: 50 }),
      banksPromise,
      getFinancialNews(country, lang)
    ]);

    const normalizedQuery = normalizeSearch(q);
    const dbBoost = await fetchDbSearchBoost(q);
    const bankHitsWithMeta = rankByQuery(normalizedQuery, banksSnapshot.banks, (bank) => `${bank.name} ${bank.website}`)
      .map((entry) => ({
        ...entry,
        score: entry.score + (dbBoost.banks.get(entry.item.id) ?? 0)
      }))
      .sort((a, b) => b.score - a.score);
    const bankHits = bankHitsWithMeta.map((entry) => entry.item);
    const newsHitsWithMeta = rankByQuery(
      normalizedQuery,
      news.items,
      (item) => `${item.title} ${item.summary}`
    );
    const newsHits = newsHitsWithMeta.map((entry) => ({
      ...entry.item,
      id: newsId(entry.item.url),
      stableId: newsId(entry.item.url),
      articleUrl: entry.item.url
    }));
    const searchableProducts = catalog.products.filter(
      (item) => item.category !== "investments"
    );
    const productHitsWithMeta = rankByQuery(normalizedQuery, searchableProducts, (item) =>
      [
        item.name,
        item.bankName,
        item.description,
        item.aiSummary ?? "",
        item.params.map((param) => `${param.label} ${param.value}`).join(" ")
      ].join(" ")
    )
      .map((entry) => ({
        ...entry,
        score: entry.score + (dbBoost.products.get(entry.item.id) ?? 0)
      }))
      .sort((a, b) => b.score - a.score);
    const productHits = productHitsWithMeta.map((entry) => entry.item);
    const academyHitsWithMeta = rankByQuery(normalizedQuery, ACADEMY_LESSONS, (lessonItem) =>
      buildAcademySearchText(lessonItem)
    );
    const academyHits = await Promise.all(
      academyHitsWithMeta.slice(0, 8).map(async (entry) => {
        const moduleData = getAcademyModuleBySlug(entry.item.moduleSlug);
        const title =
          lang === "ru"
            ? entry.item.title
            : await translateText(entry.item.title, lang);
        const moduleTitle =
          moduleData == null
            ? ""
            : lang === "ru"
              ? moduleData.title
              : await translateText(moduleData.title, lang);
        return {
          id: entry.item.id,
          slug: entry.item.slug,
          title,
          moduleTitle,
          level: entry.item.level,
          _score: entry.score
        };
      })
    );

    const suggestions = buildSuggestions(q, [
      ...banksSnapshot.banks.map((bank) => bank.name),
      ...searchableProducts.map((product) => product.name),
      ...news.items.map((item) => item.title),
      ...ACADEMY_LESSONS.map((lessonItem) => lessonItem.title)
    ]);

    const response: SearchResponse = {
      query: q,
      suggestions,
      products: {
        total: productHits.length,
        items: productHits.slice(0, 20)
      },
      news: {
        total: newsHits.length,
        items: newsHits.slice(0, 8)
      },
      academy: {
        total: academyHitsWithMeta.length,
        items: academyHits.map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          moduleTitle: item.moduleTitle,
          level: item.level
        }))
      },
      matchedBy: {
        banks: bankHitsWithMeta.slice(0, 8).map((entry) => ({
          id: entry.item.id,
          reasons: uniqueReasons(
            entry.reasons.map((reason) => (reason === "contains" || reason === "prefix" || reason === "exact" ? "name" : "website"))
          ) as Array<"name" | "website">,
          score: entry.score
        })),
        products: productHitsWithMeta.slice(0, 20).map((entry) => {
          const reasons: Array<"name" | "params" | "aiSummary" | "bank"> = [];
          if (scoreMatch(normalizedQuery, entry.item.name) > 0) reasons.push("name");
          if (scoreMatch(normalizedQuery, entry.item.bankName) > 0) reasons.push("bank");
          if (
            scoreMatch(
              normalizedQuery,
              entry.item.params.map((param) => `${param.label} ${param.value}`).join(" ")
            ) > 0
          ) {
            reasons.push("params");
          }
          if (entry.item.aiSummary && scoreMatch(normalizedQuery, entry.item.aiSummary) > 0) {
            reasons.push("aiSummary");
          }
          return {
            id: entry.item.id,
            reasons: uniqueReasons(reasons),
            score: entry.score
          };
        }),
        news: newsHitsWithMeta.slice(0, 8).map((entry) => {
          const reasons: Array<"title" | "summary"> = [];
          if (scoreMatch(normalizedQuery, entry.item.title) > 0) {
            reasons.push("title");
          }
          if (scoreMatch(normalizedQuery, entry.item.summary) > 0) {
            reasons.push("summary");
          }
          return {
            id: newsId(entry.item.url),
            reasons: uniqueReasons(reasons),
            score: entry.score
          };
        }),
        academy: academyHitsWithMeta.slice(0, 8).map((entry) => ({
          id: entry.item.id,
          reasons: uniqueReasons(
            [
              scoreMatch(normalizedQuery, entry.item.title) > 0 ? "title" : null,
              scoreMatch(normalizedQuery, buildAcademySearchText(entry.item)) > 0 ? "content" : null,
              entry.item.tags.some((tag) => scoreMatch(normalizedQuery, tag) > 0) ? "tags" : null
            ].filter(Boolean)
          ) as Array<"title" | "content" | "tags">,
          score: entry.score
        }))
      },
      entityHighlights: {
        products: productHitsWithMeta.slice(0, 10).map((entry) => ({
          id: entry.item.id,
          text: `${entry.item.bankName} · ${entry.item.offerHighlights?.[0] ?? entry.item.description}`
        })),
        news: newsHitsWithMeta.slice(0, 8).map((entry) => ({
          id: newsId(entry.item.url),
          text: entry.item.summary
        })),
        academy: academyHits.slice(0, 8).map((item) => ({
          id: item.id,
          text: item.moduleTitle || item.title
        }))
      },
      confidence: {
        products:
          productHitsWithMeta.length > 0
            ? Math.min(1, productHitsWithMeta[0].score / 150)
            : 0,
        news:
          newsHitsWithMeta.length > 0
            ? Math.min(1, newsHitsWithMeta[0].score / 150)
            : 0,
        academy:
          academyHitsWithMeta.length > 0
            ? Math.min(1, academyHitsWithMeta[0].score / 150)
            : 0
      }
    };

    if (includeBanks) {
      response.banks = {
        total: bankHits.length,
        items: bankHits.slice(0, 8)
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error", error);
    return NextResponse.json({ error: "Failed to run search" }, { status: 500 });
  }
}
