import { NextRequest, NextResponse } from "next/server";
import { getCatalogBankGroups } from "@/lib/catalog/snapshotStore";
import { Country, Locale, ProductCategory } from "@/lib/types";

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

const CATEGORIES: ProductCategory[] = [
  "debit_cards",
  "credit_cards",
  "consumer_loans",
  "mortgages",
  "deposits",
  "business_services",
  "document_assistance"
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

function asCategory(input: string | null): ProductCategory | undefined {
  if (!input) return undefined;
  if (input === "investments") {
    return "deposits";
  }
  if (CATEGORIES.includes(input as ProductCategory)) {
    return input as ProductCategory;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const category = asCategory(params.get("category"));
    const q = params.get("q") ?? undefined;
    const sourceParam = params.get("source");
    const source =
      sourceParam === "sravni" || sourceParam === "bank_site" || sourceParam === "registry_fallback"
        ? sourceParam
        : undefined;
    const page = Number.parseInt(params.get("page") ?? "1", 10);
    const pageSize = Number.parseInt(params.get("pageSize") ?? "20", 10);

    const response = await getCatalogBankGroups({
      country,
      locale: lang,
      category,
      q,
      source,
      page,
      pageSize
    });

    return NextResponse.json({
      ...response,
      lang
    });
  } catch (error) {
    console.error("Catalog bank groups API error", error);
    return NextResponse.json({ error: "Failed to load grouped catalog" }, { status: 500 });
  }
}
