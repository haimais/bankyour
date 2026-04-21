import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFinancialNews } from "@/lib/news/fetchFinancialNews";
import { getTranslatedArticle } from "@/lib/news/articleTools";
import { getPulseItemByStableId, getPulseItemByUrl } from "@/lib/news/pulseCache";
import { Country, Locale, PulseDetailResponse } from "@/lib/types";

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

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const targetId = context.params.id;
    const rawUrl = params.get("url") ?? params.get("articleUrl");
    const urlFromQuery = rawUrl?.trim() ? rawUrl.trim() : null;

    let entry = urlFromQuery ? getPulseItemByUrl(urlFromQuery) : null;
    if (!entry) {
      entry = getPulseItemByStableId(targetId);
    }
    if (!entry) {
      const list = await getFinancialNews(country, lang);
      entry = list.items.find((item) => newsId(item.url) === targetId) ?? null;
    }

    if (!entry) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    const articleUrl = urlFromQuery ?? entry.articleUrl ?? entry.canonicalUrl ?? entry.url;
    let response: PulseDetailResponse;
    try {
      const article = await getTranslatedArticle(articleUrl, lang);
      response = {
        id: targetId,
        originalUrl: articleUrl,
        resolvedUrl: articleUrl,
        originalTitle: article.originalTitle || entry.title,
        translatedTitle: article.translatedTitle || entry.title,
        translatedBody: article.translatedBody,
        fullTextBlocks: article.fullTextBlocks,
        originalTextBlocks: article.originalTextBlocks,
        extractionStatus: article.extractionStatus,
        heroImage: article.heroImage,
        extractionTrace: article.extractionTrace,
        fallbackReason: article.fallbackReason,
        summary: article.summary,
        keyPoints: article.keyPoints,
        aiSummary: article.aiSummary,
        aiKeyPoints: article.aiKeyPoints,
        aiModel: article.aiModel,
        aiGeneratedAt: article.aiGeneratedAt,
        summaryMode: article.summaryMode,
        translatedAt: article.translatedAt,
        language: lang
      };
    } catch {
      const summary =
        entry.summary ||
        (lang === "ru"
          ? "Полный текст временно недоступен. Откройте оригинальный источник."
          : "Full text is temporarily unavailable. Open the original source.");
      response = {
        id: targetId,
        originalUrl: articleUrl,
        resolvedUrl: articleUrl,
        originalTitle: entry.title,
        translatedTitle: entry.title,
        translatedBody: summary,
        fullTextBlocks: [summary],
        originalTextBlocks: [],
        extractionStatus: "failed",
        fallbackReason: "fulltext_fetch_failed",
        extractionTrace: ["fallback_from_feed_entry"],
        summary,
        keyPoints: [summary],
        aiSummary: summary,
        aiKeyPoints: [summary],
        aiModel: "fallback",
        aiGeneratedAt: new Date().toISOString(),
        summaryMode: "fallback",
        translatedAt: new Date().toISOString(),
        language: lang
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Pulse detail API error", error);
    return NextResponse.json(
      { error: "Failed to load pulse detail" },
      { status: 500 }
    );
  }
}
