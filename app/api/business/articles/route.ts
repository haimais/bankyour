import { NextRequest, NextResponse } from "next/server";
import { BUSINESS_ARTICLES } from "@/data/businessArticles";
import { localizeBusinessArticles } from "@/lib/business/localize";
import { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const q = (params.get("q") ?? "").trim().toLowerCase();

    const localized = await localizeBusinessArticles(BUSINESS_ARTICLES, lang).catch(() => BUSINESS_ARTICLES);
    const filtered =
      q.length === 0
        ? localized
        : localized.filter((item) => {
            const haystack = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
            return haystack.includes(q);
          });

    return NextResponse.json({
      lang,
      total: filtered.length,
      items: filtered.map((item) => ({
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        tags: item.tags,
        updatedAt: item.updatedAt
      }))
    });
  } catch (error) {
    console.error("Business articles API error", error);
    return NextResponse.json({ error: "Failed to load business articles" }, { status: 500 });
  }
}
