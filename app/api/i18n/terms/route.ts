import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/news/articleTools";
import { LanguageCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const SUPPORTED: LanguageCode[] = ["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"];
const cache = new Map<string, string>();

function asLang(value: string | null): LanguageCode | null {
  if (!value) return null;
  return SUPPORTED.includes(value as LanguageCode) ? (value as LanguageCode) : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { lang?: string; terms?: string[] };
    const lang = asLang(body.lang ?? null);
    const terms = Array.isArray(body.terms)
      ? body.terms.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 250)
      : [];

    if (!lang) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const translations: Record<string, string> = {};
    if (lang === "ru" || lang === "en") {
      terms.forEach((term) => {
        translations[term] = term;
      });
      return NextResponse.json({ lang, translations });
    }

    for (const term of terms) {
      const key = `${lang}:${term}`;
      const cached = cache.get(key);
      if (cached) {
        translations[term] = cached;
        continue;
      }

      const translated = await translateText(term, lang);
      cache.set(key, translated);
      translations[term] = translated;
    }

    return NextResponse.json({ lang, translations });
  } catch (error) {
    console.error("i18n terms API error", error);
    return NextResponse.json({ error: "Failed to translate terms" }, { status: 500 });
  }
}
