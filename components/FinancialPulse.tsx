"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { NewsCard } from "@/components/NewsCard";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { COUNTRY_LABELS, UI_TEXT } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { NewsItem, PulseDetailResponse } from "@/lib/types";

const REFRESH_INTERVAL_MS = 30_000;

interface NewsApiResponse {
  items: NewsItem[];
  fallback: boolean;
}

function getRelativeTimeLabel(publishedAt: string, now: number, locale: string) {
  const diffMs = Math.max(0, now - new Date(publishedAt).getTime());
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) {
    return locale === "ru" ? "только что" : "just now";
  }

  if (minutes < 60) {
    if (locale === "ru") {
      return `${minutes} мин назад`;
    }
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (locale === "ru") {
      return `${hours} ч назад`;
    }
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (locale === "ru") {
    return `${days} дн назад`;
  }
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function translateTag(tag: string, locale: string): string {
  const dictionary: Record<string, Record<string, string>> = {
    ru: { Banking: "Банкинг", Stocks: "Акции", Forex: "Форекс", Fintech: "Финтех", Crypto: "Крипто" },
    hy: { Banking: "Բանկինգ", Stocks: "Բաժնետոմսեր", Forex: "Ֆորեքս", Fintech: "Ֆինտեխ", Crypto: "Կրիպտո" },
    be: { Banking: "Банкінг", Stocks: "Акцыі", Forex: "Форэкс", Fintech: "Фінтэх", Crypto: "Крыпта" },
    kk: { Banking: "Банк секторы", Stocks: "Акциялар", Forex: "Форекс", Fintech: "Финтех", Crypto: "Крипто" },
    ka: { Banking: "საბანკო", Stocks: "აქციები", Forex: "ფორექსი", Fintech: "ფინტექი", Crypto: "კრიპტო" },
    az: { Banking: "Bankçılıq", Stocks: "Səhmlər", Forex: "Forex", Fintech: "Fintex", Crypto: "Kripto" },
    ar: { Banking: "المصرفية", Stocks: "الأسهم", Forex: "فوركس", Fintech: "فينتك", Crypto: "العملات الرقمية" },
    tr: { Banking: "Bankacılık", Stocks: "Hisseler", Forex: "Forex", Fintech: "Fintek", Crypto: "Kripto" }
  };

  return dictionary[locale]?.[tag] ?? tag;
}

export function FinancialPulse() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const countryLabel = COUNTRY_LABELS[locale][country];

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openedNews, setOpenedNews] = useState<NewsItem | null>(null);
  const [openedDetail, setOpenedDetail] = useState<PulseDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      try {
        setRequestError(null);
        const response = await fetch(`/api/pulse?country=${country}&locale=${locale}&strictFinance=1`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`News request failed: ${response.status}`);
        }
        const data = (await response.json()) as NewsApiResponse;
        if (cancelled) {
          return;
        }
        setItems(data.items);
        setFallback(data.fallback);
        setNow(Date.now());
      } catch {
        if (cancelled) {
          return;
        }
        setFallback(true);
        setRequestError(
          locale === "ru"
            ? "Не удалось обновить финансовый пульс. Показаны последние доступные данные."
            : "Could not refresh Financial Pulse. Showing last available data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadNews();
    const timer = window.setInterval(() => {
      void loadNews();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [country, locale, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const activeNews = openedNews;
    if (!activeNews) {
      setOpenedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    async function loadDetail() {
      try {
        if (!activeNews) {
          return;
        }
        setDetailError(null);
        setDetailLoading(true);
        const targetId = activeNews.stableId ?? activeNews.id;
        const url = activeNews.articleUrl ?? activeNews.url;
        const response = await fetch(
          `/api/pulse/${targetId}?country=${country}&lang=${locale}&url=${encodeURIComponent(url)}`,
          {
            cache: "no-store"
          }
        );
        if (!response.ok) {
          throw new Error("Failed to open pulse detail");
        }
        const payload = (await response.json()) as PulseDetailResponse;
        if (!cancelled) {
          setOpenedDetail(payload);
        }
      } catch {
        if (!cancelled) {
          setOpenedDetail(null);
          setDetailError(
            locale === "ru"
              ? "Не удалось загрузить полный текст статьи."
              : "Could not load full article text."
          );
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [openedNews, country, locale]);

  const visibleNews = useMemo(() => items.slice(0, 6), [items]);

  return (
    <section id="financial-pulse" className="border-y border-slate-200 bg-white/70 py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-semibold text-slate-900">{copy.financialPulse}</h2>
          <p className="mt-2 max-w-3xl text-slate-600">
            {copy.pulseSubtitle} {countryLabel}. {copy.newsRefreshNote}
          </p>
          <div className="mt-2 text-sm text-slate-500">
            {loading ? copy.newsLoading : null}
            {fallback ? <span className="ml-2 text-amber-700">{copy.newsError}</span> : null}
          </div>
          {requestError ? (
            <div className="mt-3 space-y-2">
              <ActionErrorBanner message={requestError} />
              <RetryButton
                label={locale === "ru" ? "Повторить" : "Retry"}
                onClick={() => setReloadKey((prev) => prev + 1)}
                disabled={loading}
              />
            </div>
          ) : null}
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleNews.map((item) => (
            <NewsCard
              key={item.id}
              item={{
                ...item,
                tag: translateTag(item.tag, locale),
                country:
                  item.country === COUNTRY_LABELS.en[country]
                    ? countryLabel
                    : locale === "ru"
                      ? "Регион"
                      : "Regional"
              }}
              relativeTime={getRelativeTimeLabel(item.publishedAt, now, locale)}
              readSourceLabel={copy.readSource}
              readOnSiteLabel={copy.moreDetails}
              sourceUnavailableLabel={
                locale === "ru"
                  ? "Ссылка на источник временно недоступна."
                  : "Source link is temporarily unavailable."
              }
              detailHref={`/pulse/${item.stableId ?? item.id}?url=${encodeURIComponent(item.articleUrl ?? item.url)}&country=${country}&lang=${locale}`}
              onOpenDetail={() => setOpenedNews(item)}
            />
          ))}
        </div>
      </div>

      {openedNews ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/50 p-2 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card max-h-[92vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card sm:mx-auto sm:max-w-5xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">
                {openedDetail?.translatedTitle ?? openedNews.title}
              </h3>
              <button
                onClick={() => setOpenedNews(null)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                {locale === "ru" ? "Закрыть" : "Close"}
              </button>
            </div>

            <div className="max-h-[calc(92vh-58px)] overflow-y-auto px-4 py-4">
              {detailLoading ? (
                <p className="text-sm text-slate-600">{copy.newsLoading}</p>
              ) : detailError ? (
                <ActionErrorBanner message={detailError} />
              ) : openedDetail ? (
                <div className="space-y-5">
                  <section>
                    <h4 className="text-base font-semibold text-slate-900">
                      {locale === "ru" ? "Краткая сводка" : "Summary"}
                    </h4>
                    <p className="mt-2 text-sm text-slate-700">
                      {openedDetail.aiSummary ?? openedDetail.summary}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(openedDetail.aiKeyPoints ?? openedDetail.keyPoints).map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-base font-semibold text-slate-900">
                      {locale === "ru" ? "Полный перевод" : "Full translated text"}
                    </h4>
                    <div className="mt-2 space-y-3">
                      {(openedDetail.fullTextBlocks ?? [openedDetail.translatedBody]).map((block, index) => (
                        <p key={`translated-${index}`} className="text-sm leading-6 text-slate-700">
                          {block}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-base font-semibold text-slate-900">
                      {locale === "ru" ? "Оригинальный текст" : "Original text"}
                    </h4>
                    <div className="mt-2 space-y-3">
                      {(openedDetail.originalTextBlocks ?? []).map((block, index) => (
                        <p key={`original-${index}`} className="text-sm leading-6 text-slate-600">
                          {block}
                        </p>
                      ))}
                      {(!openedDetail.originalTextBlocks || openedDetail.originalTextBlocks.length === 0) && (
                        <p className="text-sm text-slate-500">
                          {locale === "ru" ? "Оригинал недоступен в кэше." : "Original text is not cached."}
                        </p>
                      )}
                    </div>
                  </section>

                  <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
                    {getValidExternalUrl(openedDetail.originalUrl) ? (
                      <a
                        href={openedDetail.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        {copy.readSource}
                      </a>
                    ) : null}
                    <Link
                      href={`/pulse/${openedNews.stableId ?? openedNews.id}?url=${encodeURIComponent(
                        openedNews.articleUrl ?? openedNews.url
                      )}&country=${country}&lang=${locale}`}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {locale === "ru" ? "Открыть полную страницу" : "Open full page"}
                    </Link>
                    {openedDetail.summaryMode ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {locale === "ru" ? "Режим" : "Mode"}: {openedDetail.summaryMode}
                      </span>
                    ) : null}
                    {openedDetail.extractionStatus ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {locale === "ru" ? "Извлечение" : "Extraction"}: {openedDetail.extractionStatus}
                      </span>
                    ) : null}
                    {openedDetail.fallbackReason ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        {locale === "ru" ? "Fallback" : "Fallback"}: {openedDetail.fallbackReason}
                      </span>
                    ) : null}
                    {openedDetail.extractionTrace?.length ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {locale === "ru" ? "Трассировка" : "Trace"}:{" "}
                        {openedDetail.extractionTrace.slice(0, 2).join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
