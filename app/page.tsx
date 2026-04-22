"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BankLogoStrip } from "@/components/BankLogoStrip";
import { FxMonitor } from "@/components/FxMonitor";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { CATEGORY_CONFIG } from "@/data/catalog";
import { UI_TEXT, getCategoryLabel, getCountryLabel } from "@/data/i18n";
import { CatalogResponse, Locale, NewsItem, ProductCategory } from "@/lib/types";

interface PulseApiResponse {
  items: NewsItem[];
}

function categoryEmoji(category: ProductCategory): string {
  if (category === "debit_cards") return "💳";
  if (category === "credit_cards") return "🪪";
  if (category === "consumer_loans") return "💸";
  if (category === "mortgages") return "🏠";
  if (category === "deposits") return "🏦";
  if (category === "business_services") return "💼";
  return "📄";
}

function rateRange(data: CatalogResponse | null, locale: Locale): string {
  if (!data) {
    return "—";
  }
  if (data.sectionSummary.minRate == null || data.sectionSummary.maxRate == null) {
    return locale === "ru" ? "данные уточняются" : "data pending";
  }
  return `${data.sectionSummary.minRate.toFixed(1)}% - ${data.sectionSummary.maxRate.toFixed(1)}%`;
}

export default function HomePage() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const countryLabel = getCountryLabel(country, locale);

  const [loanData, setLoanData] = useState<CatalogResponse | null>(null);
  const [mortgageData, setMortgageData] = useState<CatalogResponse | null>(null);
  const [depositData, setDepositData] = useState<CatalogResponse | null>(null);
  const [pulseItems, setPulseItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [loanRes, mortgageRes, depositRes, pulseRes] = await Promise.all([
          fetch(`/api/catalog?country=${country}&lang=${locale}&category=consumer_loans&pageSize=1`, {
            cache: "no-store"
          }),
          fetch(`/api/catalog?country=${country}&lang=${locale}&category=mortgages&pageSize=1`, {
            cache: "no-store"
          }),
          fetch(`/api/catalog?country=${country}&lang=${locale}&category=deposits&pageSize=1`, {
            cache: "no-store"
          }),
          fetch(`/api/pulse?country=${country}&lang=${locale}&pageSize=3&strictFinance=1`, { cache: "no-store" })
        ]);

        if (!loanRes.ok || !mortgageRes.ok || !depositRes.ok || !pulseRes.ok) {
          throw new Error("Failed to load home blocks");
        }

        const [loanJson, mortgageJson, depositJson, pulseJson] = (await Promise.all([
          loanRes.json(),
          mortgageRes.json(),
          depositRes.json(),
          pulseRes.json()
        ])) as [CatalogResponse, CatalogResponse, CatalogResponse, PulseApiResponse];

        if (cancelled) {
          return;
        }

        setLoanData(loanJson);
        setMortgageData(mortgageJson);
        setDepositData(depositJson);
        setPulseItems(pulseJson.items.slice(0, 3));
      } catch {
        if (!cancelled) {
          setLoanData(null);
          setMortgageData(null);
          setDepositData(null);
          setPulseItems([]);
        }
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [country, locale]);

  const monitoringCards = useMemo(
    () => [
      {
        title: copy.ratesByCredits,
        value: rateRange(loanData, locale),
        href: "/services?category=consumer_loans",
        count: loanData?.sectionSummary.banks ?? 0
      },
      {
        title: copy.ratesByMortgage,
        value: rateRange(mortgageData, locale),
        href: "/services?category=mortgages",
        count: mortgageData?.sectionSummary.banks ?? 0
      },
      {
        title: copy.bestDeposits,
        value: rateRange(depositData, locale),
        href: "/services?category=deposits",
        count: depositData?.sectionSummary.banks ?? 0
      }
    ],
    [copy, depositData, loanData, mortgageData, locale]
  );

  return (
    <>
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8 lg:py-16">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300">
              {copy.heroChip}
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
              {copy.heroTitle} {countryLabel}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{copy.heroSubtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/services"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {copy.exploreServices}
              </a>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("bankyour:open-chat"))}
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                {copy.talkToAssistant}
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-card"
          >
            <h2 className="text-lg font-semibold text-slate-100">{copy.chooseService}</h2>
            <div className="mt-4 grid gap-2">
              {CATEGORY_CONFIG.map((item) => {
                const emoji = categoryEmoji(item.key);
                return (
                  <a
                    key={item.key}
                    href={`/services?category=${item.key}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-blue-400 hover:bg-slate-800"
                  >
                    <span className="font-medium">{getCategoryLabel(item.key, locale)}</span>
                    <span className="text-lg leading-none" aria-hidden="true">{emoji}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <BankLogoStrip />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">{copy.marketMonitoring}</h2>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700"
          >
            {copy.allServices}
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {monitoringCards.map((card) => (
            <article key={card.title} className="glass-card rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="text-sm text-slate-600">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">
                {copy.checkedIn} {card.count} {copy.banksWord}
              </p>
              <Link href={card.href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                {copy.moreDetails}
                <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <FxMonitor compact={false} />

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <article className="glass-card rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-xl font-semibold text-slate-900">{copy.servicesTools}</h3>
          <div className="mt-4 grid gap-3">
            <Link href="/calculators" className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
              {locale === "ru" ? "Все калькуляторы" : "All calculators"}
            </Link>
            <Link href="/services" className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
              {copy.servicesPageTitle}
            </Link>
            <Link href="/news" className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
              {copy.financialPulse}
            </Link>
          </div>
        </article>

        <article className="glass-card rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">{copy.financialPulse}</h3>
            <Link href="/news" className="text-sm font-medium text-blue-700">
              {copy.viewAllJournal}
            </Link>
          </div>
          <div className="grid gap-3">
            {pulseItems.map((item) => (
              <Link
                key={item.id}
                href={`/pulse/${item.stableId ?? item.id}?url=${encodeURIComponent(item.articleUrl ?? item.url)}&country=${country}&lang=${locale}`}
                className="rounded-xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
              </Link>
            ))}
            {pulseItems.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                {copy.newsLoading}
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
