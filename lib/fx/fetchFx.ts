import { Country, CurrencyCode, FxHistoryResponse, FxResponse } from "@/lib/types";

const FX_CODES: CurrencyCode[] = ["USD", "AMD", "BYN", "KZT", "GEL", "RUB", "AZN", "AED"];
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

const COUNTRY_TO_CODE: Record<Country, CurrencyCode> = {
  armenia: "AMD",
  belarus: "BYN",
  kazakhstan: "KZT",
  georgia: "GEL",
  russia: "RUB",
  azerbaijan: "AZN",
  uae: "AED"
};

const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  AMD: 401,
  BYN: 3.25,
  KZT: 492,
  GEL: 2.78,
  RUB: 92.5,
  AZN: 1.7,
  AED: 3.67
};

type FxCacheValue = {
  expiresAt: number;
  value: FxResponse;
};

const cache = new Map<string, FxCacheValue>();

function clampWindow(input: number): 7 | 30 | 90 {
  if (input === 7 || input === 30 || input === 90) {
    return input;
  }
  return 30;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function asCurrency(input: string | undefined | null): CurrencyCode | null {
  if (!input) return null;
  const normalized = input.toUpperCase();
  if (FX_CODES.includes(normalized as CurrencyCode)) {
    return normalized as CurrencyCode;
  }
  return null;
}

function chooseQuote(base: CurrencyCode, country: Country, quoteInput?: string): CurrencyCode {
  const selected = asCurrency(quoteInput);
  if (selected && selected !== base) {
    return selected;
  }
  const local = COUNTRY_TO_CODE[country];
  if (local !== base) {
    return local;
  }
  return base === "USD" ? "RUB" : "USD";
}

function toNumber(value: string): number | null {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function convertFromUsd(
  usdRates: Record<CurrencyCode, number>,
  base: CurrencyCode,
  quote: CurrencyCode
): number {
  const baseRate = usdRates[base] || 1;
  const quoteRate = usdRates[quote] || 1;
  return quoteRate / baseRate;
}

function buildRatesForBase(
  usdRates: Record<CurrencyCode, number>,
  base: CurrencyCode
): Partial<Record<CurrencyCode, number>> {
  const rates: Partial<Record<CurrencyCode, number>> = { [base]: 1 };
  for (const code of FX_CODES) {
    if (code === base) {
      continue;
    }
    rates[code] = Number(convertFromUsd(usdRates, base, code).toFixed(6));
  }
  return rates;
}

function buildFallbackSeries(base: CurrencyCode, window: 7 | 30 | 90): FxResponse["series"] {
  const now = new Date();
  const out: FxResponse["series"] = [];

  for (let i = window - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - i);

    const usdRates = Object.fromEntries(
      FX_CODES.map((code, idx) => {
        const baseRate = FALLBACK_USD_RATES[code];
        const drift = Math.sin((window - i + idx) / 5) * (idx <= 1 ? 0.02 : 0.03 * baseRate);
        const value = Number((baseRate + drift).toFixed(6));
        return [code, value];
      })
    ) as Record<CurrencyCode, number>;

    out.push({
      date: formatDate(date),
      rates: buildRatesForBase(usdRates, base)
    });
  }

  return out;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as {
      rates?: Record<string, Record<string, number>>;
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonUnknown(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFrankfurterSeries(
  base: CurrencyCode,
  input: Record<string, Record<string, number>> | undefined
): FxResponse["series"] {
  if (!input) return [];
  return Object.entries(input)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rates]) => {
      const mapped: Partial<Record<CurrencyCode, number>> = {
        [base]: 1
      };
      for (const code of FX_CODES) {
        if (code === base) {
          continue;
        }
        const value = rates[code];
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          mapped[code] = Number(value.toFixed(6));
        }
      }
      return { date, rates: mapped };
    })
    .filter((point) => Object.keys(point.rates).length > 1);
}

function normalizeFxRatesApiSeries(
  base: CurrencyCode,
  input: unknown
): FxResponse["series"] {
  if (!input || typeof input !== "object") return [];
  const payload = input as {
    rates?: Record<string, Record<string, number>>;
  };
  if (!payload.rates || typeof payload.rates !== "object") {
    return [];
  }

  const points = Object.entries(payload.rates)
    .map(([rawDate, rates]) => {
      const date = rawDate.slice(0, 10);
      const mapped: Partial<Record<CurrencyCode, number>> = {
        [base]: 1
      };
      for (const code of FX_CODES) {
        if (code === base) continue;
        const value = rates?.[code];
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          mapped[code] = Number(value.toFixed(6));
        }
      }
      return {
        date,
        rates: mapped
      };
    })
    .filter((point) => Object.keys(point.rates).length > 1)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Keep one point per day.
  const deduped = new Map<string, FxResponse["series"][number]>();
  points.forEach((point) => {
    deduped.set(point.date, point);
  });

  return Array.from(deduped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchFrankfurterSeries(base: CurrencyCode, window: 7 | 30 | 90) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (window - 1));

  const to = FX_CODES.filter((code) => code !== base).join(",");
  const endpoint =
    `https://api.frankfurter.app/${formatDate(start)}..${formatDate(end)}?from=${base}&to=${to}`;

  const payload = await fetchJson(endpoint);
  return normalizeFrankfurterSeries(base, payload.rates);
}

async function fetchFxRatesApiSeries(base: CurrencyCode, window: 7 | 30 | 90) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (window - 1));
  const to = FX_CODES.filter((code) => code !== base).join(",");
  const endpoint =
    `https://api.fxratesapi.com/timeseries?base=${base}&start_date=${formatDate(start)}&end_date=${formatDate(end)}&currencies=${to}`;
  const payload = await fetchJsonUnknown(endpoint);
  return normalizeFxRatesApiSeries(base, payload);
}

function parseGoogleQuoteRate(html: string, quote: CurrencyCode): number | null {
  const text = html
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&");

  const quoteNames: Partial<Record<CurrencyCode, string>> = {
    RUB: "Russian Ruble",
    AMD: "Armenian Dram",
    BYN: "Belarusian Ruble",
    KZT: "Kazakhstani Tenge",
    GEL: "Georgian Lari",
    AZN: "Azerbaijani Manat",
    AED: "United Arab Emirates Dirham",
    USD: "US Dollar"
  };

  const candidates = [
    new RegExp(`1\\s*[A-Z]{3}\\s*=\\s*([0-9.,]+)\\s*${quote}`, "i"),
    new RegExp(`([0-9.,]+)\\s*${quoteNames[quote] ?? quote}`, "i"),
    new RegExp(`\\\"([0-9]+(?:\\.[0-9]+)?)\\\"\\s*,\\s*\\\"${quote}\\\"`, "i")
  ];

  for (const pattern of candidates) {
    const match = text.match(pattern);
    const value = match?.[1] ? toNumber(match[1]) : null;
    if (value != null) {
      return value;
    }
  }

  return null;
}

async function fetchGoogleLatest(base: CurrencyCode, quote: CurrencyCode): Promise<number | null> {
  try {
    const query = encodeURIComponent(`${base} to ${quote}`);
    const html = await fetchText(`https://www.google.com/search?q=${query}&hl=en`);
    return parseGoogleQuoteRate(html, quote);
  } catch {
    return null;
  }
}

export async function getFxSnapshot(input: {
  country: Country;
  window: number;
  base?: string;
  quote?: string;
}): Promise<FxResponse> {
  const window = clampWindow(input.window);
  const base = asCurrency(input.base) ?? "USD";
  const quote = chooseQuote(base, input.country, input.quote);

  const key = `${input.country}:${window}:${base}:${quote}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let series = buildFallbackSeries(base, window);
  let source: FxResponse["source"] = "fallback";
  let stale = true;

  try {
    const fxRatesSeries = await fetchFxRatesApiSeries(base, window);
    if (fxRatesSeries.length > 0) {
      series = fxRatesSeries;
      source = "fxratesapi";
      stale = false;
    }
  } catch {
    // Ignore and try secondary provider.
  }

  if (source === "fallback") {
    try {
      const frankfurterSeries = await fetchFrankfurterSeries(base, window);
      if (frankfurterSeries.length > 0) {
        series = frankfurterSeries;
        source = "frankfurter";
        stale = false;
      }
    } catch {
      // fallback series is already prepared
    }
  }

  const latestRates = { ...(series[series.length - 1]?.rates ?? {}) };
  let latest = typeof latestRates[quote] === "number" ? Number(latestRates[quote]) : null;

  // Keep Google quote only as fallback.
  // When frankfurter series is available it is usually more stable and internally consistent.
  if (source === "fallback") {
    const googleLatest = await fetchGoogleLatest(base, quote);
    if (googleLatest != null) {
      latest = googleLatest;
      latestRates[quote] = googleLatest;
      if (series.length > 0) {
        series = [
          ...series.slice(0, -1),
          { ...series[series.length - 1], rates: { ...series[series.length - 1].rates, [quote]: googleLatest } }
        ];
      }
      source = "google";
      stale = false;
    }
  }

  const value: FxResponse = {
    base,
    quote,
    pair: `${base}/${quote}`,
    country: input.country,
    window,
    source,
    stale,
    updatedAt: new Date().toISOString(),
    latestRates,
    latest,
    supportedCurrencies: FX_CODES,
    series
  };

  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value
  });

  return value;
}

export async function getFxPairHistory(input: {
  country: Country;
  pair?: string;
  base?: string;
  quote?: string;
  window: number;
}): Promise<FxHistoryResponse> {
  const pairParts = input.pair?.toUpperCase().split("/");
  const baseFromPair = pairParts?.[0];
  const quoteFromPair = pairParts?.[1];

  const base = asCurrency(input.base ?? baseFromPair) ?? "USD";
  const quote = chooseQuote(base, input.country, input.quote ?? quoteFromPair);

  const snapshot = await getFxSnapshot({
    country: input.country,
    window: input.window,
    base,
    quote
  });

  return {
    base,
    quote,
    pair: `${base}/${quote}`,
    window: clampWindow(input.window),
    source: snapshot.source,
    stale: snapshot.stale,
    updatedAt: snapshot.updatedAt,
    latest: snapshot.latest,
    series: snapshot.series
      .map((point) => ({
        date: point.date,
        rate: Number(point.rates[quote] ?? NaN)
      }))
      .filter((point) => Number.isFinite(point.rate))
  };
}

export const FX_SUPPORTED_CODES = FX_CODES;
export const FX_COUNTRY_TO_CODE = COUNTRY_TO_CODE;
