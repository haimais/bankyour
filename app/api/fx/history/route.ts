import { NextRequest, NextResponse } from "next/server";
import { getFxPairHistory } from "@/lib/fx/fetchFx";
import { Country } from "@/lib/types";

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

function asCountry(input: string | null): Country {
  if (!input) return "russia";
  return COUNTRIES.includes(input as Country) ? (input as Country) : "russia";
}

function asWindow(input: string | null): number {
  const value = Number.parseInt(input ?? "30", 10);
  if (value === 7 || value === 30 || value === 90) {
    return value;
  }
  return 30;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const pair = params.get("pair") ?? undefined;
    const base = params.get("base") ?? undefined;
    const quote = params.get("quote") ?? undefined;
    const window = asWindow(params.get("window"));

    const payload = await getFxPairHistory({
      country,
      pair,
      base,
      quote,
      window
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("FX history API error", error);
    return NextResponse.json({ error: "Failed to load FX history" }, { status: 500 });
  }
}
