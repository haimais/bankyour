"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BankLogoStrip } from "@/components/BankLogoStrip";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { FxMonitor } from "@/components/FxMonitor";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { ProductCategory } from "@/lib/types";

export function ServicesPageClient() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const copy = UI_TEXT[locale];
  const rawCategory = searchParams.get("category");
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory =
    rawCategory &&
    [
      "debit_cards",
      "credit_cards",
      "consumer_loans",
      "mortgages",
      "deposits",
      "business_services",
      "document_assistance"
    ].includes(rawCategory)
      ? (rawCategory as ProductCategory)
      : rawCategory === "investments"
        ? ("deposits" as ProductCategory)
      : undefined;
  const legacyInvestmentsAlias = rawCategory === "investments";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-10 pt-10 sm:px-6 lg:px-8">
      <section>
        <h1 className="text-3xl font-semibold text-slate-900">{copy.servicesPageTitle}</h1>
        {legacyInvestmentsAlias ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {locale === "ru"
              ? "Категория «Инвестиции» объединена с «Вклады»."
              : "The Investments category is merged into Deposits."}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/calculators/debit_card"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorDebitCard}
          </Link>
          <Link
            href="/calculators/credit_card"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorCreditCard}
          </Link>
          <Link
            href="/calculators/consumer_loan"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorCredit}
          </Link>
          <Link
            href="/calculators/mortgage"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorMortgage}
          </Link>
          <Link
            href="/calculators/deposit"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorDeposit}
          </Link>
          <Link
            href="/calculators/business"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorBusiness}
          </Link>
          <Link
            href="/calculators/documents"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copy.calculatorDocuments}
          </Link>
        </div>
      </section>
      <BankLogoStrip />
      <FxMonitor compact />
      <CatalogExplorer initialCategory={initialCategory} initialQuery={initialQuery} />
    </div>
  );
}
