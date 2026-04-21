"use client";

import { LANGUAGE_OPTIONS, UI_TEXT } from "@/data/i18n";
import { Locale } from "@/lib/types";

interface LanguageSelectorProps {
  value: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const copy = UI_TEXT[value] ?? UI_TEXT.en;

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
      <span className="hidden font-medium text-slate-500 sm:inline">{copy.language}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Locale)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none"
        aria-label={copy.selectLanguage}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
