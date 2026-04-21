import { NextRequest, NextResponse } from "next/server";
import { getBusinessArticleBySlug } from "@/data/businessArticles";
import { localizeBusinessArticle } from "@/lib/business/localize";
import { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

export async function GET(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  try {
    const params = request.nextUrl.searchParams;
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const article = getBusinessArticleBySlug(context.params.slug);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const localized = await localizeBusinessArticle(article, lang).catch(() => article);
    return NextResponse.json({
      lang,
      article: localized
    });
  } catch (error) {
    console.error("Business article detail API error", error);
    return NextResponse.json({ error: "Failed to load article" }, { status: 500 });
  }
}
