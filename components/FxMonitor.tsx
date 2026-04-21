"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { useCountry, useCountryMeta } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { CurrencyCode, FxResponse } from "@/lib/types";

interface FxMonitorProps {
  compact?: boolean;
}

interface CurrencyUiMeta {
  code: CurrencyCode;
  emoji: string;
  ru: string;
  en: string;
}

const CURRENCY_META: CurrencyUiMeta[] = [
  { code: "USD", emoji: "🇺🇸", ru: "Доллар США", en: "US Dollar" },
  { code: "AMD", emoji: "🇦🇲", ru: "Армянский драм", en: "Armenian Dram" },
  { code: "BYN", emoji: "🇧🇾", ru: "Белорусский рубль", en: "Belarusian Ruble" },
  { code: "KZT", emoji: "🇰🇿", ru: "Казахстанский тенге", en: "Kazakhstani Tenge" },
  { code: "GEL", emoji: "🇬🇪", ru: "Грузинский лари", en: "Georgian Lari" },
  { code: "RUB", emoji: "🇷🇺", ru: "Российский рубль", en: "Russian Ruble" },
  { code: "AZN", emoji: "🇦🇿", ru: "Азербайджанский манат", en: "Azerbaijani Manat" },
  { code: "AED", emoji: "🇦🇪", ru: "Дирхам ОАЭ", en: "UAE Dirham" }
];

const CODES = CURRENCY_META.map((item) => item.code);

type WindowSize = 7 | 30 | 90;

interface ChartPoint {
  x: number;
  y: number;
  rate: number;
  date: string;
}

function asCurrency(input: string | undefined): CurrencyCode {
  if (input && CODES.includes(input as CurrencyCode)) {
    return input as CurrencyCode;
  }
  return "USD";
}

function findCurrencyMeta(code: CurrencyCode) {
  return CURRENCY_META.find((item) => item.code === code) ?? CURRENCY_META[0];
}

function formatRate(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 100) {
    return value.toFixed(2);
  }
  if (value >= 10) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildChartPoints(
  payload: FxResponse | null,
  quoteCode: CurrencyCode,
  chartWidth: number,
  chartHeight: number,
  padding: number
): ChartPoint[] {
  if (!payload) {
    return [];
  }

  const rows = payload.series
    .map((point) => ({
      date: point.date,
      rate: point.rates[quoteCode]
    }))
    .filter((point): point is { date: string; rate: number } =>
      typeof point.rate === "number" && Number.isFinite(point.rate)
    );

  if (rows.length === 0) {
    return [];
  }

  const min = Math.min(...rows.map((item) => item.rate));
  const max = Math.max(...rows.map((item) => item.rate));
  const range = max - min || 1;
  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  return rows.map((row, index) => {
    const x = padding + (index / Math.max(1, rows.length - 1)) * usableWidth;
    const normalized = (row.rate - min) / range;
    const y = chartHeight - padding - normalized * usableHeight;
    return {
      x,
      y,
      rate: row.rate,
      date: row.date
    };
  });
}

export function FxMonitor({ compact = false }: FxMonitorProps) {
  const { country } = useCountry();
  const countryMeta = useCountryMeta();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  const [windowSize, setWindowSize] = useState<WindowSize>(30);
  const [baseCode, setBaseCode] = useState<CurrencyCode>("USD");
  const [quoteCode, setQuoteCode] = useState<CurrencyCode>("RUB");
  const [payload, setPayload] = useState<FxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const local = asCurrency(countryMeta.currencyCode);
    if (local === baseCode) {
      setBaseCode("USD");
      setQuoteCode(local === "USD" ? "RUB" : local);
    } else {
      setQuoteCode(local);
    }
  }, [countryMeta.currencyCode, baseCode]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRequestError(null);
        const response = await fetch(
          `/api/fx?country=${country}&window=${windowSize}&base=${baseCode}&quote=${quoteCode}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("failed");
        }
        const data = (await response.json()) as FxResponse;
        if (!cancelled) {
          setPayload(data);
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setRequestError(
            locale === "ru"
              ? "Не удалось загрузить курсы валют."
              : "Failed to load FX rates."
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
  }, [country, locale, windowSize, baseCode, quoteCode]);

  const chartWidth = 700;
  const chartHeight = 260;
  const chartPadding = 24;

  const points = useMemo(
    () => buildChartPoints(payload, quoteCode, chartWidth, chartHeight, chartPadding),
    [payload, quoteCode]
  );

  const polyline = useMemo(
    () => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
    [points]
  );

  const latestValue = payload?.latest ?? (typeof payload?.latestRates[quoteCode] === "number" ? Number(payload.latestRates[quoteCode]) : null);

  const activeIndex = hoverIndex != null ? clamp(hoverIndex, 0, Math.max(0, points.length - 1)) : null;
  const activePoint = activeIndex != null ? points[activeIndex] : null;

  function setHoverByClientX(clientX: number, target: SVGSVGElement) {
    if (points.length === 0) {
      setHoverIndex(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const relativeX = clamp(clientX - rect.left, 0, rect.width);
    const ratio = rect.width > 0 ? relativeX / rect.width : 0;
    const index = Math.round(ratio * Math.max(0, points.length - 1));
    setHoverIndex(index);
  }

  return (
    <section className={compact ? "" : "mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"}>
      <div className="glass-card rounded-2xl border border-slate-200 p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              {locale === "ru" ? "Курсы валют" : "FX Monitor"}
            </h3>
            <p className="text-sm text-slate-600">
              {payload?.pair ?? `${baseCode}/${quoteCode}`} · {copy.updatedAt}:{" "}
              {payload ? new Date(payload.updatedAt).toLocaleString() : "—"}
            </p>
            <p className="text-xs text-slate-500">
              {locale === "ru" ? "Источник" : "Source"}: {payload?.source ?? "—"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={baseCode}
              onChange={(event) => {
                const nextBase = event.target.value as CurrencyCode;
                setBaseCode(nextBase);
                if (nextBase === quoteCode) {
                  setQuoteCode(nextBase === "USD" ? "RUB" : "USD");
                }
              }}
              className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            >
              {CURRENCY_META.map((currency) => (
                <option key={`base-${currency.code}`} value={currency.code}>
                  {currency.emoji} {currency.code}
                </option>
              ))}
            </select>

            <select
              value={quoteCode}
              onChange={(event) => {
                const nextQuote = event.target.value as CurrencyCode;
                if (nextQuote !== baseCode) {
                  setQuoteCode(nextQuote);
                }
              }}
              className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            >
              {CURRENCY_META.filter((currency) => currency.code !== baseCode).map((currency) => (
                <option key={`quote-${currency.code}`} value={currency.code}>
                  {currency.emoji} {currency.code}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
              {[7, 30, 90].map((value) => (
                <button
                  key={value}
                  onClick={() => setWindowSize(value as WindowSize)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    windowSize === value
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {requestError ? <ActionErrorBanner message={requestError} /> : null}
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        ) : null}

        {!loading && payload ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {findCurrencyMeta(baseCode).emoji} {baseCode}/{quoteCode} {findCurrencyMeta(quoteCode).emoji}
                </p>
                <p className="text-sm font-semibold text-slate-800">{formatRate(latestValue)}</p>
              </div>

              <div className="relative">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-56 w-full"
                  onMouseMove={(event) => setHoverByClientX(event.clientX, event.currentTarget)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (touch) {
                      setHoverByClientX(touch.clientX, event.currentTarget);
                    }
                  }}
                  onTouchMove={(event) => {
                    const touch = event.touches[0];
                    if (touch) {
                      setHoverByClientX(touch.clientX, event.currentTarget);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="fx-line" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="transparent" />

                  {points.length > 0 ? (
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke="url(#fx-line)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {activePoint ? (
                    <>
                      <line
                        x1={activePoint.x}
                        y1={chartPadding / 2}
                        x2={activePoint.x}
                        y2={chartHeight - chartPadding / 2}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />
                      <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#2563eb" />
                    </>
                  ) : null}
                </svg>

                {activePoint ? (
                  <div
                    className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow"
                    style={{ left: `${(activePoint.x / chartWidth) * 100}%` }}
                  >
                    <p className="font-medium text-slate-800">{formatRate(activePoint.rate)}</p>
                    <p className="text-[11px] text-slate-500">{activePoint.date}</p>
                  </div>
                ) : null}
              </div>

              {payload.stale ? (
                <p className="mt-2 text-xs text-amber-700">
                  {locale === "ru"
                    ? "Данные могут быть частично неактуальны (fallback)."
                    : "Data may be partially stale (fallback)."}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CURRENCY_META.filter((currency) => currency.code !== baseCode).map((currency) => (
                <div
                  key={currency.code}
                  className={`rounded-xl border px-3 py-2 ${
                    currency.code === quoteCode
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {currency.emoji} {currency.code}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatRate(
                      typeof payload.latestRates[currency.code] === "number"
                        ? Number(payload.latestRates[currency.code])
                        : null
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {locale === "ru" ? currency.ru : currency.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
