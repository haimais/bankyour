"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { PulseDetailResponse } from "@/lib/types";

export default function PulseDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  const id = params.id;
  const requestedCountry = (searchParams.get("country") ?? country) as string;
  const requestedLang = searchParams.get("lang") ?? locale;
  const requestedUrl = searchParams.get("url") ?? "";

  const [data, setData] = useState<PulseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const sourceUrl = getValidExternalUrl(data?.originalUrl);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setRequestError(null);
        const response = await fetch(
          `/api/pulse/${id}?country=${requestedCountry}&lang=${requestedLang}${requestedUrl ? `&url=${encodeURIComponent(requestedUrl)}` : ""}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load article");
        }
        const payload = (await response.json()) as PulseDetailResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setRequestError(
            locale === "ru"
              ? "Не удалось открыть новость. Попробуйте еще раз."
              : "Could not open this news item. Please retry."
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
  }, [id, requestedCountry, requestedLang, requestedUrl, locale, reloadKey]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/news" className="text-sm font-medium text-blue-700">
        {locale === "ru" ? "← К финансовому пульсу" : "← Back to Financial Pulse"}
      </Link>

      {loading ? (
        <div className="glass-card mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {copy.newsLoading}
        </div>
      ) : !data ? (
        <div className="glass-card mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p>{requestError ?? copy.newsError}</p>
          <RetryButton
            label={locale === "ru" ? "Повторить" : "Retry"}
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          />
        </div>
      ) : (
        <article className="glass-card mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-slate-900">{data.translatedTitle}</h1>
            <p className="text-sm text-slate-500">
              {copy.updatedAt}: {new Date(data.translatedAt).toLocaleString()}
            </p>
            {data.extractionStatus ? (
              <p className="text-xs text-slate-500">
                {locale === "ru" ? "Статус извлечения" : "Extraction status"}: {data.extractionStatus}
              </p>
            ) : null}
            {data.fallbackReason ? (
              <p className="text-xs text-amber-700">
                {locale === "ru" ? "Причина fallback" : "Fallback reason"}: {data.fallbackReason}
              </p>
            ) : null}
            {data.extractionTrace?.length ? (
              <p className="text-xs text-slate-500">
                {locale === "ru" ? "Трассировка извлечения" : "Extraction trace"}:{" "}
                {data.extractionTrace.join(", ")}
              </p>
            ) : null}

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {locale === "ru" ? "Краткая сводка" : "Summary"}
            </h2>
            {data.summaryMode ? (
              <p className="mt-1 text-xs text-slate-500">
                {locale === "ru" ? "Режим сводки" : "Summary mode"}:{" "}
                {data.summaryMode === "live" ? "AI Live" : "Fallback"}
                {data.aiModel ? ` (${data.aiModel})` : ""}
              </p>
            ) : null}
            <p className="mt-2 text-slate-700">{data.aiSummary ?? data.summary}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
              {(data.aiKeyPoints ?? data.keyPoints).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {locale === "ru" ? "Полный перевод" : "Full translated text"}
            </h2>
            {data.fullTextBlocks && data.fullTextBlocks.length > 0 ? (
              <div className="mt-2 space-y-3">
                {data.fullTextBlocks.map((block) => (
                  <p key={block} className="whitespace-pre-wrap text-slate-700">
                    {block}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{data.translatedBody}</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              {locale === "ru" ? "Оригинальный заголовок" : "Original title"}:{" "}
              <span className="font-medium text-slate-900">{data.originalTitle}</span>
            </p>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-blue-700"
              >
                {copy.readSource}
              </a>
            ) : (
              <ActionErrorBanner
                message={locale === "ru" ? "Ссылка на источник временно недоступна." : "Source link is temporarily unavailable."}
              />
            )}
          </section>
        </article>
      )}
    </section>
  );
}
