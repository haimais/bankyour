import { NextRequest, NextResponse } from "next/server";
import { getCatalogResponse } from "@/lib/catalog/snapshotStore";
import { Country, DepositType, Locale, ProductCategory } from "@/lib/types";

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

function asDepositType(input: string | null): DepositType | undefined {
  if (!input) return undefined;
  if (input === "on_demand" || input === "term") {
    return input;
  }
  return undefined;
}

function asOptionalNumber(input: string | null): number | undefined {
  if (!input) return undefined;
  const value = Number.parseFloat(input);
  if (Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const category = asCategory(params.get("category"));
    const depositType = asDepositType(params.get("depositType"));
    const q = params.get("q") ?? undefined;
    const sort = params.get("sort") ?? undefined;
    const bank = params.get("bank") ?? undefined;
    const currency = params.get("currency") ?? undefined;
    const rateMin = asOptionalNumber(params.get("rateMin"));
    const rateMax = asOptionalNumber(params.get("rateMax"));
    const feeMin = asOptionalNumber(params.get("feeMin"));
    const feeMax = asOptionalNumber(params.get("feeMax"));
    const amountMin = asOptionalNumber(params.get("amountMin"));
    const amountMax = asOptionalNumber(params.get("amountMax"));
    const termMin = asOptionalNumber(params.get("termMin"));
    const termMax = asOptionalNumber(params.get("termMax"));
    const cashbackMin = asOptionalNumber(params.get("cashbackMin"));
    const onlineOnly = params.get("onlineOnly") === "1" || params.get("onlineOnly") === "true";
    const sourceParam = params.get("source");
    const source =
      sourceParam === "sravni" || sourceParam === "bank_site" || sourceParam === "registry_fallback"
        ? sourceParam
        : undefined;
    const featureTags = (params.get("featureTags") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const intent = params.get("intent")?.trim() || undefined;
    const hasAiSummaryParam = params.get("hasAiSummary");
    const hasAiSummary =
      hasAiSummaryParam == null
        ? undefined
        : hasAiSummaryParam === "1" || hasAiSummaryParam === "true";
    const strict = params.get("strict") === "1" || params.get("strict") === "true";
    const bankStatusParam = params.get("bankStatus");
    const bankStatus =
      bankStatusParam === "active" || bankStatusParam === "suspended" || bankStatusParam === "unknown"
        ? bankStatusParam
        : undefined;
    const page = Number.parseInt(params.get("page") ?? "1", 10);
    const pageSize = Number.parseInt(params.get("pageSize") ?? "20", 10);

    const response = await getCatalogResponse({
      country,
      locale: lang,
      category,
      depositType,
      q,
      sort,
      bank,
      currency,
      rateMin,
      rateMax,
      feeMin,
      feeMax,
      amountMin,
      amountMax,
      termMin,
      termMax,
      cashbackMin,
      onlineOnly,
      source,
      featureTags,
      intent,
      hasAiSummary,
      bankStatus,
      strict,
      page,
      pageSize
    });

    return NextResponse.json({
      ...response,
      lang
    });
  } catch (error) {
    console.error("Catalog API error", error);
    return NextResponse.json(
      { error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
