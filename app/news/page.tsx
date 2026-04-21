"use client";

import { FinancialPulse } from "@/components/FinancialPulse";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";

export default function NewsPage() {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pb-2 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-slate-900">{copy.financialPulse}</h1>
      </section>
      <FinancialPulse />
    </>
  );
}
