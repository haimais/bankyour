"use client";

import { useEffect, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { BankRegistryItem } from "@/lib/types";

interface BanksResponse {
  snapshotId: string;
  updatedAt: string;
  total: number;
  banks: BankRegistryItem[];
}

export function BanksRegistry() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const [data, setData] = useState<BanksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setRequestError(null);
        const response = await fetch(`/api/banks?country=${country}&lang=${locale}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch banks");
        }
        const payload = (await response.json()) as BanksResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setRequestError(
            locale === "ru"
              ? "Не удалось загрузить список банков."
              : "Could not load banks list."
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
  }, [country, locale, reloadKey]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{copy.providersTitle}</h2>
          <p className="text-sm text-slate-600">
            {loading ? copy.loadingOffers : `${data?.total ?? 0} ${copy.banksWord}`}
          </p>
        </div>
      </div>

      {requestError ? (
        <div className="mb-3 space-y-2">
          <ActionErrorBanner message={requestError} />
          <button
            type="button"
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locale === "ru" ? "Повторить" : "Retry"}
          </button>
        </div>
      ) : null}

      <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.banks ?? []).map((bank) => {
          const bankUrl = getValidExternalUrl(bank.website);
          return (
            <article
              key={bank.id}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{bank.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {locale === "ru" ? "Продуктов:" : "Products:"} {bank.productsCount}
                  {" · "}
                  {locale === "ru" ? "Статус:" : "Status:"}{" "}
                  {bank.registryStatus === "active"
                    ? locale === "ru"
                      ? "активен"
                      : "active"
                    : bank.registryStatus === "suspended"
                      ? locale === "ru"
                        ? "приостановлен"
                        : "suspended"
                      : locale === "ru"
                        ? "уточняется"
                        : "unknown"}
                </p>
                {bankUrl ? (
                  <a
                    href={bankUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-blue-700"
                  >
                    {bank.website}
                  </a>
                ) : (
                  <div className="mt-1">
                    <ActionErrorBanner
                      message={locale === "ru" ? "Ссылка банка недоступна" : "Bank link unavailable"}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
