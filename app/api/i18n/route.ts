import { NextRequest, NextResponse } from "next/server";
import { EN_TEXT, RU_TEXT, UI_TEXT, UiTextShape } from "@/data/i18n";
import { translateText } from "@/lib/news/articleTools";
import { LanguageCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED: LanguageCode[] = ["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"];
const cache = new Map<LanguageCode, UiTextShape>();

function isLanguageCode(value: string | null): value is LanguageCode {
  if (!value) {
    return false;
  }
  return ALLOWED.includes(value as LanguageCode);
}

export async function GET(request: NextRequest) {
  try {
    const lang = request.nextUrl.searchParams.get("lang");
    if (!isLanguageCode(lang)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    if (lang === "ru" || lang === "en") {
      return NextResponse.json({ lang, text: lang === "ru" ? RU_TEXT : EN_TEXT });
    }

    const cached = cache.get(lang);
    if (cached) {
      return NextResponse.json({ lang, text: cached });
    }

    const dictionarySeed = UI_TEXT[lang];
    const entries = Object.entries(EN_TEXT) as Array<[keyof UiTextShape, string]>;
    const translatedEntries = await Promise.all(
      entries.map(async ([key, value]) => {
        const dictionaryValue = dictionarySeed[key];
        if (dictionaryValue && dictionaryValue !== value) {
          return [key, dictionaryValue] as const;
        }
        const translated = await translateText(value, lang);
        return [key, translated] as const;
      })
    );

    const text = translatedEntries.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as UiTextShape);

    cache.set(lang, text);
    return NextResponse.json({ lang, text });
  } catch (error) {
    console.error("i18n translation API error", error);
    return NextResponse.json({ error: "Failed to translate UI text" }, { status: 500 });
  }
}
