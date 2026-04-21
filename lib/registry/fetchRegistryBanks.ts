import { BANKS_BY_COUNTRY } from "@/data/banks";
import { loadRegistryBanksFromDb } from "@/lib/catalog/snapshotPersistence";
import { Country } from "@/lib/types";

export interface RegistryBankEntry {
  id: string;
  name: string;
  website: string;
  registryStatus?: "active" | "suspended" | "unknown";
  regulatorSource?: string;
}

interface RegistryConnector {
  sources: string[];
  linePatterns: RegExp[];
}

interface RegistryCandidate {
  name: string;
  website?: string;
  source: string;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<Country, { expiresAt: number; banks: RegistryBankEntry[] }>();

const CONNECTORS: Record<Country, RegistryConnector> = {
  armenia: {
    sources: ["https://www.cba.am/en/sitepages/fscfobanks.aspx"],
    linePatterns: [/(bank|բանկ)/i]
  },
  belarus: {
    sources: ["https://www.nbrb.by/engl/financialmarkets/bankingsystem"],
    linePatterns: [/(bank|banking|банк)/i]
  },
  kazakhstan: {
    sources: [
      "https://www.gov.kz/memleket/entities/ardfm?lang=en",
      "https://nationalbank.kz/en"
    ],
    linePatterns: [/(bank|banking|банк)/i]
  },
  georgia: {
    sources: ["https://nbg.gov.ge/en/page/commercial-banks"],
    linePatterns: [/(bank|ბანკ)/i]
  },
  russia: {
    sources: ["https://www.cbr.ru/banking_sector/credit/coinfo/"],
    linePatterns: [/(банк|bank)/i]
  },
  azerbaijan: {
    sources: ["https://www.cbar.az/page-42/banklar"],
    linePatterns: [/(bank|banklar|банк)/i]
  },
  uae: {
    sources: [
      "https://www.centralbank.ae/financial-system/licensed-financial-institutions/"
    ],
    linePatterns: [/(bank|islamic|financial institution)/i]
  }
};

const RUSSIA_CBR_DATASET_URL =
  "https://www.cbr.ru/banking_sector/credit/rsdataset/?Shrase=&RegionID=-1&StatusID=1&TypeID=-1&di=false";
const RUSSIA_CBR_WEBSITES_URL = "https://www.cbr.ru/banking_sector/credit/cowebsites/";

const WEBSITE_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9][a-z0-9-]{0,62})+\b(?:\/[^\s"'<>]*)?/gi;
const LEGAL_NOISE = /\b(ao|oao|zao|pao|jsc|llc|ooo|пао|ао|оао|зао|ооо)\b/gi;
const SOCIAL_WEBSITE_PATTERN =
  /(facebook|instagram|linkedin|twitter|vk\.com|youtube|t\.me|telegram|dzen|ok\.ru|rutube|pinterest|appstore|play\.google)/i;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBankName(value: string): string {
  return value
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function bankKey(value: string): string {
  return normalizeBankName(value)
    .toLowerCase()
    .replace(LEGAL_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(input: string): string {
  return decodeHtml(input).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isLikelyBankName(value: string, country: Country): boolean {
  const line = normalizeBankName(value);
  if (!line || line.length < 3 || line.length > 140) {
    return false;
  }

  const lower = line.toLowerCase();
  if (
    lower.includes("license") ||
    lower.includes("licence") ||
    lower.includes("регистрацион") ||
    lower.includes("идентификац") ||
    lower.includes("contact") ||
    lower.includes("банк россии") ||
    lower.includes("банка россии") ||
    lower.includes("о банке россии") ||
    lower.includes("обратиться в банк россии") ||
    lower.includes("банковский сектор") ||
    lower.includes("финансовым организациям") ||
    lower.includes("кредитных организаций") ||
    lower.includes("вопросник") ||
    lower.includes("нормативных актов") ||
    lower.includes("официальное опубликование") ||
    lower.includes("перейти в раздел") ||
    lower.includes("помощь по") ||
    lower.includes("информация для")
  ) {
    return false;
  }

  return CONNECTORS[country].linePatterns.some((pattern) => pattern.test(line));
}

function cleanWebsite(input: string): string {
  const candidate = input.trim().replace(/[),.;]+$/, "");
  if (!candidate) {
    return "";
  }
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  return `https://${candidate}`;
}

function stripHtmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/(li|tr|p|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSourceHost(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return url;
  }
}

function makeSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function pickPrimaryWebsite(rawLinks: string[]): string | undefined {
  for (const raw of rawLinks) {
    const normalized = cleanWebsite(raw);
    if (!/^https?:\/\//i.test(normalized)) {
      continue;
    }
    if (SOCIAL_WEBSITE_PATTERN.test(normalized)) {
      continue;
    }
    return normalized;
  }
  return undefined;
}

function extractAnchorCandidates(
  html: string,
  source: string,
  country: Country
): RegistryCandidate[] {
  const out: RegistryCandidate[] = [];
  const dedup = new Set<string>();
  const sourceHost = extractSourceHost(source);
  const sourceHostname = (() => {
    try {
      return new URL(source).hostname;
    } catch {
      return "";
    }
  })();

  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = regex.exec(html);
  while (match) {
    const hrefRaw = match[1]?.trim() ?? "";
    const anchorText = stripTags(match[2] ?? "");
    if (!isLikelyBankName(anchorText, country)) {
      match = regex.exec(html);
      continue;
    }

    const key = bankKey(anchorText);
    if (!key || dedup.has(key)) {
      match = regex.exec(html);
      continue;
    }
    dedup.add(key);

    let website: string | undefined;
    try {
      const resolved = new URL(hrefRaw, source).toString();
      const resolvedHost = new URL(resolved).hostname;
      if (resolvedHost && resolvedHost !== sourceHostname) {
        website = resolved;
      }
    } catch {
      // ignore malformed href
    }

    out.push({
      name: normalizeBankName(anchorText),
      website: website ?? sourceHost,
      source
    });
    match = regex.exec(html);
  }

  return out;
}

async function fetchRussiaCbrDatasetCandidates(): Promise<RegistryCandidate[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(RUSSIA_CBR_DATASET_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      RS?: Array<{ bnk_name?: string }>;
    };
    const rows = payload.RS ?? [];
    return rows
      .map((row) => normalizeBankName(row.bnk_name ?? ""))
      .filter((name) => isLikelyBankName(name, "russia"))
      .map((name) => ({
        name,
        source: RUSSIA_CBR_DATASET_URL
      }));
  } catch {
    return [];
  }
}

async function fetchRussiaCbrWebsiteCandidates(): Promise<RegistryCandidate[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(RUSSIA_CBR_WEBSITES_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const out: RegistryCandidate[] = [];

    for (const row of rows) {
      const cells = row.match(/<td[\s\S]*?<\/td>/gi) ?? [];
      if (cells.length < 4) {
        continue;
      }

      const name = normalizeBankName(stripTags(cells[2] ?? ""));
      if (!isLikelyBankName(name, "russia")) {
        continue;
      }

      const links =
        (cells[3] ?? "").match(/https?:\/\/[^\s"'<>]+/gi)?.map((value) => value.trim()) ?? [];
      const website = pickPrimaryWebsite(links);
      out.push({
        name,
        website,
        source: RUSSIA_CBR_WEBSITES_URL
      });
    }

    return out;
  } catch {
    return [];
  }
}

async function fetchOfficialCandidates(country: Country): Promise<RegistryCandidate[]> {
  const connector = CONNECTORS[country];
  const results: RegistryCandidate[] = [];
  const dedup = new Set<string>();

  for (const source of connector.sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const response = await fetch(source, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
        }
      }).finally(() => clearTimeout(timeout));
      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const anchorCandidates = extractAnchorCandidates(html, source, country);
      for (const candidate of anchorCandidates) {
        const key = bankKey(candidate.name);
        if (!key || dedup.has(key)) {
          continue;
        }
        dedup.add(key);
        results.push(candidate);
      }

      const lines = stripHtmlToLines(html);
      const sourceHost = extractSourceHost(source);

      for (const line of lines) {
        if (!isLikelyBankName(line, country)) {
          continue;
        }

        const name = normalizeBankName(line);
        const key = bankKey(name);
        if (dedup.has(key)) {
          continue;
        }
        dedup.add(key);

        const websites = line.match(WEBSITE_PATTERN) ?? [];
        const firstWebsite = websites[0];
        const website = firstWebsite ? cleanWebsite(firstWebsite) : undefined;

        results.push({
          name,
          website:
            website && /^https?:\/\//i.test(website)
              ? website
              : website
                ? cleanWebsite(website)
                : sourceHost,
          source
        });
      }
    } catch {
      // Continue with remaining sources and fallback logic.
    }
  }

  if (country === "russia") {
    const extra = [
      ...(await fetchRussiaCbrDatasetCandidates()),
      ...(await fetchRussiaCbrWebsiteCandidates())
    ];
    for (const item of extra) {
      const key = bankKey(item.name);
      if (!key || dedup.has(key)) {
        continue;
      }
      dedup.add(key);
      results.push(item);
    }
  }

  return results;
}

export async function fetchRegistryBanks(country: Country): Promise<RegistryBankEntry[]> {
  const cached = cache.get(country);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.banks;
  }

  const staticBanks = BANKS_BY_COUNTRY[country];
  const staticByName = new Map(
    staticBanks.map((bank) => [bankKey(bank.name), bank] as const)
  );

  const official = await fetchOfficialCandidates(country);
  const fromDb = official.length === 0 ? await loadRegistryBanksFromDb(country) : [];
  const merged = new Map<string, RegistryBankEntry>();

  for (const bank of staticBanks) {
    const key = bankKey(bank.name);
    merged.set(key, {
      id: bank.id,
      name: bank.name,
      website: bank.website,
      registryStatus: "active",
      regulatorSource: CONNECTORS[country].sources[0]
    });
  }

  for (const item of official) {
    const key = bankKey(item.name);
    if (merged.has(key)) {
      const existing = merged.get(key);
      if (existing && item.source) {
        existing.regulatorSource = existing.regulatorSource ?? item.source;
      }
      continue;
    }

    const fromStatic = staticByName.get(key);
    merged.set(key, {
      id: fromStatic?.id ?? `${country}-registry-${slugify(item.name)}`,
      name: item.name,
      website: fromStatic?.website ?? item.website ?? makeSearchUrl(item.name),
      registryStatus: "unknown",
      regulatorSource: item.source
    });
  }

  if (official.length === 0 && fromDb.length > 0) {
    for (const item of fromDb) {
      const key = bankKey(item.name);
      if (merged.has(key)) {
        continue;
      }
      merged.set(key, {
        id: item.id || `${country}-registry-${slugify(item.name)}`,
        name: item.name,
        website: item.website || makeSearchUrl(item.name),
        registryStatus: item.registryStatus ?? "unknown",
        regulatorSource: item.regulatorSource
      });
    }
  }

  const banks = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  );

  cache.set(country, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    banks
  });

  return banks;
}
