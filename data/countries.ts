import { Country, CountryOption } from "@/lib/types";

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    value: "armenia",
    label: "Armenia",
    flag: "🇦🇲",
    currencySymbol: "֏",
    currencyCode: "AMD",
    locale: "hy-AM",
    nationalLanguage: "hy"
  },
  {
    value: "belarus",
    label: "Belarus",
    flag: "🇧🇾",
    currencySymbol: "Br",
    currencyCode: "BYN",
    locale: "be-BY",
    nationalLanguage: "be"
  },
  {
    value: "kazakhstan",
    label: "Kazakhstan",
    flag: "🇰🇿",
    currencySymbol: "₸",
    currencyCode: "KZT",
    locale: "kk-KZ",
    nationalLanguage: "kk"
  },
  {
    value: "georgia",
    label: "Georgia",
    flag: "🇬🇪",
    currencySymbol: "₾",
    currencyCode: "GEL",
    locale: "ka-GE",
    nationalLanguage: "ka"
  },
  {
    value: "russia",
    label: "Russia",
    flag: "🇷🇺",
    currencySymbol: "₽",
    currencyCode: "RUB",
    locale: "ru-RU",
    nationalLanguage: "ru"
  },
  {
    value: "azerbaijan",
    label: "Azerbaijan",
    flag: "🇦🇿",
    currencySymbol: "₼",
    currencyCode: "AZN",
    locale: "az-AZ",
    nationalLanguage: "az"
  },
  {
    value: "uae",
    label: "UAE",
    flag: "🇦🇪",
    currencySymbol: "AED",
    currencyCode: "AED",
    locale: "ar-AE",
    nationalLanguage: "ar"
  }
];

export const COUNTRIES_BY_VALUE: Record<Country, CountryOption> =
  COUNTRY_OPTIONS.reduce((acc, country) => {
    acc[country.value] = country;
    return acc;
  }, {} as Record<Country, CountryOption>);

const REGION_TO_COUNTRY: Record<string, Country> = {
  AM: "armenia",
  BY: "belarus",
  KZ: "kazakhstan",
  GE: "georgia",
  RU: "russia",
  AZ: "azerbaijan",
  AE: "uae"
};

const LANGUAGE_TO_COUNTRY: Record<string, Country> = {
  hy: "armenia",
  be: "belarus",
  kk: "kazakhstan",
  ka: "georgia",
  ru: "russia",
  az: "azerbaijan",
  ar: "uae"
};

export function detectCountryFromLocale(): Country {
  if (typeof window === "undefined") {
    return "russia";
  }

  const locale = window.navigator.language || "ru-RU";
  const [languagePart, regionPart] = locale.split("-");

  if (regionPart && REGION_TO_COUNTRY[regionPart.toUpperCase()]) {
    return REGION_TO_COUNTRY[regionPart.toUpperCase()];
  }

  if (languagePart && LANGUAGE_TO_COUNTRY[languagePart.toLowerCase()]) {
    return LANGUAGE_TO_COUNTRY[languagePart.toLowerCase()];
  }

  return "russia";
}

export function formatMoney(country: Country, amount: number): string {
  const config = COUNTRIES_BY_VALUE[country];
  const formatted = new Intl.NumberFormat(config.locale, {
    maximumFractionDigits: 0
  }).format(amount);

  if (country === "uae") {
    return `${config.currencySymbol} ${formatted}`;
  }

  return `${formatted}${config.currencySymbol}`;
}
