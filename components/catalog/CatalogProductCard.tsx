"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, ExternalLink, Info, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { CATEGORY_CONFIG } from "@/data/catalog";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT, getCategoryLabel } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { ProductItem } from "@/lib/types";

interface CatalogProductCardProps {
  item: ProductItem;
  isCompared?: boolean;
  onToggleCompare?: (item: ProductItem) => void;
  isAlerted?: boolean;
  onToggleAlert?: (item: ProductItem) => void;
}

export function CatalogProductCard({
  item,
  isCompared = false,
  onToggleCompare,
  isAlerted = false,
  onToggleAlert
}: CatalogProductCardProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const [showDetails, setShowDetails] = useState(false);
  const providerUrl = getValidExternalUrl(item.url);
  const stale = Date.now() - new Date(item.updatedAt).getTime() > 20 * 60_000;

  const icon = useMemo(
    () => CATEGORY_CONFIG.find((entry) => entry.key === item.category)?.icon ?? "docs",
    [item.category]
  );

  const sourceBadge = useMemo(() => {
    if (item.source === "sravni") {
      return locale === "ru" ? "Источник: Sravni" : "Source: Sravni";
    }
    if (item.source === "bank_site") {
      return locale === "ru" ? "Источник: сайт банка" : "Source: bank site";
    }
    return locale === "ru" ? "Источник: fallback" : "Source: fallback";
  }, [item.source, locale]);

  const quickSummary = useMemo(() => {
    if (item.offerHighlights && item.offerHighlights.length > 0) {
      return item.offerHighlights;
    }

    if (item.category === "debit_cards" || item.category === "credit_cards") {
      return [
        item.cashback ? `Cashback: ${item.cashback}` : null,
        item.annualFee ? `Fee: ${item.annualFee}` : null,
        item.currencyOptions?.length ? `Currency: ${item.currencyOptions.join(" / ")}` : null
      ].filter(Boolean) as string[];
    }

    if (item.category === "consumer_loans" || item.category === "mortgages") {
      return [
        item.rate ? `Rate: ${item.rate}` : null,
        item.term ? `Term: ${item.term}` : null,
        item.minAmount ? `Min amount: ${item.minAmount}` : null
      ].filter(Boolean) as string[];
    }

    if (item.category === "deposits" || item.category === "investments") {
      return [
        item.rate ? `Yield: ${item.rate}` : null,
        item.term ? `Term: ${item.term}` : null,
        item.minAmount ? `Min amount: ${item.minAmount}` : null
      ].filter(Boolean) as string[];
    }

    return [
      item.annualFee ? `Fee: ${item.annualFee}` : null,
      item.term ? `Timeline: ${item.term}` : null
    ].filter(Boolean) as string[];
  }, [item]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.bankName}</p>
            <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <CategoryIcon icon={icon} className="text-blue-700" size={14} />
          <span>{getCategoryLabel(item.category, locale)}</span>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-600">{item.description}</p>

      {item.aiSummary ? (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-slate-700">
          {item.aiSummary}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {sourceBadge}
        </span>
        {(item.qualityFlags ?? []).slice(0, 2).map((flag) => (
          <span
            key={`${item.id}-${flag}`}
            className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
          >
            {locale === "ru" ? "Проверить данные" : "Verify data"}: {flag}
          </span>
        ))}
        {stale ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
            {locale === "ru" ? "Данные могут устареть" : "Data may be stale"}
          </span>
        ) : null}
      </div>

      {quickSummary.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {quickSummary.map((entry) => (
            <span
              key={entry}
              className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {entry}
            </span>
          ))}
        </div>
      )}

      <dl className="grid gap-2 sm:grid-cols-2">
        {(item.params || []).slice(0, 4).map((param) => (
          <div key={`${param.label}-${param.value}`} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{param.label}</dt>
            <dd className="text-sm font-semibold text-slate-800">{param.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
        >
          <Info size={16} />
          {copy.moreDetails}
        </button>
        {providerUrl ? (
          <a
            href={providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <ExternalLink size={16} />
            {copy.goToProvider}
          </a>
        ) : (
          <span
            title={locale === "ru" ? "Ссылка временно недоступна" : "Link temporarily unavailable"}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
          >
            <ExternalLink size={16} />
            {copy.goToProvider}
          </span>
        )}
        {onToggleCompare ? (
          <button
            onClick={() => onToggleCompare(item)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isCompared
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Scale size={16} />
            {isCompared
              ? locale === "ru"
                ? "В сравнении"
                : "Compared"
              : locale === "ru"
                ? "Сравнить"
                : "Compare"}
          </button>
        ) : null}
        {onToggleAlert ? (
          <button
            onClick={() => onToggleAlert(item)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isAlerted
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
            }`}
          >
            <Bell size={16} />
            {isAlerted
              ? locale === "ru"
                ? "Алерт включен"
                : "Alert on"
              : locale === "ru"
                ? "Алерт"
                : "Alert"}
          </button>
        ) : null}
      </div>

      {item.sourceUrl ? (
        <p className="mt-2 text-xs text-slate-500">
          {locale === "ru" ? "Источник:" : "Source:"}{" "}
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:underline"
          >
            {item.source === "sravni" ? "Sravni" : item.bankName}
          </a>
        </p>
      ) : null}

      {!providerUrl ? (
        <div className="mt-3">
          <ActionErrorBanner
            message={locale === "ru" ? "Ссылка на провайдера временно недоступна." : "Provider link is temporarily unavailable."}
          />
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {showDetails ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-700">
              <p className="font-medium">{item.description}</p>
              <p className="mt-2">
                {copy.updatedAt}: {new Date(item.updatedAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
