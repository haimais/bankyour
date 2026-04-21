import { NextRequest, NextResponse } from "next/server";
import { getFinancialNews } from "@/lib/news/fetchFinancialNews";
import { Country, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

function isCountry(value: string): value is Country {
  return ALLOWED_COUNTRIES.includes(value as Country);
}

function isLocale(value: string): value is Locale {
  return (
    value === "ru" ||
    value === "en" ||
    value === "hy" ||
    value === "be" ||
    value === "kk" ||
    value === "ka" ||
    value === "az" ||
    value === "ar" ||
    value === "tr"
  );
}

export async function GET(request: NextRequest) {
  try {
    const countryParam = request.nextUrl.searchParams.get("country") ?? "russia";
    const localeParam = request.nextUrl.searchParams.get("locale") ?? "ru";
    const strictFinance = request.nextUrl.searchParams.get("strictFinance") !== "0";
    const country: Country = isCountry(countryParam) ? countryParam : "russia";
    const locale: Locale = isLocale(localeParam) ? localeParam : "ru";

    const response = await getFinancialNews(country, locale, { strictFinance });
    return NextResponse.json({
      country,
      locale,
      fetchedAt: new Date().toISOString(),
      fallback: response.fallback,
      provider: response.provider,
      providerStatus: response.providerStatus,
      items: response.items
    });
  } catch (error) {
    console.error("News API error", error);
    return NextResponse.json(
      { error: "Failed to load news" },
      { status: 500 }
    );
  }
}
