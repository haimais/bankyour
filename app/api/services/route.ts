import { NextRequest, NextResponse } from "next/server";
import { getServicesResponse } from "@/lib/catalog/snapshotStore";
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
    const country: Country = isCountry(countryParam) ? countryParam : "russia";
    const localeParam = request.nextUrl.searchParams.get("locale") ?? "ru";
    const locale: Locale = isLocale(localeParam) ? localeParam : "ru";
    const response = await getServicesResponse(country, locale);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Services API error", error);
    return NextResponse.json(
      { error: "Failed to load services data" },
      { status: 500 }
    );
  }
}
