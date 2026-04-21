"use client";

import { COUNTRY_OPTIONS } from "@/data/countries";
import { getCountryLabel, UI_TEXT } from "@/data/i18n";
import { Country, Locale } from "@/lib/types";

interface CountrySelectorProps {
  value: Country;
  locale: Locale;
  onChange: (country: Country) => void;
}

export function CountrySelector({ value, locale, onChange }: CountrySelectorProps) {
  const copy = UI_TEXT[locale];

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
      <span className="hidden font-medium text-slate-500 sm:inline">{copy.country}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Country)}
        className="min-w-[150px] bg-transparent text-sm font-medium text-slate-700 outline-none"
        aria-label={copy.selectCountry}
      >
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.value} value={country.value}>
            {country.flag} {getCountryLabel(country.value, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
