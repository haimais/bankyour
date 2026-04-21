"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { SearchResponse } from "@/lib/types";

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const query = (searchParams.get("q") ?? "").trim();

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!query) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setRequestError(null);
        const response = await fetch(
          `/api/search?country=${country}&lang=${locale}&q=${encodeURIComponent(query)}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const payload = (await response.json()) as SearchResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData({
            query,
            suggestions: [],
            products: { total: 0, items: [] },
            news: { total: 0, items: [] },
            academy: { total: 0, items: [] }
          });
          setRequestError(
            locale === "ru"
              ? "Не удалось выполнить поиск. Проверьте соединение и повторите."
              : "Search request failed. Check your connection and retry."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void load();
    return () => {
      cancelled = true;
    };
  }, [country, locale, query, reloadKey]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-slate-900">
        {locale === "ru" ? "Результаты поиска" : "Search Results"}
      </h1>
      <p className="mt-2 text-slate-600">
        {query ? `"${query}"` : copy.searchPlaceholder}
      </p>

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {copy.loadingOffers}
        </div>
      ) : !data ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {copy.noSearchResults}
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {requestError ? (
            <div className="space-y-2">
              <ActionErrorBanner message={requestError} />
              <RetryButton
                label={locale === "ru" ? "Повторить" : "Retry"}
                onClick={() => setReloadKey((prev) => prev + 1)}
                disabled={loading}
              />
            </div>
          ) : null}

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">
              {copy.servicesTitle} ({data.products.total})
            </h2>
            <div className="mt-3 space-y-2">
              {data.products.items.map((product) => (
                <Link
                  key={product.id}
                  href={`/services?category=${product.category}&q=${encodeURIComponent(product.name)}`}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50"
                >
                  {product.name} · {product.bankName}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">
              {copy.financialPulse} ({data.news.total})
            </h2>
            <div className="mt-3 space-y-2">
              {data.news.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/pulse/${item.stableId ?? item.id}?url=${encodeURIComponent(item.articleUrl ?? item.url)}&country=${country}&lang=${locale}`}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">
              {locale === "ru" ? "Обучение" : "Academy"} ({data.academy?.total ?? 0})
            </h2>
            <div className="mt-3 space-y-2">
              {(data.academy?.items ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={`/academy/lesson/${item.slug}`}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50"
                >
                  {item.title}
                  {item.moduleTitle ? ` · ${item.moduleTitle}` : ""}
                </Link>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
