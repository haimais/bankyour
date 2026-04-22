import { NextRequest, NextResponse } from "next/server";
import {
  getRealTimeExchangeRates,
  getCountryExchangeRates,
  convertCurrency
} from "@/lib/fx/realTimeExchangeRates";
import { Country, CurrencyCode } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ExchangeRateResponse {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  timestamp: string;
  source: string;
}

interface ConversionResponse {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
  result: number;
  rate: number;
  timestamp: string;
}

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

const COUNTRY_TO_CURRENCY: Record<Country, CurrencyCode> = {
  armenia: "AMD",
  belarus: "BYN",
  kazakhstan: "KZT",
  georgia: "GEL",
  russia: "RUB",
  azerbaijan: "AZN",
  uae: "AED"
};

function asCountry(input: string | null): Country {
  if (!input) return "russia";
  return COUNTRIES.includes(input as Country) ? (input as Country) : "russia";
}

function asCurrency(input: string | null): CurrencyCode | null {
  if (!input) return null;
  const normalized = input.toUpperCase();
  return ["USD", "AMD", "BYN", "KZT", "GEL", "RUB", "AZN", "AED"].includes(normalized)
    ? (normalized as CurrencyCode)
    : null;
}

/**
 * GET /api/fx/rates
 * Get exchange rates for a base currency
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const command = params.get("command") ?? "rates";

    if (command === "convert") {
      // Handle currency conversion
      const amount = parseFloat(params.get("amount") ?? "1");
      const from = asCurrency(params.get("from")) ?? "USD";
      const to = asCurrency(params.get("to")) ?? "RUB";

      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Invalid amount" },
          { status: 400 }
        );
      }

      const rates = await getRealTimeExchangeRates(from);
      const rate = rates[to] || 1;
      const result = convertCurrency(amount, from, to, rates);

      return NextResponse.json({
        amount,
        from,
        to,
        result: parseFloat(result.toFixed(2)),
        rate: parseFloat(rate.toFixed(6)),
        timestamp: new Date().toISOString()
      } as ConversionResponse);
    }

    if (command === "country") {
      // Get rates for a specific country
      const country = asCountry(params.get("country"));
      const rates = await getCountryExchangeRates(country);

      return NextResponse.json({
        country,
        base: COUNTRY_TO_CURRENCY[country],
        rates: rates.base,
        timestamp: new Date().toISOString(),
        source: "bank-your-fx"
      } as ExchangeRateResponse);
    }

    // Default: get rates for base currency
    const base = asCurrency(params.get("base")) ?? "USD";
    const rates = await getRealTimeExchangeRates(base);

    return NextResponse.json({
      base,
      rates,
      timestamp: new Date().toISOString(),
      source: "real-time"
    } as ExchangeRateResponse);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[fx] API error:", errorMsg);

    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
