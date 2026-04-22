import { NextRequest, NextResponse } from "next/server";
import { fetchFinancialNewsFromSources } from "@/lib/news/newsSources";
import { Country, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

interface FinancialNewsResponse {
  country: Country;
  locale: Locale;
  fetchedAt: string;
  total: number;
  items: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    category: string;
    publishedAt: string;
  }>;
  status: "success" | "partial" | "failed";
}

const ALLOWED_COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

const ALLOWED_LOCALES: Locale[] = [
  "ru",
  "en",
  "hy",
  "be",
  "kk",
  "ka",
  "az",
  "ar",
  "tr"
];

function isValidCountry(value: string): value is Country {
  return ALLOWED_COUNTRIES.includes(value as Country);
}

function isValidLocale(value: string): value is Locale {
  return ALLOWED_LOCALES.includes(value as Locale);
}

export async function GET(request: NextRequest): Promise<NextResponse<FinancialNewsResponse>> {
  try {
    const params = request.nextUrl.searchParams;
    const countryParam = params.get("country") ?? "russia";
    const localeParam = params.get("locale") ?? "ru";
    const limit = Math.min(parseInt(params.get("limit") ?? "20", 10), 100);

    const country: Country = isValidCountry(countryParam) ? countryParam : "russia";
    const locale: Locale = isValidLocale(localeParam) ? localeParam : "ru";

    console.log(`[news] Fetching financial news for ${country} (${locale})`);

    try {
      const news = await fetchFinancialNewsFromSources(country);

      const items = news.slice(0, limit).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        url: item.url,
        source: item.source,
        category: item.category,
        publishedAt: item.publishedAt
      }));

      const response: FinancialNewsResponse = {
        country,
        locale,
        fetchedAt: new Date().toISOString(),
        total: items.length,
        items,
        status: items.length > 0 ? "success" : "partial"
      };

      return NextResponse.json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[news] Error fetching news for ${country}:`, errorMsg);

      return NextResponse.json(
        {
          country,
          locale,
          fetchedAt: new Date().toISOString(),
          total: 0,
          items: [],
          status: "failed"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[news] API error:", errorMsg);

    return NextResponse.json(
      {
        country: "russia",
        locale: "ru",
        fetchedAt: new Date().toISOString(),
        total: 0,
        items: [],
        status: "failed"
      },
      { status: 500 }
    );
  }
}
