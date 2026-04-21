import { BANKS_BY_COUNTRY, BankCatalogEntry, getLogoUrl } from "@/data/banks";
import { COUNTRIES_BY_VALUE } from "@/data/countries";
import { fetchRegistryBanks, RegistryBankEntry } from "@/lib/registry/fetchRegistryBanks";
import { getSravniHealth, getSravniSession } from "@/lib/sources/sravniSession";
import {
  Country,
  CountryOffers,
  Locale,
  Offer,
  ProviderCatalogItem,
  ServiceFetchMeta,
  ServiceSummaryItem,
  ServiceType,
  ServicesApiResponse
} from "@/lib/types";

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7_000;
const MAX_OFFERS_PER_BANK = 60;
const SERVICE_URL_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SERVICE_KEYS: ServiceType[] = [
  "cards",
  "loans",
  "deposits",
  "business",
  "documents"
];

const countryCache = new Map<
  string,
  {
    expiresAt: number;
    response: ServicesApiResponse;
  }
>();
const serviceUrlCache = new Map<string, { expiresAt: number; url: string }>();

interface RuntimeBankEntry extends BankCatalogEntry {
  fromRegistry: boolean;
}

function getServiceBankLimits(serviceType: ServiceType): {
  total: number;
  registryWithoutDirect: number;
} {
  if (serviceType === "loans") {
    return { total: 900, registryWithoutDirect: 860 };
  }
  if (serviceType === "deposits") {
    return { total: 900, registryWithoutDirect: 860 };
  }
  if (serviceType === "cards") {
    return { total: 420, registryWithoutDirect: 360 };
  }
  return { total: 320, registryWithoutDirect: 280 };
}

function getServiceUrlLimit(serviceType: ServiceType): number {
  if (serviceType === "loans" || serviceType === "deposits") {
    return 18;
  }
  return 12;
}

function getServiceConcurrency(serviceType: ServiceType): number {
  if (serviceType === "loans" || serviceType === "deposits") {
    return 28;
  }
  if (serviceType === "cards") {
    return 22;
  }
  return 16;
}

function isSearchWebsite(url?: string): boolean {
  if (!url) {
    return true;
  }
  return /google\.[a-z.]+\/search\?/i.test(url);
}

const LOCALIZED = {
  ru: {
    cards: "карта",
    loans: "кредит",
    deposits: "вклад",
    business: "бизнес-услуга",
    documents: "поддержка документов",
    cashback: "Кэшбэк",
    annualFee: "Обслуживание",
    currency: "Валюта",
    limit: "Лимит",
    rate: "Ставка",
    term: "Срок",
    minAmount: "Минимальная сумма",
    decision: "Решение",
    yield: "Доходность",
    horizon: "Горизонт",
    monthlyFee: "Ежемесячный тариф",
    connection: "Подключение",
    onboarding: "Онбординг",
    notes: "Комментарий",
    serviceFee: "Стоимость услуги",
    timeline: "Срок",
    scope: "Объем помощи",
    generated: "Данные получены с публичных страниц",
    verify: "Перед оформлением проверьте точные условия на официальном сайте.",
    providerRules: "По правилам банка",
    noFix: "Без фиксированного срока",
    from: "от",
    upTo: "до",
    support: "Поддержка оформления и проверки пакета документов."
  },
  en: {
    cards: "card",
    loans: "loan",
    deposits: "deposit",
    business: "business service",
    documents: "document assistance",
    cashback: "Cashback",
    annualFee: "Annual fee",
    currency: "Currency",
    limit: "Limit",
    rate: "Rate",
    term: "Term",
    minAmount: "Minimum amount",
    decision: "Decision",
    yield: "Yield",
    horizon: "Horizon",
    monthlyFee: "Monthly fee",
    connection: "Connection",
    onboarding: "Onboarding",
    notes: "Notes",
    serviceFee: "Service fee",
    timeline: "Timeline",
    scope: "Scope",
    generated: "Data parsed from public provider pages.",
    verify: "Always verify exact terms on the provider official website.",
    providerRules: "Provider rules apply",
    noFix: "No fixed lock-up",
    from: "from",
    upTo: "up to",
    support: "Support with application and document package checks."
  }
} as const;

function getLocaleCopy(locale: Locale) {
  return LOCALIZED[locale === "ru" ? "ru" : "en"];
}

function normalizeBankName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^0-9a-zа-яё]+/gi, " ")
    .replace(/\b(bank|банк|банка|банком|banking)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeBankSource(country: Country, registryBanks: RegistryBankEntry[]): RuntimeBankEntry[] {
  const staticBanks = BANKS_BY_COUNTRY[country];
  const staticByKey = new Map(
    staticBanks.map((bank) => [normalizeBankName(bank.name), bank] as const)
  );

  const merged = new Map<string, RuntimeBankEntry>();

  staticBanks.forEach((bank) => {
    const key = normalizeBankName(bank.name);
    merged.set(key, {
      ...bank,
      fromRegistry: false
    });
  });

  registryBanks.forEach((bank) => {
    const key = normalizeBankName(bank.name);
    const staticMatch = staticByKey.get(key);
    const serviceUrls = staticMatch?.serviceUrls ?? {};
    const id = staticMatch?.id ?? bank.id;
    merged.set(key, {
      id,
      name: staticMatch?.name ?? bank.name,
      website: staticMatch?.website ?? bank.website,
      serviceUrls,
      fromRegistry: true
    });
  });

  return Array.from(merged.values());
}

const NOISE_KEYWORDS = [
  "отзыв",
  "отзывы",
  "review",
  "rating",
  "рейтинг",
  "journal",
  "журнал",
  "news",
  "новости",
  "captcha",
  "вы не робот",
  "подтвердите",
  "комментар",
  "discussion"
];

function hasNoiseKeyword(input: string): boolean {
  const lower = input.toLowerCase();
  return NOISE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlKeepScripts(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUnique(input: string, regex: RegExp, limit = 8): string[] {
  const items: string[] = [];
  const seen = new Set<string>();
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);
  let match = globalRegex.exec(input);

  while (match) {
    const rawValue = match[1]?.trim();
    const value = rawValue?.replace(/\s+/g, " ").trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      items.push(value);
      if (items.length >= limit) {
        break;
      }
    }
    match = globalRegex.exec(input);
  }

  return items;
}

function extractRates(text: string, limit: number): string[] {
  return extractUnique(
    text,
    /((?:from|up to|до|от)?\s?\d{1,3}(?:[.,]\d{1,2})?\s?%)/gi,
    limit
  );
}

function extractTerms(text: string, limit: number): string[] {
  return extractUnique(
    text,
    /(\d{1,4}\s?(?:days?|day|months?|month|years?|year|дн(?:ей|я)?|день|месяц(?:а|ев)?|мес(?:яц)?\.?|год(?:а|лет)?))/gi,
    limit
  );
}

function extractAmounts(text: string, limit: number): string[] {
  const byCodeFirst = extractUnique(
    text,
    /((?:(?:AED|BYN|RUB|KZT|AMD|AZN|GEL|USD|EUR|Br)\s+\d[\d\s.,]*(?:\s?(?:тыс\.?|млн|млрд|million|billion|k|m|bn))?|(?:₽|₸|֏|₼|₾)\s?\d[\d\s.,]*(?:\s?(?:тыс\.?|млн|млрд|million|billion|k|m|bn))?))/gi,
    limit
  );
  const byNumberFirst = extractUnique(
    text,
    /(\d[\d\s.,]*(?:\s?(?:тыс\.?|млн|млрд|million|billion|k|m|bn))?\s?(?:AED|BYN|RUB|KZT|AMD|AZN|GEL|USD|EUR|₽|₸|֏|₼|₾|Br))/gi,
    limit
  );

  return Array.from(new Set([...byCodeFirst, ...byNumberFirst])).slice(0, limit);
}

function extractFinancialSignals(text: string, limit: number) {
  return {
    rates: extractRates(text, limit),
    terms: extractTerms(text, limit),
    amounts: extractAmounts(text, limit)
  };
}

interface OfferContext {
  name: string;
  text: string;
  source: "block" | "heading" | "page";
}

function parseRateNumber(value: string): number | null {
  const match = value.match(/(\d{1,3}(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTermMonths(value: string): number | null {
  const normalized = value.toLowerCase();
  const match = normalized.match(/(\d{1,4}(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (/(day|days|дн|день)/i.test(normalized)) return amount / 30;
  if (/(year|years|yr|год|лет)/i.test(normalized)) return amount * 12;
  return amount;
}

function parseAmountNumber(value: string): number | null {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/(\d[\d.,]*)/);
  if (!match) return null;
  let amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (/(млрд|billion|bn)/i.test(normalized)) amount *= 1_000_000_000;
  else if (/(млн|million|mm?\b|m\b)/i.test(normalized)) amount *= 1_000_000;
  else if (/(тыс|thousand|k\b)/i.test(normalized)) amount *= 1_000;

  return amount;
}

function filterRatesByService(serviceType: ServiceType, rates: string[]): string[] {
  return rates.filter((value) => {
    const rate = parseRateNumber(value);
    if (rate == null) return false;
    if (serviceType === "deposits") return rate > 0 && rate <= 40;
    if (serviceType === "loans") return rate > 0 && rate <= 90;
    if (serviceType === "cards") return rate >= 0 && rate <= 50;
    return rate >= 0 && rate <= 100;
  });
}

function filterTermsByService(serviceType: ServiceType, terms: string[]): string[] {
  return terms.filter((value) => {
    const months = parseTermMonths(value);
    if (months == null) return false;
    if (serviceType === "deposits") return months > 0 && months <= 240;
    if (serviceType === "loans") return months >= 1 && months <= 480;
    return months > 0 && months <= 600;
  });
}

function filterAmountsByService(serviceType: ServiceType, amounts: string[]): string[] {
  return amounts.filter((value) => {
    const amount = parseAmountNumber(value);
    if (amount == null) return false;
    if (serviceType === "deposits") return amount >= 10 && amount <= 1_000_000_000_000;
    if (serviceType === "loans") return amount >= 100 && amount <= 1_000_000_000_000;
    return amount >= 1 && amount <= 1_000_000_000_000;
  });
}

function stripHtmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/(li|tr|td|p|div|section|article|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function containsServiceKeyword(text: string, serviceType: ServiceType): boolean {
  const lower = text.toLowerCase();
  return getServiceKeywords(serviceType).some((keyword) => lower.includes(keyword));
}

function looksLikeOfferTitle(value: string): boolean {
  if (!isLikelyOfferName(value)) {
    return false;
  }
  if (/^\d+\s*$/.test(value.trim())) {
    return false;
  }
  return true;
}

function isGenericCategoryHeading(value: string): boolean {
  const lower = value.toLowerCase().trim();
  const genericPatterns = [
    /^все вклады/,
    /^лучшие вклады/,
    /^вклады и накопительные/,
    /^процентные ставки/,
    /^сроки/,
    /^условия/,
    /^тариф/,
    /^для бизнеса/,
    /^малый и средний бизнес/,
    /^средний и крупный бизнес/,
    /^обслуживание/,
    /^при оформлении/,
    /^аккредит/,
    /^что важно знать/,
    /^сколько вкладов/,
    /^процент(ы)? по/,
    /^необходимые документ/,
    /^надежность и безопасность/,
    /^памятка/,
    /^общие условия/,
    /^кредитование физических лиц/,
    /^перейти в раздел/,
    /^вопросы и ответы/,
    /^помощь по/,
    /^подберите/,
    /^ипотека доступна каждому/,
    /^целевое назначение/,
    /^подобрать/,
    /^оформить/,
    /^онлайн заявка/,
    /^all deposits/,
    /^best deposits/,
    /^interest rates/,
    /^terms$/,
    /^conditions$/,
    /^tariff/,
    /^apply online/
  ];
  if (genericPatterns.some((pattern) => pattern.test(lower))) {
    return true;
  }
  return (
    lower === "deposits" ||
    lower === "deposit" ||
    lower === "loans" ||
    lower === "loan" ||
    lower === "вклады" ||
    lower === "вклады в банках" ||
    lower === "кредиты" ||
    lower === "потребительские кредиты" ||
    lower === "процентные ставки" ||
    lower === "срок кредитования" ||
    lower === "сумма кредитования"
  );
}

function looksLikeProductTitle(value: string): boolean {
  if (!looksLikeOfferTitle(value)) {
    return false;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const words = normalized.split(" ");
  if (words.length > 8) {
    return false;
  }
  if (/[?]/.test(normalized)) {
    return false;
  }
  if (
    /^(как|почему|когда|зачем|можно|нужно|что|в отличие|how|why|when|can|what)\b/i.test(lower)
  ) {
    return false;
  }
  if (/\(\s*с\s*\d{1,2}/i.test(normalized)) {
    return false;
  }
  if (
    /^(валюта|currency|ставка|rate|срок|term|min amount|минимальная сумма)\b/i.test(lower)
  ) {
    return false;
  }
  if (/[:]/.test(normalized) && /(валют|currency|term|срок|rate|ставк|min|миним)/i.test(lower)) {
    return false;
  }
  if (/(как|почему|в отличие|как открыть|может ли|можно ли)/i.test(lower)) {
    return false;
  }
  if (isGenericCategoryHeading(normalized)) {
    return false;
  }
  return true;
}

function scoreFinancialSignalDensity(text: string): number {
  const rates = extractRates(text, 8).length;
  const terms = extractTerms(text, 8).length;
  const amounts = extractAmounts(text, 8).length;
  return rates * 3 + terms * 2 + amounts * 2;
}

function extractOfferContexts(
  html: string,
  serviceType: ServiceType,
  bankName: string,
  locale: Locale,
  sourceUrl?: string
): OfferContext[] {
  const contexts: OfferContext[] = [];
  const seen = new Set<string>();

  const blockPattern =
    /<(article|section|li|tr|div)[^>]*(?:card|offer|product|tariff|plan|item|result|table|tile)[^>]*>([\s\S]{80,3400}?)<\/\1>/gi;
  let blockMatch = blockPattern.exec(html);
  while (blockMatch) {
    const rawBlockHtml = blockMatch[0] ?? "";
    const blockText = stripHtml(rawBlockHtml);
    if (blockText.length < 40 || blockText.length > 2600 || hasNoiseKeyword(blockText)) {
      blockMatch = blockPattern.exec(html);
      continue;
    }
    if (!containsServiceKeyword(blockText, serviceType) && scoreFinancialSignalDensity(blockText) < 3) {
      blockMatch = blockPattern.exec(html);
      continue;
    }

    const headingMatch = rawBlockHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const anchorMatch = rawBlockHtml.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
    const heading =
      stripHtml(headingMatch?.[1] ?? "") ||
      stripHtml(anchorMatch?.[1] ?? "") ||
      stripHtml(rawBlockHtml).split(/[.!?•·|]/)[0]?.trim() ||
      "";
    if (!looksLikeProductTitle(heading)) {
      blockMatch = blockPattern.exec(html);
      continue;
    }

    const key = `${heading.toLowerCase()}|${serviceType}`;
    if (!seen.has(key)) {
      seen.add(key);
      contexts.push({
        name: heading,
        text: blockText,
        source: "block"
      });
    }

    blockMatch = blockPattern.exec(html);
  }

  if (contexts.length === 0) {
    const headings = extractHeadings(html, serviceType).slice(0, MAX_OFFERS_PER_BANK);
    const fullText = stripHtml(html);
    for (const heading of headings) {
      const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(.{0,700}${escaped}.{0,900})`, "i");
      const context = fullText.match(regex)?.[1] ?? fullText.slice(0, 1600);
      const key = `${heading.toLowerCase()}|${serviceType}`;
      if (!seen.has(key) && looksLikeProductTitle(heading)) {
        seen.add(key);
        contexts.push({
          name: heading,
          text: context,
          source: "heading"
        });
      }
    }
  }

  if (contexts.length === 0) {
    const lines = stripHtmlToLines(html);
    for (const line of lines) {
      if (contexts.length >= 8) {
        break;
      }
      if (line.length < 8 || line.length > 110 || hasNoiseKeyword(line)) {
        continue;
      }
      if (!containsServiceKeyword(line, serviceType)) {
        continue;
      }
      if (!looksLikeProductTitle(line)) {
        continue;
      }
      const key = `${line.toLowerCase()}|${serviceType}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      contexts.push({
        name: line,
        text: stripHtml(html).slice(0, 1600),
        source: "heading"
      });
    }
  }

  if (contexts.length === 0) {
    contexts.push({
      name: getDefaultName(
        {
          id: bankName,
          name: bankName,
          website: "",
          serviceUrls: {},
          fromRegistry: false
        },
        serviceType,
        locale,
        sourceUrl
      ),
      text: stripHtml(html).slice(0, 2000),
      source: "page"
    });
  }

  return contexts.slice(0, MAX_OFFERS_PER_BANK);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const concurrency = Math.max(1, limit);
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function extractHeadings(html: string, serviceType: ServiceType): string[] {
  const rawHeadings: string[] = [];
  const headingsRegex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let headingMatch = headingsRegex.exec(html);

  while (headingMatch) {
    const cleaned = stripHtml(headingMatch[1] ?? "");
    if (cleaned.length > 4 && cleaned.length < 90) {
      rawHeadings.push(cleaned);
    }
    headingMatch = headingsRegex.exec(html);
  }

  // Bank websites often keep product names in anchors/cards rather than semantic headings.
  const anchorRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let anchorMatch = anchorRegex.exec(html);
  while (anchorMatch) {
    const cleaned = stripHtml(anchorMatch[1] ?? "");
    if (cleaned.length > 4 && cleaned.length < 110) {
      rawHeadings.push(cleaned);
    }
    anchorMatch = anchorRegex.exec(html);
  }

  const keywordByService: Record<ServiceType, string[]> = {
    cards: ["card", "cards", "карта", "debit", "credit", "платеж"],
    loans: ["loan", "credit", "кредит", "mortgage", "ипотек", "заем", "финанс"],
    deposits: ["deposit", "savings", "invest", "вклад", "доход", "depozit", "накоп"],
    business: ["business", "merchant", "account", "компани", "acquiring"],
    documents: ["document", "compliance", "onboarding", "doc", "регистрац"]
  };

  const keywords = keywordByService[serviceType];
  return Array.from(
    new Set(
      rawHeadings
        .filter((heading) =>
          keywords.some((keyword) => heading.toLowerCase().includes(keyword))
        )
        .filter((heading) => !hasNoiseKeyword(heading))
    )
  )
    .filter((heading) => !/^подробнее|узнать|читать|о банке/i.test(heading))
    .filter((heading) => heading.replace(/[^a-zа-яё0-9]/gi, "").length >= 5)
    .slice(0, MAX_OFFERS_PER_BANK);
}

function getServiceUrl(bank: RuntimeBankEntry, serviceType: ServiceType): string | undefined {
  if (serviceType === "documents") {
    return bank.serviceUrls.documents ?? bank.serviceUrls.business;
  }

  return bank.serviceUrls[serviceType];
}

function selectBanksForServiceCrawl(
  banks: RuntimeBankEntry[],
  serviceType: ServiceType
): RuntimeBankEntry[] {
  const limits = getServiceBankLimits(serviceType);
  const withDirectUrl = banks.filter((bank) => Boolean(getServiceUrl(bank, serviceType)));
  const registryWithWebsite = banks.filter(
    (bank) =>
      !getServiceUrl(bank, serviceType) &&
      bank.fromRegistry &&
      bank.website &&
      !isSearchWebsite(bank.website)
  );

  const selected = [
    ...withDirectUrl,
    ...registryWithWebsite.slice(0, limits.registryWithoutDirect)
  ];

  const deduped = Array.from(
    new Map(selected.map((bank) => [bank.id, bank] as const)).values()
  );
  return deduped.slice(0, limits.total);
}

function buildServiceUrlCacheKey(bank: RuntimeBankEntry, serviceType: ServiceType) {
  return `${bank.id}:${serviceType}`;
}

function getCachedServiceUrl(bank: RuntimeBankEntry, serviceType: ServiceType): string | null {
  const key = buildServiceUrlCacheKey(bank, serviceType);
  const cached = serviceUrlCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }
  return cached.url;
}

function setCachedServiceUrl(bank: RuntimeBankEntry, serviceType: ServiceType, url: string) {
  const key = buildServiceUrlCacheKey(bank, serviceType);
  serviceUrlCache.set(key, {
    expiresAt: Date.now() + SERVICE_URL_CACHE_TTL_MS,
    url
  });
}

function getServiceKeywords(serviceType: ServiceType): string[] {
  if (serviceType === "cards") {
    return ["card", "cards", "debit", "credit", "карта", "карты", "debet", "payment-card"];
  }
  if (serviceType === "loans") {
    return [
      "loan",
      "credit",
      "mortgage",
      "кредит",
      "кредиты",
      "ипот",
      "заем",
      "financing",
      "consumer-loan"
    ];
  }
  if (serviceType === "deposits") {
    return [
      "deposit",
      "deposits",
      "savings",
      "saving",
      "вклад",
      "вклады",
      "депозит",
      "depozit",
      "term-deposit",
      "savings-account"
    ];
  }
  if (serviceType === "business") return ["business", "sme", "merchant", "acquiring", "бизнес"];
  return ["document", "onboarding", "compliance", "регистра", "документ"];
}

function filterServiceUrls(urls: string[], serviceType: ServiceType, host: string): string[] {
  const keywords = getServiceKeywords(serviceType);
  const normalizedHost = host.replace(/^www\./i, "");
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      const parsedHost = parsed.hostname.replace(/^www\./i, "");
      if (parsedHost !== normalizedHost) {
        return false;
      }
      const value = `${parsed.pathname} ${parsed.search}`.toLowerCase();
      if (
        /(review|rating|news|journal|blog|press|media|career|vacancy|support|help|faq|контакт|новост|отзыв|рейтинг)/i.test(
          value
        )
      ) {
        return false;
      }
      return keywords.some((keyword) => value.includes(keyword));
    } catch {
      return false;
    }
  });
}

function buildHeuristicServiceUrls(origin: string, serviceType: ServiceType): string[] {
  const byService: Record<ServiceType, string[]> = {
    cards: [
      "/cards",
      "/card",
      "/debit-cards",
      "/credit-cards",
      "/personal/cards",
      "/private/cards",
      "/fizicheskim-licam/cards",
      "/products/cards",
      "/individual/cards"
    ],
    loans: [
      "/loans",
      "/loan",
      "/credits",
      "/credit",
      "/kredity",
      "/ipoteka",
      "/mortgage",
      "/consumer-loans",
      "/personal/loans",
      "/personal/credits",
      "/private/loans",
      "/individual/loans",
      "/retail/loans"
    ],
    deposits: [
      "/deposits",
      "/deposit",
      "/vklady",
      "/vklad",
      "/savings",
      "/saving",
      "/accounts/savings",
      "/personal/deposits",
      "/private/deposits",
      "/individual/deposits",
      "/retail/deposits",
      "/products/deposits",
      "/fizicheskim-licam/deposits"
    ],
    business: [
      "/business",
      "/business-banking",
      "/corporate",
      "/sme",
      "/merchant",
      "/acquiring"
    ],
    documents: [
      "/business/register",
      "/compliance",
      "/onboarding",
      "/documents",
      "/docs",
      "/help/business"
    ]
  };

  return byService[serviceType].map((path) => `${origin}${path}`);
}

function normalizeUrlForSet(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return url;
  }
}

function scoreServiceUrl(url: string, serviceType: ServiceType): number {
  try {
    const parsed = new URL(url);
    const value = `${parsed.pathname} ${parsed.search}`.toLowerCase();
    const keywords = getServiceKeywords(serviceType);
    let score = 0;
    keywords.forEach((keyword) => {
      if (value.includes(keyword)) {
        score += 4;
      }
    });

    if (serviceType === "deposits" && /(deposit|savings|вклад|депозит)/i.test(value)) score += 8;
    if (serviceType === "loans" && /(loan|credit|mortgage|кредит|ипот)/i.test(value)) score += 8;
    if (serviceType === "cards" && /(card|карта)/i.test(value)) score += 8;

    score -= Math.min(6, parsed.pathname.split("/").filter(Boolean).length);
    return score;
  } catch {
    return 0;
  }
}

function sortServiceUrls(urls: string[], serviceType: ServiceType): string[] {
  const unique = Array.from(new Set(urls.map((url) => normalizeUrlForSet(url))));
  return unique.sort((a, b) => scoreServiceUrl(b, serviceType) - scoreServiceUrl(a, serviceType));
}

function extractUrlsFromSitemap(xml: string): string[] {
  const out: string[] = [];
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  let match = regex.exec(xml);
  while (match) {
    const candidate = match[1]?.trim();
    if (candidate) {
      out.push(candidate);
    }
    match = regex.exec(xml);
  }
  return out;
}

function extractUrlsFromHtml(html: string, base: string): string[] {
  const out: string[] = [];
  const regex = /href=["']([^"']+)["']/gi;
  let match = regex.exec(html);
  while (match) {
    const raw = match[1]?.trim();
    if (!raw) {
      match = regex.exec(html);
      continue;
    }
    try {
      const full = new URL(raw, base).toString();
      out.push(full);
    } catch {
      // ignore malformed URLs
    }
    match = regex.exec(html);
  }
  return out;
}

async function discoverServiceUrls(bank: RuntimeBankEntry, serviceType: ServiceType): Promise<string[]> {
  const urls: string[] = [];
  const direct = getServiceUrl(bank, serviceType);
  if (direct) {
    urls.push(direct);
  }

  const cached = getCachedServiceUrl(bank, serviceType);
  if (cached) {
    urls.push(cached);
  }

  try {
    const website = bank.website.startsWith("http") ? bank.website : `https://${bank.website}`;
    const origin = new URL(website).origin;
    const host = new URL(website).hostname;

    // 1) Try sitemap first for category URLs.
    try {
      const sitemap = await fetchPage(`${origin}/sitemap.xml`);
      const sitemapUrls = extractUrlsFromSitemap(sitemap);
      urls.push(...filterServiceUrls(sitemapUrls, serviceType, host));
    } catch {
      // Continue with homepage discovery.
    }

    // 2) Fallback to homepage links.
    try {
      const homepage = await fetchPage(origin);
      const links = extractUrlsFromHtml(homepage, origin);
      urls.push(...filterServiceUrls(links, serviceType, host));
    } catch {
      // Continue with known URLs.
    }

    // 3) Deterministic URL guesses for service sections.
    urls.push(...buildHeuristicServiceUrls(origin, serviceType));

    urls.push(origin);
    const sorted = sortServiceUrls(urls, serviceType).slice(0, getServiceUrlLimit(serviceType));
    if (sorted[0]) {
      setCachedServiceUrl(bank, serviceType, sorted[0]);
    }
    return sorted;
  } catch {
    return sortServiceUrls(urls, serviceType).slice(0, getServiceUrlLimit(serviceType));
  }
}

function getDefaultName(
  bank: RuntimeBankEntry,
  serviceType: ServiceType,
  locale: Locale,
  sourceUrl?: string
): string {
  const text = getLocaleCopy(locale);
  if (serviceType === "loans") {
    const marker = `${sourceUrl ?? ""}`.toLowerCase();
    if (
      marker.includes("mortgage") ||
      marker.includes("ipoteka") ||
      marker.includes("ипотек") ||
      marker.includes("home-loan") ||
      marker.includes("home_loan")
    ) {
      return locale === "ru" ? `${bank.name} ипотека` : `${bank.name} mortgage`;
    }
  }
  return `${bank.name} ${text[serviceType]}`;
}

function translateName(value: string, locale: Locale): string {
  if (locale === "en") {
    return value;
  }

  const replacements: Array<[RegExp, string]> = [
    [/\bcard\b/gi, "карта"],
    [/\bcards\b/gi, "карты"],
    [/\bcredit\b/gi, "кредит"],
    [/\bloan\b/gi, "кредит"],
    [/\bmortgage\b/gi, "ипотека"],
    [/\bdeposit\b/gi, "вклад"],
    [/\bsavings?\b/gi, "сбережения"],
    [/\bbusiness\b/gi, "бизнес"],
    [/\baccount\b/gi, "счет"]
  ];

  return replacements.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    value
  );
}

const SRAVNI_URLS: Record<ServiceType, string[]> = {
  cards: [
    "https://www.sravni.ru/debetovye-karty/",
    "https://www.sravni.ru/kreditnye-karty/"
  ],
  loans: [
    "https://www.sravni.ru/kredity/",
    "https://www.sravni.ru/ipoteka/"
  ],
  deposits: ["https://www.sravni.ru/vklady/"],
  business: [],
  documents: []
};

function isLikelyOfferName(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 5 || cleaned.length > 120) {
    return false;
  }
  const lettersOnly = cleaned.replace(/[^a-zа-яё]/gi, "");
  if (lettersOnly.length < 4) {
    return false;
  }
  if (/^[+\-−]?\d[\d\s.,]*\s?(?:₽|₸|֏|₼|₾|aed|rub|kzt|azn|gel|byn|usd|eur)?$/i.test(cleaned)) {
    return false;
  }
  const lower = cleaned.toLowerCase();
  if (hasNoiseKeyword(lower)) {
    return false;
  }
  if (
    lower.includes("sravni") ||
    lower.includes("cookie") ||
    lower.includes("privacy") ||
    lower.includes("подпис") ||
    lower.includes("новости") ||
    lower.includes("войти") ||
    lower.includes("зарегистр")
  ) {
    return false;
  }
  return true;
}

function isCaptchaPage(html: string): boolean {
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes("вы не робот") ||
    sample.includes("smartcaptcha") ||
    sample.includes("captcha_smart") ||
    sample.includes("подтвердите, что запросы отправляли вы")
  );
}

interface SravniOfferCandidate {
  name: string;
  providerName: string;
  rawParams: string[];
}

function inferProviderFromOfferName(name: string): string | null {
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) {
    return null;
  }

  const bankPattern = /\b(?:банк|bank)\s+[a-zа-яё0-9"«»\-. ]{2,40}/i;
  const bankMatch = clean.match(bankPattern)?.[0]?.trim();
  if (bankMatch && isLikelyOfferName(bankMatch)) {
    return bankMatch;
  }

  const productSplitPattern =
    /^([a-zа-яё0-9"«»\-. ]{2,45})\s+(?:кредитн(?:ая|ый)?|дебетов(?:ая|ый)?|карта|вклад|депозит|ипотек(?:а|и)|кредит|loan|card|deposit|mortgage)\b/i;
  const splitMatch = clean.match(productSplitPattern)?.[1]?.trim();
  if (splitMatch && splitMatch.length >= 3 && !/^(лучш|топ|онлайн|оформ|подбор|сравн)/i.test(splitMatch)) {
    return splitMatch;
  }

  const parts = clean.split(/[|—–-]/).map((item) => item.trim()).filter(Boolean);
  if (parts.length > 1) {
    const candidate = parts[0];
    if (candidate.length >= 3 && candidate.length <= 40 && /[a-zа-яё]/i.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function flattenObjectValues(input: unknown, acc: string[]) {
  if (input == null) {
    return;
  }
  if (typeof input === "string" || typeof input === "number") {
    acc.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    input.forEach((item) => flattenObjectValues(item, acc));
    return;
  }
  if (typeof input === "object") {
    Object.values(input as Record<string, unknown>).forEach((entry) =>
      flattenObjectValues(entry, acc)
    );
  }
}

function pickProviderName(value: Record<string, unknown>): string {
  const direct =
    (typeof value.provider === "string" ? value.provider : null) ??
    (typeof value.bankName === "string" ? value.bankName : null);
  if (direct && isLikelyOfferName(direct)) {
    return direct.trim();
  }

  const byName = typeof value.name === "string" ? inferProviderFromOfferName(value.name) : null;
  if (byName && isLikelyOfferName(byName)) {
    return byName.trim();
  }

  const nestedCandidates = [value.brand, value.provider, value.bank, value.organization];
  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === "object") {
      const name = (candidate as Record<string, unknown>).name;
      if (typeof name === "string" && isLikelyOfferName(name)) {
        return name.trim();
      }
    }
  }

  return "Sravni";
}

function extractCandidateParams(value: Record<string, unknown>): string[] {
  const picked: string[] = [];
  const flattened: string[] = [];
  flattenObjectValues(value, flattened);

  flattened.forEach((entry) => {
    const clean = entry.replace(/\s+/g, " ").trim();
    if (!clean || hasNoiseKeyword(clean)) {
      return;
    }
    if (
      /(\d{1,2}(?:[.,]\d+)?\s?%|₽|₸|֏|₼|₾|AED|RUB|KZT|AMD|AZN|GEL|BYN|USD|EUR)/i.test(
        clean
      )
    ) {
      picked.push(clean);
    }
  });

  return Array.from(new Set(picked)).slice(0, 8);
}

function walkJsonCandidates(input: unknown, out: SravniOfferCandidate[]) {
  if (!input || out.length >= 400) {
    return;
  }
  if (Array.isArray(input)) {
    input.forEach((item) => walkJsonCandidates(item, out));
    return;
  }
  if (typeof input === "object") {
    const value = input as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (name && isLikelyOfferName(name)) {
      out.push({
        name,
        providerName: pickProviderName(value),
        rawParams: extractCandidateParams(value)
      });
    }

    Object.values(value).forEach((entry) => walkJsonCandidates(entry, out));
  }
}

function extractSravniOfferCandidates(html: string): SravniOfferCandidate[] {
  const candidates: SravniOfferCandidate[] = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch = scriptRegex.exec(html);

  while (scriptMatch) {
    try {
      const parsed = JSON.parse(scriptMatch[1] ?? "{}") as unknown;
      walkJsonCandidates(parsed, candidates);
    } catch {
      // Ignore malformed script blocks.
    }
    scriptMatch = scriptRegex.exec(html);
  }

  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch?.[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]) as unknown;
      walkJsonCandidates(parsed, candidates);
    } catch {
      // Ignore malformed NEXT_DATA payload.
    }
  }

  if (candidates.length < 8) {
    const headingRegex = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
    let headingMatch = headingRegex.exec(html);
    while (headingMatch) {
      const heading = stripHtml(headingMatch[1] ?? "");
      if (looksLikeProductTitle(heading)) {
        candidates.push({
          name: heading,
          providerName: "Sravni",
          rawParams: []
        });
      }
      headingMatch = headingRegex.exec(html);
    }
  }

  const unique = new Map<string, SravniOfferCandidate>();
  candidates.forEach((item) => {
    const key = `${item.providerName}|${item.name}`.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });

  return Array.from(unique.values()).slice(0, 250);
}

function buildSravniParams(
  serviceType: ServiceType,
  country: Country,
  locale: Locale,
  candidate: SravniOfferCandidate,
  rates: string[],
  terms: string[],
  amounts: string[]
) {
  const fallback = buildParams(serviceType, country, locale, rates, terms, amounts);
  const fromCandidate = candidate.rawParams
    .filter((entry) => !hasNoiseKeyword(entry))
    .slice(0, 4)
    .map((entry, index) => ({
      label: fallback[index]?.label ?? `${locale === "ru" ? "Параметр" : "Parameter"} ${index + 1}`,
      value: entry
    }));

  if (fromCandidate.length === 0) {
    return fallback;
  }

  const merged = [...fromCandidate];
  fallback.forEach((param) => {
    if (merged.length >= 4) {
      return;
    }
    if (!merged.some((item) => item.label.toLowerCase() === param.label.toLowerCase())) {
      merged.push(param);
    }
  });

  return merged.slice(0, 4);
}

async function fetchSravniService(
  country: Country,
  serviceType: ServiceType,
  locale: Locale
): Promise<{ offers: Offer[]; live: boolean }> {
  if (country !== "russia") {
    return { offers: [], live: false };
  }

  if (getSravniHealth() === "down") {
    return { offers: [], live: false };
  }

  const urls = SRAVNI_URLS[serviceType];
  if (!urls || urls.length === 0) {
    return { offers: [], live: false };
  }

  const session = getSravniSession();
  const offers: Offer[] = [];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Bank-your/1.0 (+https://bank-your.local)",
          ...(session.cookie ? { Cookie: session.cookie } : {})
        }
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      if (isCaptchaPage(html)) {
        continue;
      }
      const text = stripHtml(html);
      const candidates = extractSravniOfferCandidates(html);
      const pageSignals = extractFinancialSignals(text, 20);
      const pageRates = filterRatesByService(serviceType, pageSignals.rates);
      const pageTerms = filterTermsByService(serviceType, pageSignals.terms);
      const pageAmounts = filterAmountsByService(serviceType, pageSignals.amounts);
      const requiresStrictRate = serviceType === "deposits" || serviceType === "loans";

      candidates.forEach((candidate, index) => {
        if (!looksLikeProductTitle(candidate.name)) {
          return;
        }
        const candidateName = translateName(candidate.name, locale);
        const inferredProvider = inferProviderFromOfferName(candidate.name);
        const providerName =
          candidate.providerName.trim() && candidate.providerName.trim() !== "Sravni"
            ? candidate.providerName.trim()
            : inferredProvider ?? "Sravni";
        const candidateSignalText = `${candidate.name} ${candidate.rawParams.join(" ")}`;
        const candidateSignals = extractFinancialSignals(candidateSignalText, 6);
        const candidateRates = filterRatesByService(serviceType, candidateSignals.rates);
        const candidateTerms = filterTermsByService(serviceType, candidateSignals.terms);
        const candidateAmounts = filterAmountsByService(serviceType, candidateSignals.amounts);
        const rates = Array.from(
          new Set([
            ...candidateRates,
            ...pageRates
          ])
        ).slice(0, 8);
        const terms = Array.from(
          new Set([
            ...candidateTerms,
            ...pageTerms
          ])
        ).slice(0, 8);
        const amounts = Array.from(
          new Set([
            ...candidateAmounts,
            ...pageAmounts
          ])
        ).slice(0, 8);
        const qualityFlags: string[] = [];
        if (hasNoiseKeyword(candidate.name)) {
          qualityFlags.push("noise_name");
        }
        if (candidate.rawParams.length === 0) {
          qualityFlags.push("no_structured_params");
        }
        if (requiresStrictRate && candidate.rawParams.length === 0) {
          const lowerName = candidate.name.toLowerCase();
          const looksProductLike =
            /(вклад|депозит|deposit|savings|накоп|кредит|loan|mortgage|ипотек)/i.test(lowerName) &&
            !isGenericCategoryHeading(lowerName) &&
            !/что важно|документ|безопасност|проценты по|тариф|условия|как выбрать|как открыть/i.test(
              lowerName
            );
          if (!looksProductLike || !inferredProvider) {
            return;
          }
        }
        if (requiresStrictRate && providerName === "Sravni") {
          return;
        }
        if (requiresStrictRate && candidateRates.length === 0) {
          qualityFlags.push("page_level_rate");
        }
        if (requiresStrictRate && candidateTerms.length === 0 && candidateAmounts.length === 0) {
          qualityFlags.push("page_level_term_or_amount");
        }

        if (requiresStrictRate && rates.length === 0) {
          qualityFlags.push("no_rate");
          return;
        }
        if (requiresStrictRate && terms.length === 0 && amounts.length === 0) {
          qualityFlags.push("no_term_or_amount");
          return;
        }

        const params = buildSravniParams(
          serviceType,
          country,
          locale,
          candidate,
          rates,
          terms,
          amounts
        );
        if (params.length === 0) {
          return;
        }
        if (
          requiresStrictRate &&
          !params.some((param) => /ставк|rate|yield|доход/i.test(`${param.label} ${param.value}`))
        ) {
          return;
        }
        if (
          serviceType === "deposits" &&
          !params.some((param) => /срок|term|min|миним|amount|сумм/i.test(`${param.label} ${param.value}`))
        ) {
          return;
        }

        offers.push({
          id: `${country}-${serviceType}-sravni-${index + 1}-${url.length}`,
          name: candidateName,
          description:
            locale === "ru"
              ? "Предложение из каталога Sravni (структурированные параметры)."
              : "Offer from Sravni catalog (structured parameters).",
          details:
            locale === "ru"
              ? "Проверьте окончательные условия на сайте провайдера перед оформлением."
              : "Verify final terms on the provider website before applying.",
          params,
          url,
          providerName,
          providerLogoUrl: "https://www.sravni.ru/favicon.ico",
          serviceType,
          source: "sravni",
          qualityFlags,
          sourceUrl: url
        });
      });
    } catch {
      // Degrade silently and let bank-site source fill gaps.
    }
  }

  return {
    offers,
    live: offers.length > 0
  };
}

function buildParams(
  serviceType: ServiceType,
  country: Country,
  locale: Locale,
  rates: string[],
  terms: string[],
  amounts: string[]
) {
  const text = getLocaleCopy(locale);
  const currencyCode = COUNTRIES_BY_VALUE[country].currencyCode;

  if (serviceType === "cards") {
    const out = [];
    if (rates[0]) out.push({ label: text.cashback, value: rates[0] });
    if (amounts[0]) out.push({ label: text.annualFee, value: amounts[0] });
    out.push({ label: text.currency, value: currencyCode });
    out.push({ label: text.decision, value: text.providerRules });
    return out.slice(0, 4);
  }

  if (serviceType === "loans") {
    const out = [];
    if (rates[0]) out.push({ label: text.rate, value: rates[0] });
    if (terms[0]) out.push({ label: text.term, value: terms[0] });
    if (amounts[0]) out.push({ label: text.minAmount, value: amounts[0] });
    out.push({ label: text.decision, value: text.providerRules });
    return out.slice(0, 4);
  }

  if (serviceType === "deposits") {
    const out = [];
    if (rates[0]) out.push({ label: text.yield, value: rates[0] });
    if (terms[0]) out.push({ label: text.term, value: terms[0] });
    if (amounts[0]) out.push({ label: text.minAmount, value: amounts[0] });
    out.push({ label: text.currency, value: currencyCode });
    return out.slice(0, 4);
  }

  if (serviceType === "business") {
    const out = [];
    if (amounts[0]) out.push({ label: text.monthlyFee, value: amounts[0] });
    if (amounts[1]) out.push({ label: text.connection, value: amounts[1] });
    if (terms[0]) out.push({ label: text.onboarding, value: terms[0] });
    out.push({ label: text.notes, value: text.providerRules });
    return out.slice(0, 4);
  }

  const out = [];
  if (amounts[0]) out.push({ label: text.serviceFee, value: amounts[0] });
  if (terms[0]) out.push({ label: text.timeline, value: terms[0] });
  out.push({ label: text.scope, value: text.support });
  out.push({ label: text.notes, value: text.providerRules });
  return out.slice(0, 4);
}

function buildDescription(bank: RuntimeBankEntry, serviceType: ServiceType, locale: Locale): string {
  if (locale === "ru") {
    if (serviceType === "documents") {
      return `${bank.name}: помощь с подготовкой документов и этапами подачи заявки.`;
    }
    return `${bank.name}: условия услуги на основании открытых данных официального сайта.`;
  }

  if (serviceType === "documents") {
    return `${bank.name}: support with document package preparation and application steps.`;
  }

  return `${bank.name}: service conditions based on public data from the official website.`;
}

function buildDetails(bank: RuntimeBankEntry, locale: Locale): string {
  const text = getLocaleCopy(locale);
  return `${text.generated} ${text.verify} ${bank.name}.`;
}

function buildPendingParams(
  serviceType: ServiceType,
  country: Country,
  locale: Locale
): Array<{ label: string; value: string }> {
  const text = getLocaleCopy(locale);
  const pendingValue =
    locale === "ru" ? "Уточняется на сайте банка" : "Check provider website for current terms";
  const currencyCode = COUNTRIES_BY_VALUE[country].currencyCode;

  if (serviceType === "deposits") {
    return [
      { label: text.yield, value: pendingValue },
      { label: text.term, value: pendingValue },
      { label: text.minAmount, value: pendingValue },
      { label: text.currency, value: currencyCode }
    ];
  }

  if (serviceType === "loans") {
    return [
      { label: text.rate, value: pendingValue },
      { label: text.term, value: pendingValue },
      { label: text.minAmount, value: pendingValue },
      { label: text.decision, value: text.providerRules }
    ];
  }

  if (serviceType === "cards") {
    return [
      { label: text.cashback, value: pendingValue },
      { label: text.annualFee, value: pendingValue },
      { label: text.currency, value: currencyCode },
      { label: text.decision, value: text.providerRules }
    ];
  }

  if (serviceType === "business") {
    return [
      { label: text.monthlyFee, value: pendingValue },
      { label: text.connection, value: pendingValue },
      { label: text.onboarding, value: pendingValue },
      { label: text.notes, value: text.providerRules }
    ];
  }

  return [
    { label: text.notes, value: pendingValue }
  ];
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });

    if (!response.ok) {
      throw new Error(`Source returned status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function buildOffersFromHtml(
  country: Country,
  bank: RuntimeBankEntry,
  serviceType: ServiceType,
  locale: Locale,
  html: string,
  sourceUrl: string
): Offer[] {
  const contexts = extractOfferContexts(html, serviceType, bank.name, locale, sourceUrl);
  const requiresStrictRate = serviceType === "deposits" || serviceType === "loans";
  const fullPageSignals = extractFinancialSignals(stripHtmlKeepScripts(html), 12);
  const fullPageRates = filterRatesByService(serviceType, fullPageSignals.rates).slice(0, 6);
  const fullPageTerms = filterTermsByService(serviceType, fullPageSignals.terms).slice(0, 6);
  const fullPageAmounts = filterAmountsByService(serviceType, fullPageSignals.amounts).slice(0, 6);
  const offers: Offer[] = [];
  contexts.slice(0, MAX_OFFERS_PER_BANK).forEach((context, index) => {
    if (!looksLikeProductTitle(context.name)) {
      return;
    }
    const contextSignals = extractFinancialSignals(context.text, 8);
    const contextRates = filterRatesByService(serviceType, contextSignals.rates);
    const contextTerms = filterTermsByService(serviceType, contextSignals.terms);
    const contextAmounts = filterAmountsByService(serviceType, contextSignals.amounts);
    const contextNameLower = context.name.toLowerCase();

    if (
      serviceType === "deposits" &&
      !/(вклад|депозит|deposit|savings|накоп|on demand|до востребован|term)/i.test(
        contextNameLower
      ) &&
      contextRates.length === 0
    ) {
      return;
    }

    const rates = contextRates.length > 0 ? contextRates : fullPageRates;
    const terms = contextTerms.length > 0 ? contextTerms : fullPageTerms;
    const amounts = contextAmounts.length > 0 ? contextAmounts : fullPageAmounts;

    if (requiresStrictRate && rates.length === 0) {
      return;
    }
    if (requiresStrictRate && terms.length === 0 && amounts.length === 0) {
      return;
    }

    const params = buildParams(serviceType, country, locale, rates, terms, amounts);
    const hasFinancialParams = params.some((param) =>
      /(cashback|fee|ставк|rate|yield|доход|term|срок|amount|сумм|currency|валют)/i.test(
        `${param.label} ${param.value}`
      )
    );
    if (!hasFinancialParams) {
      return;
    }
    if (requiresStrictRate && !params.some((param) => /ставк|rate|yield|доход/i.test(param.label))) {
      return;
    }
    if (
      serviceType === "deposits" &&
      !params.some((param) => /term|срок|min|миним|amount|сумм/i.test(`${param.label} ${param.value}`))
    ) {
      return;
    }

    const qualityFlags: string[] = [];
    if (hasNoiseKeyword(context.name)) {
      qualityFlags.push("noise_name");
    }
    if (context.source === "page") {
      qualityFlags.push("page_level_context");
    }
    if (requiresStrictRate && contextRates.length === 0) {
      qualityFlags.push("page_level_rate");
    }
    if ((serviceType === "deposits" || serviceType === "loans") && contextTerms.length === 0) {
      qualityFlags.push("page_level_term");
    }
    if ((serviceType === "deposits" || serviceType === "loans") && contextAmounts.length === 0) {
      qualityFlags.push("page_level_amount");
    }

    offers.push({
      id: `${country}-${serviceType}-live-${bank.id}-${index + 1}`,
      name: translateName(context.name, locale),
      description: buildDescription(bank, serviceType, locale),
      details: buildDetails(bank, locale),
      params,
      url: sourceUrl,
      providerName: bank.name,
      providerLogoUrl: getLogoUrl(bank.website),
      serviceType,
      source: "bank_site",
      qualityFlags,
      sourceUrl
    });
  });
  if (offers.length === 0) {
    const strictFallbackReady = requiresStrictRate && fullPageRates.length > 0;
    const relaxedFallbackReady = !requiresStrictRate;
    if (strictFallbackReady || relaxedFallbackReady) {
      const params = buildParams(
        serviceType,
        country,
        locale,
        fullPageRates,
        fullPageTerms,
        fullPageAmounts
      );
      if (params.length > 0) {
        offers.push({
          id: `${country}-${serviceType}-live-${bank.id}-fallback`,
          name: getDefaultName(bank, serviceType, locale, sourceUrl),
          description: buildDescription(bank, serviceType, locale),
          details: buildDetails(bank, locale),
          params,
          url: sourceUrl,
          providerName: bank.name,
          providerLogoUrl: getLogoUrl(bank.website),
          serviceType,
          source: "bank_site",
          qualityFlags: ["page_level_context"],
          sourceUrl
        });
      }
    }
  }
  return offers;
}

async function fetchServiceFromBank(
  country: Country,
  bank: RuntimeBankEntry,
  serviceType: ServiceType,
  locale: Locale
): Promise<{ offers: Offer[]; live: boolean }> {
  const urls = await discoverServiceUrls(bank, serviceType);
  if (urls.length === 0) {
    return {
      offers: [],
      live: false
    };
  }

  const allOffers: Offer[] = [];
  for (const url of urls.slice(0, getServiceUrlLimit(serviceType))) {
    try {
      const html = await fetchPage(url);
      const offers = buildOffersFromHtml(country, bank, serviceType, locale, html, url);
      allOffers.push(...offers);
    } catch {
      // Continue with remaining discovered URLs.
    }
  }

  const deduplicated = Array.from(
    new Map(
      allOffers.map((offer) => [
        `${offer.providerName}|${offer.name}|${offer.sourceUrl ?? offer.url}|${offer.params
          .map((param) => `${param.label}:${param.value}`)
          .join("|")}`.toLowerCase(),
        offer
      ] as const)
    ).values()
  );

  return { offers: deduplicated, live: deduplicated.length > 0 };
}

async function fetchService(
  country: Country,
  serviceType: ServiceType,
  locale: Locale
): Promise<{ offers: Offer[]; meta: ServiceFetchMeta }> {
  const registryBanks = await fetchRegistryBanks(country);
  const banks = mergeBankSource(country, registryBanks);
  const sravniResult = await fetchSravniService(country, serviceType, locale);

  if (banks.length === 0) {
    return {
      offers: sravniResult.offers,
      meta: {
        provider: sravniResult.offers.length > 0 ? "Sravni" : "Registry",
        status: sravniResult.live ? "live" : "fallback",
        url: sravniResult.offers[0]?.url ?? "",
        providerCount: new Set(sravniResult.offers.map((offer) => offer.providerName)).size
      }
    };
  }

  const crawlBanks = selectBanksForServiceCrawl(banks, serviceType);
  const results = await mapWithConcurrency(
    crawlBanks,
    getServiceConcurrency(serviceType),
    (bank) => fetchServiceFromBank(country, bank, serviceType, locale)
  );

  const bankOffers = results.flatMap((item) => item.offers);
  const hasBankLive = results.some((item) => item.live);
  const hasLive = sravniResult.live || hasBankLive;
  const offers = [...sravniResult.offers, ...bankOffers];
  const displayBanks = crawlBanks.length > 0 ? crawlBanks : banks;
  const deduplicated = Array.from(
    new Map(
      offers.map((offer) => [
        `${offer.providerName}|${offer.name}|${offer.sourceUrl ?? offer.url}|${offer.params
          .map((param) => `${param.label}:${param.value}`)
          .join("|")}`.toLowerCase(),
        offer
      ] as const)
    ).values()
  );
  const providerSet = new Set(deduplicated.map((offer) => normalizeBankName(offer.providerName)));
  const pendingOffers =
    serviceType === "loans" || serviceType === "deposits" || serviceType === "cards" || serviceType === "business" || serviceType === "documents"
      ? banks
          .filter((bank) => !providerSet.has(normalizeBankName(bank.name)))
          .map((bank) => {
            const sourceUrl =
              getServiceUrl(bank, serviceType) ??
              (bank.website.startsWith("http") ? bank.website : `https://${bank.website}`);
            return {
              id: `${country}-${serviceType}-pending-${bank.id}`,
              name: getDefaultName(bank, serviceType, locale, sourceUrl),
              description:
                locale === "ru"
                  ? `${bank.name}: данные по условиям обновляются из открытых источников банка.`
                  : `${bank.name}: terms are being refreshed from public bank sources.`,
              details:
                locale === "ru"
                  ? "Параметры могут обновиться после следующего цикла. Проверьте актуальные условия на официальном сайте."
                  : "Parameters may update after the next refresh cycle. Verify final terms on the official website.",
              params: buildPendingParams(serviceType, country, locale),
              url: sourceUrl,
              providerName: bank.name,
              providerLogoUrl: getLogoUrl(bank.website),
              serviceType,
              source: "registry_fallback" as const,
              qualityFlags: ["pending_data"],
              sourceUrl
            };
          })
          .slice(
            0,
            serviceType === "loans" || serviceType === "deposits"
              ? 1200
              : serviceType === "cards"
                ? 800
                : 600
          )
      : [];
  const mortgagePendingOffers =
    serviceType === "loans"
      ? banks
          .filter((bank) => !providerSet.has(normalizeBankName(bank.name)))
          .map((bank) => {
            const sourceUrl =
              getServiceUrl(bank, serviceType) ??
              (bank.website.startsWith("http") ? bank.website : `https://${bank.website}`);
            return {
              id: `${country}-${serviceType}-pending-mortgage-${bank.id}`,
              name: locale === "ru" ? `${bank.name} ипотека` : `${bank.name} mortgage`,
              description:
                locale === "ru"
                  ? `${bank.name}: данные по ипотечным условиям обновляются из открытых источников банка.`
                  : `${bank.name}: mortgage terms are being refreshed from public bank sources.`,
              details:
                locale === "ru"
                  ? "Параметры могут обновиться после следующего цикла. Проверьте актуальные условия на официальном сайте."
                  : "Parameters may update after the next refresh cycle. Verify final terms on the official website.",
              params: buildPendingParams(serviceType, country, locale),
              url: sourceUrl,
              providerName: bank.name,
              providerLogoUrl: getLogoUrl(bank.website),
              serviceType,
              source: "registry_fallback" as const,
              qualityFlags: ["pending_data", "mortgage_pending"],
              sourceUrl
            };
          })
          .slice(0, 1200)
      : [];
  const finalOffers = [...deduplicated, ...pendingOffers, ...mortgagePendingOffers];

  return {
    offers: finalOffers,
    meta: {
      provider:
        sravniResult.live && displayBanks.length > 0
          ? `Sravni + ${displayBanks[0].name}${displayBanks.length > 1 ? ` + ${displayBanks.length - 1}` : ""}`
          : displayBanks.length > 1
            ? `${displayBanks[0].name} + ${displayBanks.length - 1}`
            : displayBanks[0]?.name ?? "Registry",
      status: hasLive ? "live" : "fallback",
      url:
        sravniResult.offers[0]?.url ??
        (displayBanks[0] ? (await discoverServiceUrls(displayBanks[0], serviceType))[0] : "") ??
        displayBanks[0]?.website ??
        banks[0].website,
      providerCount: new Set(finalOffers.map((offer) => offer.providerName)).size
    }
  };
}

async function buildProviderCatalog(country: Country): Promise<ProviderCatalogItem[]> {
  const registryBanks = await fetchRegistryBanks(country);
  const banks = mergeBankSource(country, registryBanks);
  return banks.map((bank) => {
    const discoveredServices = SERVICE_KEYS.filter((service) =>
      service === "documents"
        ? Boolean(bank.serviceUrls.documents ?? bank.serviceUrls.business)
        : Boolean(bank.serviceUrls[service])
    );
    const services =
      discoveredServices.length > 0
        ? discoveredServices
        : bank.fromRegistry
          ? SERVICE_KEYS
          : discoveredServices;

    return {
      id: bank.id,
      name: bank.name,
      website: bank.website,
      logoUrl: getLogoUrl(bank.website),
      services
    };
  });
}

function buildSummary(offers: CountryOffers): ServiceSummaryItem[] {
  return SERVICE_KEYS.map((serviceType) => {
    const serviceOffers = offers[serviceType];
    const providerCount = new Set(serviceOffers.map((offer) => offer.providerName)).size;
    return {
      serviceType,
      offerCount: serviceOffers.length,
      providerCount
    };
  });
}

export async function getLiveCountryOffers(
  country: Country,
  locale: Locale = "ru"
): Promise<ServicesApiResponse> {
  const cacheKey = `${country}:${locale}`;
  const cached = countryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  const serviceResults = await Promise.all(
    SERVICE_KEYS.map((serviceType) => fetchService(country, serviceType, locale))
  );

  const offers = {} as CountryOffers;
  const meta = {} as Record<ServiceType, ServiceFetchMeta>;

  SERVICE_KEYS.forEach((serviceType, index) => {
    offers[serviceType] = serviceResults[index].offers;
    meta[serviceType] = serviceResults[index].meta;
  });

  const statuses = SERVICE_KEYS.map((serviceType) => meta[serviceType].status);
  const allLive = statuses.every((status) => status === "live");
  const allFallback = statuses.every((status) => status === "fallback");

  const response: ServicesApiResponse = {
    country,
    offers,
    fetchedAt: new Date().toISOString(),
    sourceStatus: allLive ? "live" : allFallback ? "fallback" : "mixed",
    meta,
    providers: await buildProviderCatalog(country),
    summary: buildSummary(offers)
  };

  countryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    response
  });

  return response;
}
