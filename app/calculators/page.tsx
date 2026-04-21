"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";

const CALCULATOR_LINKS = [
  { type: "debit_card", key: "calculatorDebitCard" },
  { type: "credit_card", key: "calculatorCreditCard" },
  { type: "consumer_loan", key: "calculatorCredit" },
  { type: "mortgage", key: "calculatorMortgage" },
  { type: "deposit", key: "calculatorDeposit" },
  { type: "business", key: "calculatorBusiness" },
  { type: "documents", key: "calculatorDocuments" }
] as const;

export default function CalculatorsIndexPage() {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-3xl font-semibold text-slate-900">
        {copy.navCalculators}
      </h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {CALCULATOR_LINKS.map((item) => (
          <Link
            key={item.type}
            href={`/calculators/${item.type}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            {copy[item.key]}
          </Link>
        ))}
      </div>
    </section>
  );
}
