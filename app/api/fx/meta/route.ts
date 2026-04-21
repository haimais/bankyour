import { NextRequest, NextResponse } from "next/server";
import { CurrencyCode, CurrencyMeta, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const CURRENCY_META: Array<{
  code: CurrencyCode;
  emoji: string;
  ru: string;
  en: string;
}> = [
  { code: "USD", emoji: "🇺🇸", ru: "Доллар США", en: "US Dollar" },
  { code: "AMD", emoji: "🇦🇲", ru: "Армянский драм", en: "Armenian Dram" },
  { code: "BYN", emoji: "🇧🇾", ru: "Белорусский рубль", en: "Belarusian Ruble" },
  { code: "KZT", emoji: "🇰🇿", ru: "Казахстанский тенге", en: "Kazakhstani Tenge" },
  { code: "GEL", emoji: "🇬🇪", ru: "Грузинский лари", en: "Georgian Lari" },
  { code: "RUB", emoji: "🇷🇺", ru: "Российский рубль", en: "Russian Ruble" },
  { code: "AZN", emoji: "🇦🇿", ru: "Азербайджанский манат", en: "Azerbaijani Manat" },
  { code: "AED", emoji: "🇦🇪", ru: "Дирхам ОАЭ", en: "UAE Dirham" }
];

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

export async function GET(request: NextRequest) {
  const locale = asLocale(request.nextUrl.searchParams.get("locale") ?? request.nextUrl.searchParams.get("lang"));
  const useRu = locale === "ru";
  const items: CurrencyMeta[] = CURRENCY_META.map((item) => ({
    code: item.code,
    emoji: item.emoji,
    label: useRu ? item.ru : item.en
  }));
  return NextResponse.json({
    locale,
    items
  });
}
