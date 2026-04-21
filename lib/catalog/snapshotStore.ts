import { BANKS_BY_COUNTRY, getProxyLogoUrl } from "@/data/banks";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { OFFERS_BY_COUNTRY } from "@/data/offers";
import { deriveProductIntent, deriveRuleTags, getProductAiSummary } from "@/lib/ai/productSummary";
import {
  getLastSuccessfulCycleFromDb,
  loadSnapshotStateFromDb,
  saveSnapshotStateToDb
} from "@/lib/catalog/snapshotPersistence";
import { getSnapshotRefreshMs } from "@/lib/db/env";
import { getLiveCountryOffers } from "@/lib/liveOffers/fetchLiveOffers";
import { fetchRegistryBanks } from "@/lib/registry/fetchRegistryBanks";
import { normalizeSearch, scoreMatch } from "@/lib/search/smartSearch";
import { getSravniHealth } from "@/lib/sources/sravniSession";
import {
  BankCoverageStatus,
  BankRegistryItem,
  CatalogFacets,
  CatalogResponse,
  CountryOffers,
  Country,
  DepositType,
  Locale,
  BankGroupItem,
  Offer,
  ProviderCatalogItem,
  ProductCategory,
  ProductItem,
  ServiceFetchMeta,
  ServiceSummaryItem,
  ServiceType,
  ServicesApiResponse,
  SourceRun,
  SnapshotSourceHealth
} from "@/lib/types";

const REFRESH_MS = getSnapshotRefreshMs();
const BOOTSTRAP_RETRY_MS = 30_000;

interface CountrySnapshot {
  snapshotId: string;
  country: Country;
  updatedAt: string;
  products: ProductItem[];
  banks: BankRegistryItem[];
  sourceHealth: SnapshotSourceHealth;
}

interface SnapshotState {
  currentSnapshotId: string;
  updatedAt: string;
  byCountry: Record<Country, CountrySnapshot>;
}

const initialState: SnapshotState = {
  currentSnapshotId: "bootstrap",
  updatedAt: new Date(0).toISOString(),
  byCountry: {} as Record<Country, CountrySnapshot>
};

let state = initialState;
let refreshPromise: Promise<void> | null = null;
let hydratePromise: Promise<boolean> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function buildBootstrapBanks(country: Country): BankRegistryItem[] {
  const banks = BANKS_BY_COUNTRY[country] ?? [];
  return banks.map((bank) => ({
    id: bank.id,
    country,
    name: bank.name,
    website: bank.website,
    logoUrl: getProxyLogoUrl(bank.website),
    coverageStatus: "registry_only",
    productsCount: 0,
    source: "regulator",
    registryStatus: "active",
    regulatorSource: "bootstrap"
  }));
}

function buildBootstrapState(): SnapshotState {
  const snapshotId = `bootstrap-${Date.now()}`;
  const updatedAt = nowIso();
  const byCountry = {} as Record<Country, CountrySnapshot>;

  COUNTRY_OPTIONS.forEach((option) => {
    byCountry[option.value] = {
      snapshotId,
      country: option.value,
      updatedAt,
      products: [],
      banks: buildBootstrapBanks(option.value),
      sourceHealth: {
        sravni: "degraded",
        bankSites: "degraded",
        registries: "healthy"
      }
    };
  });

  return {
    currentSnapshotId: snapshotId,
    updatedAt,
    byCountry
  };
}

function extractNumber(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number.parseFloat(match[1].replace(",", ".")) : Number.POSITIVE_INFINITY;
}

function extractTermInMonths(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const normalized = value.toLowerCase();
  const numeric = extractNumber(value);
  if (!Number.isFinite(numeric)) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalized.includes("year") || normalized.includes("год") || normalized.includes("лет")) {
    return numeric * 12;
  }
  return numeric;
}

function mapCategory(product: ProductItem): ProductCategory {
  const text = `${product.name} ${product.description} ${product.url} ${product.params
    .map((param) => `${param.label} ${param.value}`)
    .join(" ")}`.toLowerCase();

  if (product.category === "debit_cards" || product.category === "credit_cards") {
    return product.category;
  }

  if (product.category === "consumer_loans" || product.category === "mortgages") {
    return product.category;
  }

  if (text.includes("credit card") || text.includes("кредитн")) {
    return "credit_cards";
  }

  if (text.includes("mortgage") || text.includes("ипотек")) {
    return "mortgages";
  }

  if (text.includes("invest") || text.includes("etf") || text.includes("инвест")) {
    return "investments";
  }

  return product.category;
}

function mapLegacyToProductCategory(
  serviceType: string,
  name: string,
  sourceUrl?: string,
  description?: string,
  params?: Array<{ label: string; value: string }>
): ProductCategory {
  const lower = name.toLowerCase();
  const url = (sourceUrl ?? "").toLowerCase();
  const desc = (description ?? "").toLowerCase();
  const paramsText = (params ?? [])
    .map((item) => `${item.label} ${item.value}`.toLowerCase())
    .join(" ");
  const signal = `${lower} ${url} ${desc} ${paramsText}`;
  if (serviceType === "cards") {
    if (
      signal.includes("credit") ||
      signal.includes("кредит") ||
      signal.includes("credit-card") ||
      signal.includes("кредитн")
    ) {
      return "credit_cards";
    }
    return "debit_cards";
  }
  if (serviceType === "loans") {
    const mortgageKeywords = /mortgage|ипотек|ipoteka|housing|home-loan|home_loan|недвиж|real-estate/i;
    const hasMortgageSignal = mortgageKeywords.test(signal);
    const hasMortgageNameOrParams = mortgageKeywords.test(`${lower} ${desc} ${paramsText}`);
    if (hasMortgageSignal && hasMortgageNameOrParams) {
      return "mortgages";
    }
    return "consumer_loans";
  }
  if (serviceType === "deposits") {
    if (lower.includes("invest") || lower.includes("etf") || lower.includes("инвест")) {
      return "investments";
    }
    return "deposits";
  }
  if (serviceType === "business") {
    return "business_services";
  }
  return "document_assistance";
}

function detectDepositType(item: {
  category: ProductCategory;
  name: string;
  description: string;
  params: Array<{ label: string; value: string }>;
}): DepositType | undefined {
  if (item.category !== "deposits") {
    return undefined;
  }

  const haystack = `${item.name} ${item.description} ${item.params
    .map((param) => `${param.label} ${param.value}`)
    .join(" ")}`.toLowerCase();

  if (
    haystack.includes("до востребован") ||
    haystack.includes("on demand") ||
    haystack.includes("instant access") ||
    haystack.includes("savings account") ||
    haystack.includes("накопительн")
  ) {
    return "on_demand";
  }

  return "term";
}

function buildOfferHighlights(item: ProductItem, locale: Locale): string[] {
  const i18n = {
    cashback: {
      ru: "Кэшбэк",
      en: "Cashback",
      hy: "Քեշբեք",
      be: "Кэшбэк",
      kk: "Кэшбэк",
      ka: "ქეშბექი",
      az: "Keşbek",
      ar: "استرداد نقدي",
      tr: "Nakit iade"
    },
    fee: {
      ru: "Обслуживание",
      en: "Fee",
      hy: "Սպասարկում",
      be: "Абслугоўванне",
      kk: "Қызмет ақысы",
      ka: "საკომისიო",
      az: "Komissiya",
      ar: "الرسوم",
      tr: "Ücret"
    },
    currency: {
      ru: "Валюта",
      en: "Currency",
      hy: "Արժույթ",
      be: "Валюта",
      kk: "Валюта",
      ka: "ვალუტა",
      az: "Valyuta",
      ar: "العملة",
      tr: "Para birimi"
    },
    rate: {
      ru: "Ставка",
      en: "Rate",
      hy: "Դրույք",
      be: "Стаўка",
      kk: "Мөлшерлеме",
      ka: "განაკვეთი",
      az: "Faiz",
      ar: "الفائدة",
      tr: "Oran"
    },
    term: {
      ru: "Срок",
      en: "Term",
      hy: "Ժամկետ",
      be: "Тэрмін",
      kk: "Мерзім",
      ka: "ვადა",
      az: "Müddət",
      ar: "المدة",
      tr: "Vade"
    },
    minAmount: {
      ru: "Мин. сумма",
      en: "Min amount",
      hy: "Նվազ. գումար",
      be: "Мін. сума",
      kk: "Мин. сома",
      ka: "მინ. თანხა",
      az: "Min məbləğ",
      ar: "الحد الأدنى للمبلغ",
      tr: "Min tutar"
    },
    yield: {
      ru: "Доходность",
      en: "Yield",
      hy: "Եկամտաբերություն",
      be: "Даходнасць",
      kk: "Табыстылық",
      ka: "შემოსავალი",
      az: "Gəlirlilik",
      ar: "العائد",
      tr: "Getiri"
    },
    type: {
      ru: "Тип",
      en: "Type",
      hy: "Տեսակ",
      be: "Тып",
      kk: "Түрі",
      ka: "ტიპი",
      az: "Növ",
      ar: "النوع",
      tr: "Tür"
    },
    onDemand: {
      ru: "до востребования",
      en: "on demand",
      hy: "ցպահանջ",
      be: "да запатрабавання",
      kk: "талап етілгенге дейін",
      ka: "მოთხოვნამდე",
      az: "tələb olunanadək",
      ar: "تحت الطلب",
      tr: "vadesiz"
    },
    termType: {
      ru: "срочный",
      en: "term",
      hy: "ժամկետային",
      be: "тэрміновы",
      kk: "мерзімді",
      ka: "ვადიანი",
      az: "müddətli",
      ar: "أجل",
      tr: "vadeli"
    },
    timeline: {
      ru: "Срок",
      en: "Timeline",
      hy: "Ժամկետ",
      be: "Тэрмін",
      kk: "Мерзім",
      ka: "ვადა",
      az: "Müddət",
      ar: "المدة",
      tr: "Süre"
    }
  } as const;

  const l = <K extends keyof typeof i18n>(key: K) => i18n[key][locale] ?? i18n[key].en;
  const out: string[] = [];

  function push(label: string, value?: string) {
    if (!value) return;
    out.push(`${label}: ${value}`);
  }

  if (item.category === "debit_cards" || item.category === "credit_cards") {
    push(l("cashback"), item.cashback);
    push(l("fee"), item.annualFee);
    push(l("currency"), item.currencyOptions?.join(" / "));
  } else if (item.category === "consumer_loans" || item.category === "mortgages") {
    push(l("rate"), item.rate);
    push(l("term"), item.term);
    push(l("minAmount"), item.minAmount);
  } else if (item.category === "deposits" || item.category === "investments") {
    push(l("yield"), item.rate);
    push(l("term"), item.term);
    push(l("minAmount"), item.minAmount);
    if (item.category === "deposits") {
      out.push(
        `${l("type")}: ${
          item.depositType === "on_demand"
            ? l("onDemand")
            : l("termType")
        }`
      );
    }
  } else {
    push(l("fee"), item.annualFee);
    push(l("timeline"), item.term);
  }

  return out.slice(0, 4);
}

function parsePrimaryParam(product: { params: Array<{ label: string; value: string }> }, keys: string[]) {
  const found = product.params.find((param) =>
    keys.some((key) => {
      const haystack = `${param.label} ${param.value}`.toLowerCase();
      return haystack.includes(key);
    })
  );
  return found?.value;
}

function parseMaxAmount(product: { params: Array<{ label: string; value: string }> }): string | undefined {
  const explicit = parsePrimaryParam(product, ["max amount", "maximum", "максим"]);
  if (explicit) {
    return explicit;
  }
  const candidate = product.params.find((param) => {
    const lower = `${param.label} ${param.value}`.toLowerCase();
    return lower.includes("до ") && /(\d|\$|₽|₸|֏|₼|₾|aed|rub|kzt|azn|gel|byn|usd|eur)/i.test(lower);
  });
  return candidate?.value;
}

function hasNumericFinancialValue(value?: string): boolean {
  if (!value) return false;
  return /(\d+[.,]?\d*\s?%|\d[\d\s.,]*\s?(?:₽|₸|֏|₼|₾|aed|rub|kzt|azn|gel|byn|usd|eur))/i.test(
    value
  );
}

function inferCapitalization(product: { params: Array<{ label: string; value: string }> }) {
  const param = parsePrimaryParam(product, ["capitalization", "капитализац"]);
  if (!param) return "unknown" as const;
  const lower = param.toLowerCase();
  if (/(yes|да|есть|enabled|monthly|ежемесячн)/i.test(lower)) return "yes" as const;
  if (/(no|нет|without|без)/i.test(lower)) return "no" as const;
  return "unknown" as const;
}

function inferRateType(product: { params: Array<{ label: string; value: string }> }) {
  const param = parsePrimaryParam(product, ["fixed", "floating", "плава", "фикс"]);
  const haystack = `${param ?? ""} ${product.params.map((item) => `${item.label} ${item.value}`).join(" ")}`.toLowerCase();
  if (/(fixed|фикс)/i.test(haystack)) return "fixed" as const;
  if (/(floating|variable|плава)/i.test(haystack)) return "floating" as const;
  if (/(mixed|комбинирован)/i.test(haystack)) return "mixed" as const;
  return "unknown" as const;
}

function inferRepaymentType(product: { params: Array<{ label: string; value: string }> }) {
  const param = parsePrimaryParam(product, ["annuity", "аннуит", "differentiated", "дифферен", "bullet"]);
  const haystack = `${param ?? ""} ${product.params.map((item) => `${item.label} ${item.value}`).join(" ")}`.toLowerCase();
  if (/(annuity|аннуит)/i.test(haystack)) return "annuity" as const;
  if (/(differentiated|дифферен)/i.test(haystack)) return "differentiated" as const;
  if (/(bullet|единовремен)/i.test(haystack)) return "bullet" as const;
  return "unknown" as const;
}

function parseCurrencyOptions(product: { params: Array<{ label: string; value: string }> }): string[] {
  const currencyParam = product.params.find((param) =>
    param.label.toLowerCase().includes("currency") ||
    param.label.toLowerCase().includes("валюта")
  );

  if (!currencyParam) {
    return [];
  }

  return currencyParam.value
    .split(/[\/, ]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);
}

function buildProductSignal(item: ProductItem): string {
  return `${item.name} ${item.description} ${item.sourceUrl ?? item.url} ${item.params
    .map((param) => `${param.label} ${param.value}`)
    .join(" ")}`
    .toLowerCase();
}

function shouldKeepNormalizedProduct(item: ProductItem): boolean {
  const signal = buildProductSignal(item);
  const nameSignal = item.name.toLowerCase();
  const hasRate = hasNumericFinancialValue(item.rate);
  const hasTerm = hasNumericFinancialValue(item.term);
  const hasAmount = hasNumericFinancialValue(item.minAmount) || hasNumericFinancialValue(item.maxAmount);
  const pendingData = (item.qualityFlags ?? []).includes("pending_data");

  if (item.category === "deposits") {
    if (!/(вклад|депозит|deposit|savings|saving|накоп)/i.test(signal)) {
      return false;
    }
    if (pendingData) {
      return true;
    }
    return hasRate || hasTerm || hasAmount;
  }

  if (item.category === "mortgages") {
    if (!/(ипот|mortgage|недвиж|home loan|housing)/i.test(nameSignal)) {
      return false;
    }
    if (!/(ипот|mortgage|недвиж|home loan|housing loan)/i.test(signal)) {
      return false;
    }
    if (
      /(карт|card|вклад|deposit|новост|journal|help|помощь|финансовым организациям|кредитных организаций|вопросник|лицензи|аккредитив|гарант|памятк|информаци|перейти|заявк|вопросы и ответы|подберите|доступна каждому|целевое назначение|отзыв|опыт обслуживания)/i.test(
        signal
      )
    ) {
      return false;
    }
    if (pendingData) {
      return true;
    }
    return hasRate || hasTerm || hasAmount;
  }

  if (item.category === "consumer_loans") {
    if (!/(кредит|loan|заем|финанс|cash loan|consumer loan|потребитель)/i.test(signal)) {
      return false;
    }
    if (
      /(карт|card|вклад|deposit|новост|journal|финансовым организациям|кредитных организаций|вопросник|лицензи|аккредитив|гарант|памятк|информаци|перейти|вопросы и ответы|подберите|доступна каждому|целевое назначение|отзыв|опыт обслуживания)/i.test(
        signal
      )
    ) {
      return false;
    }
    if (pendingData) {
      return true;
    }
    return hasRate || hasTerm || hasAmount;
  }

  if (item.category === "debit_cards" || item.category === "credit_cards") {
    if (/(отзыв|review|новост|journal|комментар)/i.test(signal)) {
      return false;
    }
    return true;
  }

  return true;
}

function normalizeBankKey(value: string): string {
  return value
    .toLowerCase()
    // Keep ASCII + Cyrillic letters and digits for stable cross-runtime behavior.
    .replace(/[^0-9a-zа-яё]+/gi, " ")
    .replace(/\b(bank|банк|банка|банком|банкъ|banking)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCanonicalBank(
  bankName: string,
  registryBanks: Awaited<ReturnType<typeof fetchRegistryBanks>>
): { id: string; name: string } {
  const normalized = normalizeBankKey(bankName);
  const direct = registryBanks.find((bank) => normalizeBankKey(bank.name) === normalized);
  if (direct) {
    return { id: direct.id, name: direct.name };
  }

  const fuzzy = registryBanks.find((bank) => {
    const bankKey = normalizeBankKey(bank.name);
    return bankKey.includes(normalized) || normalized.includes(bankKey);
  });
  if (fuzzy) {
    return { id: fuzzy.id, name: fuzzy.name };
  }

  const normalizedId = bankName
    .toLowerCase()
    .replace(/[^0-9a-zа-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: normalizedId || "unknown-bank",
    name: bankName
  };
}

function normalizeProducts(
  country: Country,
  locale: Locale,
  payload: Awaited<ReturnType<typeof getLiveCountryOffers>>,
  registryBanks: Awaited<ReturnType<typeof fetchRegistryBanks>>
): ProductItem[] {
  const items: ProductItem[] = [];

  const allOffers = [
    ...payload.offers.cards,
    ...payload.offers.loans,
    ...payload.offers.deposits,
    ...payload.offers.business,
    ...payload.offers.documents
  ];

  for (const offer of allOffers) {
    const category = mapLegacyToProductCategory(
      offer.serviceType,
      offer.name,
      offer.sourceUrl ?? offer.url,
      offer.description,
      offer.params
    );
    const canonicalBank = resolveCanonicalBank(offer.providerName, registryBanks);
    const source =
      offer.source ??
      (payload.sourceStatus === "fallback" ? "registry_fallback" : "bank_site");
    const qualityFlags = offer.qualityFlags ?? [];
    const pendingData = qualityFlags.includes("pending_data");
    const hasNumericSignal =
      hasNumericFinancialValue(parsePrimaryParam(offer, ["rate", "yield", "ставка", "доход"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["term", "срок"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["minimum amount", "min amount", "миним"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["cashback", "кэшбэк"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["annual fee", "обслуживание", "service fee", "комиссия"]));
    const completeness: ProductItem["completeness"] = pendingData
      ? "pending"
      : hasNumericSignal
        ? "full"
        : "partial";
    const qualityScore = pendingData ? 35 : hasNumericSignal ? 85 : 60;
    const product: ProductItem = {
      id: `${country}-${offer.id}`,
      bankId: canonicalBank.id,
      bankName: canonicalBank.name,
      canonicalBankId: canonicalBank.id,
      canonicalBankName: canonicalBank.name,
      bankLogoUrl: getProxyLogoUrl(offer.url),
      category,
      name: offer.name,
      description: offer.description,
      url: offer.url,
      source,
      params: offer.params,
      cashback: parsePrimaryParam(offer, ["cashback", "кэшбэк"]),
      annualFee: parsePrimaryParam(offer, ["annual fee", "обслуживание", "service fee", "комиссия"]),
      currencyOptions: parseCurrencyOptions(offer),
      rate: parsePrimaryParam(offer, ["rate", "yield", "ставка", "доход"]),
      term: parsePrimaryParam(offer, ["term", "срок"]),
      minAmount: parsePrimaryParam(offer, ["minimum amount", "min amount", "миним"]),
      maxAmount: parseMaxAmount(offer),
      capitalization: inferCapitalization(offer),
      rateType: inferRateType(offer),
      repaymentType: inferRepaymentType(offer),
      sourceUrl: offer.sourceUrl ?? offer.url,
      sourceFetchedAt: payload.fetchedAt,
      sourceChain: [source, "normalization_rules"],
      qualityFlags,
      qualityScore,
      completeness,
      extractedAt: payload.fetchedAt,
      verifiedAt: pendingData ? undefined : payload.fetchedAt,
      updatedAt: payload.fetchedAt
    };

    items.push({
      ...product,
      category: mapCategory(product)
    });
  }

  const normalized = items.map((item) => {
    const depositType = detectDepositType(item);

    if (item.category !== "debit_cards") {
      return {
        ...item,
        depositType,
        hasRealRate: hasNumericFinancialValue(item.rate),
        hasRealTerm: hasNumericFinancialValue(item.term)
      };
    }

    const filteredParams = item.params.filter((param) => {
      const label = param.label.toLowerCase();
      return !(
        label.includes("limit") ||
        label.includes("лимит") ||
        label.includes("credit limit") ||
        label.includes("кредитный лимит")
      );
    });

    return {
      ...item,
      params: filteredParams,
      depositType,
      hasRealRate: hasNumericFinancialValue(item.rate),
      hasRealTerm: hasNumericFinancialValue(item.term)
    };
  });

  const deduplicated = Array.from(
    new Map(
      normalized.map((item) => {
        const key = [
          country,
          item.canonicalBankId ?? item.bankId,
          item.category,
          item.name.toLowerCase().replace(/\s+/g, " ").trim(),
          (item.rate ?? "").toLowerCase(),
          (item.term ?? "").toLowerCase(),
          (item.minAmount ?? "").toLowerCase(),
          (item.annualFee ?? "").toLowerCase()
        ].join("|");
        return [key, item] as const;
      })
    ).values()
  );

  return deduplicated.filter((item) => shouldKeepNormalizedProduct(item));
}

function toProviderId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^0-9a-zа-яё]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStaticFallbackProducts(country: Country): ProductItem[] {
  const offersByService = OFFERS_BY_COUNTRY[country];
  if (!offersByService) {
    return [];
  }

  const fetchedAt = nowIso();
  const allOffers: Offer[] = [
    ...offersByService.cards,
    ...offersByService.loans,
    ...offersByService.deposits,
    ...offersByService.business,
    ...offersByService.documents
  ];

  const products = allOffers.map((offer, index) => {
    const category = mapLegacyToProductCategory(
      offer.serviceType,
      offer.name,
      offer.sourceUrl ?? offer.url,
      offer.description,
      offer.params
    );
    const bankId = toProviderId(offer.providerName) || `${country}-fallback-${index + 1}`;
    const hasNumericSignal =
      hasNumericFinancialValue(parsePrimaryParam(offer, ["rate", "yield", "ставка", "доход"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["term", "срок", "horizon"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["minimum amount", "min amount", "миним"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["cashback", "кэшбэк"])) ||
      hasNumericFinancialValue(parsePrimaryParam(offer, ["annual fee", "обслуживание", "service fee", "комиссия"]));

    const product: ProductItem = {
      id: `${country}-${offer.id}`,
      bankId,
      bankName: offer.providerName,
      canonicalBankId: bankId,
      canonicalBankName: offer.providerName,
      bankLogoUrl: offer.providerLogoUrl || getProxyLogoUrl(offer.url),
      category,
      name: offer.name,
      description: offer.description,
      url: offer.url,
      source: "registry_fallback",
      params: offer.params,
      cashback: parsePrimaryParam(offer, ["cashback", "кэшбэк"]),
      annualFee: parsePrimaryParam(offer, ["annual fee", "обслуживание", "service fee", "комиссия"]),
      currencyOptions: parseCurrencyOptions(offer),
      rate: parsePrimaryParam(offer, ["rate", "yield", "ставка", "доход", "expected yield"]),
      term: parsePrimaryParam(offer, ["term", "срок", "horizon", "timeline"]),
      minAmount: parsePrimaryParam(offer, ["minimum amount", "min amount", "миним"]),
      maxAmount: parseMaxAmount(offer),
      capitalization: inferCapitalization(offer),
      rateType: inferRateType(offer),
      repaymentType: inferRepaymentType(offer),
      sourceUrl: offer.sourceUrl ?? offer.url,
      sourceFetchedAt: fetchedAt,
      sourceChain: ["registry_fallback", "static_catalog_fallback"],
      qualityFlags: ["static_fallback"],
      qualityScore: hasNumericSignal ? 72 : 55,
      completeness: hasNumericSignal ? "partial" : "pending",
      extractedAt: fetchedAt,
      verifiedAt: undefined,
      updatedAt: fetchedAt
    };

    return {
      ...product,
      category: mapCategory(product),
      depositType: detectDepositType(product),
      hasRealRate: hasNumericFinancialValue(product.rate),
      hasRealTerm: hasNumericFinancialValue(product.term)
    } as ProductItem;
  });

  return products.filter((item) => shouldKeepNormalizedProduct(item));
}

function buildFallbackBanksFromProducts(country: Country, products: ProductItem[]): BankRegistryItem[] {
  const byBank = new Map<string, ProductItem[]>();
  products.forEach((product) => {
    const bankId = product.canonicalBankId ?? product.bankId;
    const current = byBank.get(bankId) ?? [];
    current.push(product);
    byBank.set(bankId, current);
  });

  return Array.from(byBank.entries()).map(([id, items]) => {
    const website = items[0]?.sourceUrl ?? items[0]?.url ?? "https://bank.example";
    const count = items.length;
    const coverageStatus: BankCoverageStatus = count > 3 ? "full" : "partial";
    return {
      id,
      country,
      name: items[0]?.canonicalBankName ?? items[0]?.bankName ?? "Fallback bank",
      website,
      logoUrl: items[0]?.bankLogoUrl ?? getProxyLogoUrl(website),
      coverageStatus,
      productsCount: count,
      source: "bank_site",
      registryStatus: "active",
      lastProductSeenAt: nowIso(),
      regulatorSource: "static_fallback"
    };
  });
}

function inferFallbackCategoryFromQuery(query: string): ProductCategory | null {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    return null;
  }

  if (/(ипотек|mortgage|home\s*loan|housing)/i.test(normalized)) {
    return "mortgages";
  }
  if (/(кредит|loan|заем|consumer)/i.test(normalized)) {
    return "consumer_loans";
  }
  if (/(вклад|депозит|deposit|saving|сбереж)/i.test(normalized)) {
    return "deposits";
  }
  if (/(карт|card|debit|credit)/i.test(normalized)) {
    return "debit_cards";
  }
  if (/(бизнес|business|rko|acquiring|merchant)/i.test(normalized)) {
    return "business_services";
  }
  if (/(документ|document|paperwork|compliance)/i.test(normalized)) {
    return "document_assistance";
  }

  return null;
}

function getEffectiveSnapshotData(country: Country) {
  const snapshot = state.byCountry[country];
  if (snapshot.products.length > 0) {
    return {
      snapshot,
      products: snapshot.products,
      banks: snapshot.banks,
      usingStaticFallback: false
    };
  }

  const fallbackProducts = buildStaticFallbackProducts(country);
  const fallbackBanks =
    fallbackProducts.length > 0 ? buildFallbackBanksFromProducts(country, fallbackProducts) : snapshot.banks;

  return {
    snapshot,
    products: fallbackProducts,
    banks: fallbackBanks,
    usingStaticFallback: true
  };
}

async function buildBankRegistry(country: Country, products: ProductItem[]): Promise<BankRegistryItem[]> {
  const byBank = new Map<string, number>();
  for (const item of products) {
    byBank.set(item.bankName, (byBank.get(item.bankName) ?? 0) + 1);
  }

  const registryBanks = await fetchRegistryBanks(country);

  return registryBanks.map((bank) => {
    const productsCount = byBank.get(bank.name) ?? 0;
    const coverageStatus: BankCoverageStatus =
      productsCount > 3 ? "full" : productsCount > 0 ? "partial" : "registry_only";

    return {
      id: bank.id,
      country,
      name: bank.name,
      website: bank.website,
      logoUrl: getProxyLogoUrl(bank.website),
      coverageStatus,
      productsCount,
      source: "regulator",
      registryStatus: bank.registryStatus ?? "unknown",
      lastProductSeenAt: productsCount > 0 ? new Date().toISOString() : undefined,
      regulatorSource: bank.regulatorSource
    };
  });
}

function buildSourceHealth(payload: Awaited<ReturnType<typeof getLiveCountryOffers>>): SnapshotSourceHealth {
  const statuses = Object.values(payload.meta).map((meta) => meta.status);
  const hasLive = statuses.some((status) => status === "live");
  const hasFallback = statuses.some((status) => status === "fallback");

  return {
    sravni: getSravniHealth(),
    bankSites: hasLive && !hasFallback ? "healthy" : hasLive ? "degraded" : "down",
    registries: "healthy"
  };
}

async function buildCountrySnapshot(country: Country, snapshotId: string): Promise<CountrySnapshot> {
  const payload = await getLiveCountryOffers(country, "en");
  const registryBanks = await fetchRegistryBanks(country);
  const products = normalizeProducts(country, "en", payload, registryBanks);
  const banks = await buildBankRegistry(country, products);

  return {
    snapshotId,
    country,
    updatedAt: payload.fetchedAt,
    products,
    banks,
    sourceHealth: buildSourceHealth(payload)
  };
}

function collectTopHighlights(products: ProductItem[]): string[] {
  const fromHighlights = products
    .flatMap((item) => item.offerHighlights ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (fromHighlights.length > 0) {
    return Array.from(new Set(fromHighlights)).slice(0, 4);
  }

  const fromParams = products
    .flatMap((item) => item.params.slice(0, 2).map((param) => `${param.label}: ${param.value}`))
    .filter(Boolean);
  return Array.from(new Set(fromParams)).slice(0, 4);
}

export async function getCatalogBankGroups(input: {
  country: Country;
  locale: Locale;
  category?: ProductCategory;
  q?: string;
  source?: "sravni" | "bank_site" | "registry_fallback";
  page?: number;
  pageSize?: number;
}) {
  await ensureSnapshotFresh();
  const { snapshot, products: baseProducts, banks } = getEffectiveSnapshotData(input.country);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  let products = baseProducts;
  if (input.category) {
    products = products.filter((product) => product.category === input.category);
  }
  if (input.source) {
    products = products.filter((product) => product.source === input.source);
  }
  if (input.q?.trim()) {
    const query = normalizeSearch(input.q);
    products = products
      .map((product) => ({
        product,
        score: scoreMatch(
          query,
          `${product.name} ${product.bankName} ${(product.aiSummary ?? "").trim()} ${product.params
            .map((param) => `${param.label} ${param.value}`)
            .join(" ")}`
        )
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);
  }

  const byBank = new Map<string, ProductItem[]>();
  products.forEach((product) => {
    const bankKey = product.canonicalBankId ?? product.bankId;
    const current = byBank.get(bankKey) ?? [];
    current.push(product);
    byBank.set(bankKey, current);
  });

  const allGroups: BankGroupItem[] = banks.map((bank) => {
    const productList = byBank.get(bank.id) ?? [];
    return {
      bankId: bank.id,
      bankName: bank.name,
      bankLogoUrl: bank.logoUrl,
      offersCount: productList.length,
      registryStatus: bank.registryStatus ?? "unknown",
      hasOffers: productList.length > 0,
      sources: Array.from(new Set(productList.map((item) => item.source))),
      topHighlights: collectTopHighlights(productList)
    };
  });

  const groups = allGroups
    .sort((a, b) => {
      if (a.hasOffers !== b.hasOffers) {
        return a.hasOffers ? -1 : 1;
      }
      if (b.offersCount !== a.offersCount) {
        return b.offersCount - a.offersCount;
      }
      return a.bankName.localeCompare(b.bankName);
    })
    .slice((page - 1) * pageSize, page * pageSize);

  return {
    snapshotId: snapshot.snapshotId,
    updatedAt: snapshot.updatedAt,
    totalBanks: allGroups.length,
    page,
    pageSize,
    banks: groups
  };
}

export async function getCatalogBankProducts(input: {
  country: Country;
  locale: Locale;
  bankId: string;
  category?: ProductCategory;
  includeHiddenQuality?: boolean;
  page?: number;
  pageSize?: number;
}) {
  await ensureSnapshotFresh();
  const { snapshot, products: baseProducts } = getEffectiveSnapshotData(input.country);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  let products = baseProducts.filter(
    (product) => (product.canonicalBankId ?? product.bankId) === input.bankId
  );
  if (input.category) {
    products = products.filter((product) => product.category === input.category);
  }
  if (!input.includeHiddenQuality) {
    products = products.filter((product) => {
      const flags = product.qualityFlags ?? [];
      return !flags.some((flag) => /noise|review|invalid/i.test(flag));
    });
  }

  const paginated = products.slice((page - 1) * pageSize, page * pageSize);
  const enriched = await Promise.all(
    paginated.map(async (item) => {
      const ai = await getProductAiSummary(item, input.locale);
      const featureTags = ai.tags.length > 0 ? ai.tags : deriveRuleTags(item);
      return {
        ...item,
        aiSummary: ai.summary,
        aiTags: featureTags,
        aiSummaryMode: ai.mode,
        aiSummaryModel: ai.model,
        offerHighlights: buildOfferHighlights(item, input.locale)
      };
    })
  );

  return {
    snapshotId: snapshot.snapshotId,
    updatedAt: snapshot.updatedAt,
    total: products.length,
    page,
    pageSize,
    products: enriched
  };
}

async function doRefreshAll() {
  const startedAt = Date.now();
  const cycleId = `cycle-${startedAt}`;
  const snapshotId = `snap-${startedAt}`;
  const snapshots: Array<[Country, CountrySnapshot]> = await Promise.all(
    COUNTRY_OPTIONS.map(async (option) => {
      try {
        const snapshot = await buildCountrySnapshot(option.value, snapshotId);
        return [option.value, snapshot] as [Country, CountrySnapshot];
      } catch (error) {
        console.error(`Failed to build snapshot for ${option.value}`, error);
        const previous = state.byCountry[option.value];
        if (previous) {
          return [
            option.value,
            {
              ...previous,
              snapshotId,
              updatedAt: nowIso(),
              sourceHealth: {
                ...previous.sourceHealth,
                bankSites: "degraded",
                registries: "degraded"
              }
            }
          ] as [Country, CountrySnapshot];
        }

        return [
          option.value,
          {
            snapshotId,
            country: option.value,
            updatedAt: nowIso(),
            products: [] as ProductItem[],
            banks: [] as BankRegistryItem[],
            sourceHealth: {
              sravni: "degraded",
              bankSites: "down",
              registries: "down"
            }
          }
        ] as [Country, CountrySnapshot];
      }
    })
  );

  const nextByCountry = {} as Record<Country, CountrySnapshot>;
  snapshots.forEach(([country, snapshot]) => {
    nextByCountry[country] = snapshot;
  });

  const nextState: SnapshotState = {
    currentSnapshotId: snapshotId,
    updatedAt: nowIso(),
    byCountry: nextByCountry
  };

  state = nextState;

  const sourceRuns: SourceRun[] = COUNTRY_OPTIONS.map((option) => {
    const countrySnapshot = nextByCountry[option.value];
    const sourceHealth = countrySnapshot.sourceHealth;
    const status =
      sourceHealth.bankSites === "healthy" && sourceHealth.registries === "healthy"
        ? "ok"
        : sourceHealth.bankSites === "down" || sourceHealth.registries === "down"
          ? "failed"
          : "degraded";
    return {
      runId: `${cycleId}-${option.value}`,
      cycleId,
      source: "catalog_refresh",
      country: option.value,
      status,
      durationMs: Date.now() - startedAt,
      itemsFetched: countrySnapshot.products.length
    };
  });

  try {
    await saveSnapshotStateToDb({
      state: nextState,
      cycleId,
      sourceRuns
    });
  } catch (error) {
    console.error("Failed to persist snapshot state", error);
  }
}

export async function refreshAllSnapshots() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = doRefreshAll().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function hydrateStateFromPersistence(): Promise<boolean> {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    try {
      const persisted = await loadSnapshotStateFromDb();
      if (!persisted) {
        return false;
      }

      state = persisted as SnapshotState;
      return true;
    } catch (error) {
      console.error("Failed to hydrate snapshots from persistence", error);
      return false;
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export async function ensureSnapshotFresh() {
  if (state.currentSnapshotId === "bootstrap") {
    const hydrated = await hydrateStateFromPersistence();
    if (hydrated) {
      return;
    }

    // Return immediately with a lightweight fallback snapshot and refresh in background.
    state = buildBootstrapState();
    if (!refreshPromise) {
      void refreshAllSnapshots().catch((error) => {
        console.error("Background bootstrap refresh failed", error);
      });
    }
    return;
  }

  if (state.currentSnapshotId.startsWith("bootstrap-")) {
    const age = Date.now() - new Date(state.updatedAt).getTime();
    if (!refreshPromise && (!Number.isFinite(age) || age > BOOTSTRAP_RETRY_MS)) {
      void refreshAllSnapshots().catch((error) => {
        console.error("Background bootstrap retry refresh failed", error);
      });
    }
    return;
  }

  const age = Date.now() - new Date(state.updatedAt).getTime();
  if (!Number.isFinite(age)) {
    if (!refreshPromise) {
      void refreshAllSnapshots().catch((error) => {
        console.error("Background refresh failed", error);
      });
    }
    return;
  }

  if (age > REFRESH_MS) {
    // Refresh asynchronously to keep API latency stable.
    if (!refreshPromise) {
      void refreshAllSnapshots().catch((error) => {
        console.error("Background refresh failed", error);
      });
    }
  }
}

function sortProducts(products: ProductItem[], sort: string): ProductItem[] {
  const output = [...products];

  if (sort === "rate_asc") {
    output.sort((a, b) => extractNumber(a.rate) - extractNumber(b.rate));
  } else if (sort === "rate_desc") {
    output.sort((a, b) => extractNumber(b.rate) - extractNumber(a.rate));
  } else if (sort === "fee_asc") {
    output.sort((a, b) => extractNumber(a.annualFee) - extractNumber(b.annualFee));
  } else if (sort === "fee_desc") {
    output.sort((a, b) => extractNumber(b.annualFee) - extractNumber(a.annualFee));
  }

  return output;
}

function diversifyProducts(products: ProductItem[]): ProductItem[] {
  const groups = new Map<string, ProductItem[]>();
  products.forEach((item) => {
    const key = item.canonicalBankId ?? item.bankId;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });

  const keys = Array.from(groups.keys());
  const output: ProductItem[] = [];
  let added = true;

  while (added) {
    added = false;
    keys.forEach((key) => {
      const bucket = groups.get(key);
      if (!bucket || bucket.length === 0) {
        return;
      }
      const next = bucket.shift();
      if (next) {
        output.push(next);
        added = true;
      }
    });
  }

  return output;
}

function capProductsPerBank(products: ProductItem[], maxPerBankPerCategory = 6): ProductItem[] {
  const counters = new Map<string, number>();
  const output: ProductItem[] = [];
  for (const item of products) {
    const key = `${item.canonicalBankId ?? item.bankId}|${item.category}`;
    const current = counters.get(key) ?? 0;
    if (current >= maxPerBankPerCategory) {
      continue;
    }
    counters.set(key, current + 1);
    output.push(item);
  }
  return output;
}

function buildSectionSummary(products: ProductItem[]) {
  if (products.length === 0) {
    return {
      minRate: null,
      maxRate: null,
      minFee: null,
      maxFee: null,
      currencies: [],
      banks: 0
    };
  }

  const rates = products.map((item) => extractNumber(item.rate)).filter(Number.isFinite);
  const fees = products.map((item) => extractNumber(item.annualFee)).filter(Number.isFinite);
  const currencies = Array.from(
    new Set(products.flatMap((item) => item.currencyOptions ?? []))
  ).slice(0, 8);
  const banks = new Set(products.map((item) => item.bankName)).size;

  return {
    minRate: rates.length ? Math.min(...rates) : null,
    maxRate: rates.length ? Math.max(...rates) : null,
    minFee: fees.length ? Math.min(...fees) : null,
    maxFee: fees.length ? Math.max(...fees) : null,
    currencies,
    banks
  };
}

function buildFacets(products: ProductItem[]): CatalogFacets {
  const bankCounter = new Map<string, { name: string; count: number }>();
  const currencyCounter = new Map<string, number>();
  const categoryCounter = new Map<ProductCategory, number>();

  products.forEach((item) => {
    const bankId = item.canonicalBankId ?? item.bankId;
    const current = bankCounter.get(bankId) ?? { name: item.bankName, count: 0 };
    current.count += 1;
    bankCounter.set(bankId, current);
    item.currencyOptions?.forEach((currency) => {
      currencyCounter.set(currency, (currencyCounter.get(currency) ?? 0) + 1);
    });
    categoryCounter.set(item.category, (categoryCounter.get(item.category) ?? 0) + 1);
  });

  return {
    banks: Array.from(bankCounter.entries())
      .map(([id, value]) => ({
        id,
        name: value.name,
        count: value.count
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    currencies: Array.from(currencyCounter.entries()).map(([code, count]) => ({ code, count })),
    categories: Array.from(categoryCounter.entries()).map(([key, count]) => ({ key, count }))
  };
}

function categoryToServiceType(category: ProductCategory): ServiceType {
  if (category === "debit_cards" || category === "credit_cards") return "cards";
  if (category === "consumer_loans" || category === "mortgages") return "loans";
  if (category === "deposits" || category === "investments") return "deposits";
  if (category === "business_services") return "business";
  return "documents";
}

function mapProductToOffer(item: ProductItem): Offer {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    details: item.description,
    params: item.params,
    url: item.url,
    providerName: item.bankName,
    providerLogoUrl: item.bankLogoUrl,
    serviceType: categoryToServiceType(item.category),
    source: item.source,
    qualityFlags: item.qualityFlags,
    sourceUrl: item.sourceUrl
  };
}

function summarizeServiceOffers(
  serviceType: ServiceType,
  offers: Offer[]
): { meta: ServiceFetchMeta; summary: ServiceSummaryItem } {
  const providerCount = new Set(offers.map((offer) => offer.providerName)).size;
  const hasLive = offers.some((offer) => offer.source === "sravni" || offer.source === "bank_site");
  return {
    meta: {
      provider: hasLive ? "Snapshot live" : "Snapshot fallback",
      status: hasLive ? "live" : "fallback",
      url: offers[0]?.sourceUrl ?? offers[0]?.url ?? "",
      providerCount
    },
    summary: {
      serviceType,
      offerCount: offers.length,
      providerCount
    }
  };
}

export async function getCatalogResponse(input: {
  country: Country;
  locale: Locale;
  category?: ProductCategory;
  depositType?: DepositType;
  q?: string;
  sort?: string;
  bank?: string;
  currency?: string;
  rateMin?: number;
  rateMax?: number;
  feeMin?: number;
  feeMax?: number;
  amountMin?: number;
  amountMax?: number;
  termMin?: number;
  termMax?: number;
  cashbackMin?: number;
  onlineOnly?: boolean;
  source?: "sravni" | "bank_site" | "registry_fallback";
  featureTags?: string[];
  intent?: string;
  hasAiSummary?: boolean;
  bankStatus?: "active" | "suspended" | "unknown";
  strict?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<CatalogResponse> {
  await ensureSnapshotFresh();
  const { snapshot, products: snapshotProducts, banks, usingStaticFallback } = getEffectiveSnapshotData(
    input.country
  );
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  let products = snapshotProducts;

  if (input.category) {
    products = products.filter((product) => product.category === input.category);
  }

  if (input.depositType) {
    products = products.filter((product) => product.depositType === input.depositType);
  }

  if (input.q) {
    const query = normalizeSearch(input.q);
    products = products
      .map((product) => ({
        product,
        score: scoreMatch(query, `${product.name} ${product.bankName} ${product.description}`)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);

    if (products.length === 0 && usingStaticFallback) {
      const inferredCategory = inferFallbackCategoryFromQuery(input.q);
      if (inferredCategory) {
        products = snapshotProducts.filter((product) => {
          if (inferredCategory === "consumer_loans") {
            return product.category === "consumer_loans" || product.category === "mortgages";
          }
          if (inferredCategory === "debit_cards") {
            return product.category === "debit_cards" || product.category === "credit_cards";
          }
          return product.category === inferredCategory;
        });
      }
    }
  }

  if (input.bank) {
    products = products.filter((product) => product.bankId === input.bank);
  }

  if (input.currency) {
    const code = input.currency.toUpperCase();
    products = products.filter((product) =>
      (product.currencyOptions ?? []).includes(code)
    );
  }

  if (Number.isFinite(input.rateMin)) {
    products = products.filter((product) => extractNumber(product.rate) >= (input.rateMin ?? 0));
  }

  if (Number.isFinite(input.rateMax)) {
    products = products.filter((product) => extractNumber(product.rate) <= (input.rateMax ?? Number.POSITIVE_INFINITY));
  }

  if (Number.isFinite(input.feeMin)) {
    products = products.filter((product) => extractNumber(product.annualFee) >= (input.feeMin ?? 0));
  }

  if (Number.isFinite(input.feeMax)) {
    products = products.filter((product) => extractNumber(product.annualFee) <= (input.feeMax ?? Number.POSITIVE_INFINITY));
  }

  if (Number.isFinite(input.amountMin)) {
    products = products.filter((product) => extractNumber(product.minAmount) >= (input.amountMin ?? 0));
  }

  if (Number.isFinite(input.amountMax)) {
    products = products.filter((product) => extractNumber(product.minAmount) <= (input.amountMax ?? Number.POSITIVE_INFINITY));
  }

  if (Number.isFinite(input.termMin)) {
    products = products.filter((product) => extractTermInMonths(product.term) >= (input.termMin ?? 0));
  }

  if (Number.isFinite(input.termMax)) {
    products = products.filter((product) => extractTermInMonths(product.term) <= (input.termMax ?? Number.POSITIVE_INFINITY));
  }

  if (Number.isFinite(input.cashbackMin)) {
    products = products.filter((product) => extractNumber(product.cashback) >= (input.cashbackMin ?? 0));
  }

  if (input.onlineOnly) {
    products = products.filter((product) =>
      product.params.some((param) =>
        /online|remote|дистанц|онлайн/i.test(`${param.label} ${param.value}`)
      )
    );
  }

  if (input.source) {
    products = products.filter((product) => product.source === input.source);
  }

  if (input.bankStatus) {
    const bankStatusById = new Map(
      banks.map((bank) => [bank.id, bank.registryStatus ?? "unknown"] as const)
    );
    products = products.filter(
      (product) => bankStatusById.get(product.canonicalBankId ?? product.bankId) === input.bankStatus
    );
  }

  if (input.strict) {
    products = products.filter((product) => {
      const flags = product.qualityFlags ?? [];
      const hasNoise = flags.some((flag) => /noise|review|invalid|junk/i.test(flag));
      return !hasNoise && product.completeness !== "pending";
    });
  }

  const requestedFeatureTags =
    input.featureTags?.map((tag) => normalizeSearch(tag)).filter(Boolean) ?? [];
  const requestedIntent = input.intent ? normalizeSearch(input.intent) : "";
  const needsAiPrecompute =
    requestedFeatureTags.length > 0 ||
    Boolean(requestedIntent) ||
    typeof input.hasAiSummary === "boolean";
  const aiMetaById = new Map<
    string,
    {
      summary: string;
      tags: string[];
      tagsNormalized: string[];
      intent: string;
      intentNormalized: string;
      model: string;
      mode: "live" | "fallback";
    }
  >();

  if (needsAiPrecompute) {
    const evaluated = await Promise.all(
      products.map(async (product) => {
        const ai = await getProductAiSummary(product, input.locale);
        const tags = ai.tags.length > 0 ? ai.tags : deriveRuleTags(product);
        const intent = deriveProductIntent(product);
        return {
          id: product.id,
          summary: ai.summary,
          tags,
          tagsNormalized: tags.map((tag) => normalizeSearch(tag)),
          intent,
          intentNormalized: normalizeSearch(intent),
          model: ai.model,
          mode: ai.mode
        };
      })
    );

    evaluated.forEach((entry) => {
      aiMetaById.set(entry.id, entry);
    });
  }

  if (requestedFeatureTags.length > 0 || requestedIntent) {
    products = products.filter((product) => {
      const aiMeta = aiMetaById.get(product.id);
      const tags = aiMeta?.tagsNormalized ?? deriveRuleTags(product).map((tag) => normalizeSearch(tag));
      const intent = aiMeta?.intentNormalized ?? normalizeSearch(deriveProductIntent(product));
      const tagsOk =
        requestedFeatureTags.length === 0 ||
        requestedFeatureTags.every((tag) => tags.includes(tag));
      const intentOk = !requestedIntent || intent.includes(requestedIntent);
      return tagsOk && intentOk;
    });
  }

  if (typeof input.hasAiSummary === "boolean") {
    products = products.filter((product) => {
      const summary = aiMetaById.get(product.id)?.summary ?? "";
      return input.hasAiSummary ? Boolean(summary.trim()) : !summary.trim();
    });
  }

  products = sortProducts(products, input.sort ?? "");
  if (!input.sort && !input.bank) {
    products = diversifyProducts(products);
  }
  const perBankCap = input.bank ? 400 : input.q ? 120 : 60;
  products = capProductsPerBank(products, perBankCap);
  const facets = buildFacets(products);
  const sectionSummary = buildSectionSummary(products);

  const paginated = products.slice((page - 1) * pageSize, page * pageSize);
  const enrichedPaginated = await Promise.all(
    paginated.map(async (item) => {
      const cachedAi = aiMetaById.get(item.id);
      const ai =
        cachedAi != null
          ? {
              summary: cachedAi.summary,
              tags: cachedAi.tags,
              model: cachedAi.model,
              mode: cachedAi.mode
            }
          : await getProductAiSummary(item, input.locale);
      const intent = cachedAi?.intent ?? deriveProductIntent(item);
      const featureTags = cachedAi?.tags ?? (ai.tags.length > 0 ? ai.tags : deriveRuleTags(item));
      const bankStatus =
        banks.find((bank) => bank.id === (item.canonicalBankId ?? item.bankId))?.registryStatus ??
        "unknown";
      return {
        ...item,
        aiSummary: ai.summary,
        aiTags: featureTags,
        aiSummaryMode: ai.mode,
        aiSummaryModel: ai.model,
        intent,
        featureTags,
        hasAiSummary: Boolean(ai.summary.trim()),
        bankStatus,
        offerHighlights: buildOfferHighlights(item, input.locale)
      };
    })
  );

  const sourceBreakdown = {
    sravniLive: products.filter((item) => item.source === "sravni").length,
    bankLive: products.filter((item) => item.source === "bank_site").length,
    fallback: products.filter((item) => item.source === "registry_fallback").length
  };
  const coverage = {
    full: banks.filter((bank) => bank.coverageStatus === "full").length,
    partial: banks.filter((bank) => bank.coverageStatus === "partial").length,
    registryOnly: banks.filter((bank) => bank.coverageStatus === "registry_only").length
  };
  const banksTotal = banks.length;
  const banksCovered = banks.filter((bank) => bank.coverageStatus !== "registry_only").length;
  const qualityFlagged = products.filter((item) => (item.qualityFlags ?? []).length > 0).length;
  const withAiSummary = enrichedPaginated.filter((item) => Boolean(item.aiSummary?.trim())).length;
  const matchedByName = input.q
    ? products.filter((item) => scoreMatch(normalizeSearch(input.q ?? ""), item.name) > 0).length
    : 0;
  const matchedByParams = input.q
    ? products.filter((item) => scoreMatch(normalizeSearch(input.q ?? ""), item.params.map((param) => `${param.label} ${param.value}`).join(" ")) > 0).length
    : 0;
  const matchedByAiSummary = input.q
    ? enrichedPaginated.filter((item) => scoreMatch(normalizeSearch(input.q ?? ""), item.aiSummary ?? "") > 0).length
    : 0;

  return {
    snapshotId: snapshot.snapshotId,
    updatedAt: snapshot.updatedAt,
    sourceHealth: snapshot.sourceHealth,
    banksTotal,
    banksCovered,
    products: enrichedPaginated,
    facets,
    sectionSummary,
    sourceBreakdown,
    coverage,
    searchMeta: {
      matchedByAiSummary,
      matchedByParams,
      matchedByName
    },
    sourceMeta: {
      sourceStatus: snapshot.sourceHealth,
      generatedAt: snapshot.updatedAt
    },
    qualityMeta: {
      flagged: qualityFlagged,
      withAiSummary
    },
    totals: {
      products: products.length,
      banksTotal,
      banksCovered
    }
  };
}

export async function getServicesResponse(
  country: Country,
  locale: Locale
): Promise<ServicesApiResponse> {
  void locale;
  await ensureSnapshotFresh();
  const { snapshot, products, banks } = getEffectiveSnapshotData(country);
  const offersByService: CountryOffers = {
    cards: [],
    loans: [],
    deposits: [],
    business: [],
    documents: []
  };

  products.forEach((product) => {
    const serviceType = categoryToServiceType(product.category);
    offersByService[serviceType].push(mapProductToOffer(product));
  });

  const serviceTypes: ServiceType[] = ["cards", "loans", "deposits", "business", "documents"];
  const meta = {} as Record<ServiceType, ServiceFetchMeta>;
  const summary: ServiceSummaryItem[] = [];

  serviceTypes.forEach((serviceType) => {
    const data = summarizeServiceOffers(serviceType, offersByService[serviceType]);
    meta[serviceType] = data.meta;
    summary.push(data.summary);
  });

  const providerServices = new Map<string, Set<ServiceType>>();
  products.forEach((product) => {
    const bankId = product.canonicalBankId ?? product.bankId;
    const serviceType = categoryToServiceType(product.category);
    const current = providerServices.get(bankId) ?? new Set<ServiceType>();
    current.add(serviceType);
    providerServices.set(bankId, current);
  });

  const providers: ProviderCatalogItem[] = banks
    .map((bank) => ({
      id: bank.id,
      name: bank.name,
      website: bank.website,
      logoUrl: bank.logoUrl,
      services: Array.from(providerServices.get(bank.id) ?? [])
    }))
    .filter((provider) => provider.services.length > 0)
    .sort((a, b) => b.services.length - a.services.length || a.name.localeCompare(b.name))
    .slice(0, 120);

  const statuses = Object.values(meta).map((entry) => entry.status);
  const allLive = statuses.every((entry) => entry === "live");
  const allFallback = statuses.every((entry) => entry === "fallback");

  return {
    country,
    offers: offersByService,
    fetchedAt: snapshot.updatedAt,
    sourceStatus: allLive ? "live" : allFallback ? "fallback" : "mixed",
    meta,
    providers,
    summary
  };
}

export async function getBanksSnapshot(country: Country) {
  await ensureSnapshotFresh();
  return state.byCountry[country];
}

export async function getAllCountrySnapshots() {
  await ensureSnapshotFresh();
  return state;
}

export async function getSnapshotRuntimeMeta() {
  await ensureSnapshotFresh();
  const cycleAgeMs = Date.now() - new Date(state.updatedAt).getTime();
  const lastSuccessfulCycle = await getLastSuccessfulCycleFromDb().catch(() => null);
  return {
    refreshIntervalMs: REFRESH_MS,
    cycleAgeSec: Number.isFinite(cycleAgeMs) ? Math.max(0, Math.floor(cycleAgeMs / 1000)) : null,
    lastSuccessfulCycle: lastSuccessfulCycle ?? state.currentSnapshotId
  };
}
