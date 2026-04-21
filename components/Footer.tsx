"use client";

import Link from "next/link";
import { useCountryMeta } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { getCountryLabel, UI_TEXT } from "@/data/i18n";

export function Footer() {
  const countryMeta = useCountryMeta();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="whitespace-nowrap text-lg font-semibold text-blue-700">Bank-your</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            {copy.footerDisclaimer} {getCountryLabel(countryMeta.value, locale)}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-5">
          <Link href="/about" className="transition hover:text-blue-700">
            {copy.footerAbout}
          </Link>
          <Link href="/services" className="transition hover:text-blue-700">
            {copy.footerPartners}
          </Link>
          <Link href="/about#privacy" className="transition hover:text-blue-700">
            {copy.footerPrivacy}
          </Link>
          <Link href="/contact" className="transition hover:text-blue-700">
            {copy.footerContact}
          </Link>
          <Link href="/mobile" className="transition hover:text-blue-700">
            {locale === "ru" ? "Приложение" : "Mobile App"}
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Bank-your. {copy.allRightsReserved}
      </div>
    </footer>
  );
}
