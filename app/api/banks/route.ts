import { NextRequest, NextResponse } from "next/server";
import { getBanksSnapshot } from "@/lib/catalog/snapshotStore";
import { Country, Locale } from "@/lib/types";

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

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const snapshot = await getBanksSnapshot(country);

    return NextResponse.json({
      snapshotId: snapshot.snapshotId,
      updatedAt: snapshot.updatedAt,
      lang,
      total: snapshot.banks.length,
      banks: snapshot.banks
    });
  } catch (error) {
    console.error("Banks API error", error);
    return NextResponse.json({ error: "Failed to load banks" }, { status: 500 });
  }
}
