import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/news/articleTools";
import { cachePulseItems } from "@/lib/news/pulseCache";
import { getFinancialNews } from "@/lib/news/fetchFinancialNews";
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

function newsId(url: string) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 20);
}

function contentHash(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 16);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const strictFinance = params.get("strictFinance") !== "0";
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10));
    const pageSize = Math.min(30, Math.max(1, Number.parseInt(params.get("pageSize") ?? "12", 10)));
    const offset = (page - 1) * pageSize;

    const result = await getFinancialNews(country, lang, { strictFinance });
    const now = Date.now();
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
    const normalizedItems = result.items.map((item) => {
      const stableId = newsId(item.url);
      const resolvedUrl = item.canonicalUrl ?? item.articleUrl ?? item.url;
      const publishedAtMs = new Date(item.publishedAt).getTime();
      const isFresh =
        Number.isFinite(publishedAtMs) && now - publishedAtMs >= 0 && now - publishedAtMs <= maxAgeMs;

      return {
        ...item,
        id: stableId,
        stableId,
        articleUrl: resolvedUrl,
        resolvedUrl,
        contentHash: contentHash(`${item.title}|${item.summary}|${item.publishedAt}`),
        isFresh,
        extractionReady: /^https?:\/\//i.test(resolvedUrl),
        canonicalUrl: resolvedUrl,
        sourceDomain: item.sourceDomain,
        openStatus: item.openStatus ?? (/^https?:\/\//i.test(resolvedUrl) ? "ready" : "fallback_only")
      };
    });

    const items =
      lang === "en"
        ? normalizedItems
        : await Promise.all(
            normalizedItems.map(async (item) => ({
              ...item,
              title: await translateText(item.title, lang),
              summary: await translateText(item.summary, lang)
            }))
          );

    cachePulseItems(items);

    return NextResponse.json({
      country,
      lang,
      page,
      pageSize,
      total: items.length,
      fallback: result.fallback,
      provider: result.provider,
      providerStatus: result.providerStatus,
      fetchedAt: new Date().toISOString(),
      items: items.slice(offset, offset + pageSize)
    });
  } catch (error) {
    console.error("Pulse API error", error);
    return NextResponse.json({ error: "Failed to load pulse" }, { status: 500 });
  }
}
