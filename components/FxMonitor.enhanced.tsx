"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
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

interface ChartData {
  dates: string[];
  rates: number[];
  minRate: number;
  maxRate: number;
  currentRate: number;
  change: number;
  changePercent: number;
}

function prepareChartData(
  payload: FxResponse | null,
  quoteCode: CurrencyCode
): ChartData | null {
  if (!payload || !payload.series || payload.series.length === 0) {
    return null;
  }

  const rates: number[] = [];
  const dates: string[] = [];

  for (const point of payload.series) {
    const rate = point.rates[quoteCode];
    if (typeof rate === "number" && Number.isFinite(rate)) {
      rates.push(rate);
      dates.push(point.date);
    }
  }

  if (rates.length === 0) {
    return null;
  }

  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const currentRate = rates[rates.length - 1];
  const previousRate = rates[0];
  const change = currentRate - previousRate;
  const changePercent = previousRate !== 0 ? (change / previousRate) * 100 : 0;

  return {
    dates,
    rates,
    minRate,
    maxRate,
    currentRate,
    change,
    changePercent
  };
}

interface ChartProps {
  data: ChartData;
  width: number;
  height: number;
}

function SparklineChart({ data, width, height }: ChartProps) {
  const padding = 4;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const range = data.maxRate - data.minRate || 1;
  const points = data.rates
    .map((rate, index) => {
      const x = padding + (index / Math.max(1, data.rates.length - 1)) * usableWidth;
      const normalized = (rate - data.minRate) / range;
      const y = height - padding - normalized * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const isPositive = data.change >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const fillColor = isPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Fill area under curve */}
      <polyline
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={fillColor}
        stroke="none"
      />
      {/* Line chart */}
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2" />
    </svg>
  );
}

export function FxMonitor({ compact = false }: FxMonitorProps) {
  const { country } = useCountry();
  const countryMeta = useCountryMeta();
  const { locale } = useLocale();

  const [windowSize, setWindowSize] = useState<WindowSize>(30);
  const [baseCode, setBaseCode] = useState<CurrencyCode>("USD");
  const [quoteCode, setQuoteCode] = useState<CurrencyCode>("RUB");
  const [payload, setPayload] = useState<FxResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const chartData = useMemo(() => prepareChartData(payload, quoteCode), [payload, quoteCode]);

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

        const data = await response.json();
        if (!cancelled) {
          setPayload(data);
        }
      } catch (error) {
        if (!cancelled) {
          // Error state intentionally not shown
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
  }, [country, windowSize, baseCode, quoteCode]);

  const baseMeta = findCurrencyMeta(baseCode);
  const quoteMeta = findCurrencyMeta(quoteCode);
  const isPositive = chartData?.change ?? 0 >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-green-600" : "text-red-600";
  const bgColor = isPositive ? "bg-green-50" : "bg-red-50";

  return (
    <section className="space-y-4">
      <div className={`rounded-xl border p-4 ${compact ? "bg-slate-50" : "bg-white"}`}>
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {locale === "ru" ? "Курсы валют" : "Exchange Rates"}
            </h3>
            <p className="text-sm text-slate-600">
              {locale === "ru"
                ? `Обновлено: ${new Date().toLocaleDateString()}`
                : `Updated: ${new Date().toLocaleDateString("en-US")}`}
            </p>
          </div>

          {/* Time window buttons */}
          <div className="flex gap-2">
            {([7, 30, 90] as const).map((window) => (
              <button
                key={window}
                onClick={() => setWindowSize(window)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  windowSize === window
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {window}d
              </button>
            ))}
          </div>
        </div>

        {/* Currency selectors */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {locale === "ru" ? "Из" : "From"}
            </label>
            <select
              value={baseCode}
              onChange={(e) => setBaseCode(asCurrency(e.target.value))}
              className="w-full rounded border border-slate-200 px-3 py-2 text-slate-900"
            >
              {CURRENCY_META.map((meta) => (
                <option key={meta.code} value={meta.code}>
                  {meta.code} - {locale === "ru" ? meta.ru : meta.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {locale === "ru" ? "В" : "To"}
            </label>
            <select
              value={quoteCode}
              onChange={(e) => setQuoteCode(asCurrency(e.target.value))}
              className="w-full rounded border border-slate-200 px-3 py-2 text-slate-900"
            >
              {CURRENCY_META.map((meta) => (
                <option key={meta.code} value={meta.code}>
                  {meta.code} - {locale === "ru" ? meta.ru : meta.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rate display */}
        {!loading && chartData && (
          <div className={`rounded-lg p-4 ${bgColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  {formatRate(chartData.currentRate)}
                </div>
                <div className="text-sm text-slate-600">
                  1 {baseMeta.code} = {formatRate(chartData.currentRate)} {quoteMeta.code}
                </div>
              </div>
              <div className={`flex items-center gap-2 ${trendColor}`}>
                <TrendIcon size={24} />
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {formatRate(chartData.change)}
                  </div>
                  <div className="text-sm">({chartData.changePercent.toFixed(2)}%)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {!loading && chartData && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <SparklineChart data={chartData} width={300} height={120} />
          </div>
        )}

        {loading && (
          <div className="flex h-32 items-center justify-center text-slate-500">
            {locale === "ru" ? "Загрузка..." : "Loading..."}
          </div>
        )}
      </div>
    </section>
  );
}
