export type Country =
  | "armenia"
  | "belarus"
  | "kazakhstan"
  | "georgia"
  | "russia"
  | "azerbaijan"
  | "uae";

export type LanguageCode =
  | "ru"
  | "en"
  | "hy"
  | "be"
  | "kk"
  | "ka"
  | "az"
  | "ar"
  | "tr";

export type Locale = LanguageCode;
export type CurrencyCode = "USD" | "AMD" | "BYN" | "KZT" | "GEL" | "RUB" | "AZN" | "AED";

export type DepositType = "on_demand" | "term";
export type TermUnit = "days" | "months" | "years";
export type PaymentType = "annuity" | "differentiated";
export type OfferHighlights = string[];
export type RateType = "fixed" | "floating" | "mixed" | "unknown";
export type RepaymentType = "annuity" | "differentiated" | "bullet" | "unknown";

export type ProductCategory =
  | "debit_cards"
  | "credit_cards"
  | "consumer_loans"
  | "mortgages"
  | "deposits"
  | "investments"
  | "business_services"
  | "document_assistance";

export type ServiceType =
  | "cards"
  | "loans"
  | "deposits"
  | "business"
  | "documents";

export interface CountryOption {
  value: Country;
  label: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  locale: string;
  nationalLanguage: LanguageCode;
}

export interface OfferParameter {
  label: string;
  value: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  details: string;
  params: OfferParameter[];
  url: string;
  providerName: string;
  providerLogoUrl: string;
  serviceType: ServiceType;
  source?: "sravni" | "bank_site" | "registry_fallback";
  qualityFlags?: string[];
  sourceUrl?: string;
}

export interface ProductItem {
  id: string;
  bankId: string;
  bankName: string;
  canonicalBankId?: string;
  canonicalBankName?: string;
  bankLogoUrl: string;
  category: ProductCategory;
  name: string;
  description: string;
  url: string;
  source: "sravni" | "bank_site" | "registry_fallback";
  params: OfferParameter[];
  cashback?: string;
  annualFee?: string;
  currencyOptions?: string[];
  rate?: string;
  term?: string;
  minAmount?: string;
  maxAmount?: string;
  depositType?: DepositType;
  capitalization?: "yes" | "no" | "unknown";
  rateType?: RateType;
  repaymentType?: RepaymentType;
  hasRealRate?: boolean;
  hasRealTerm?: boolean;
  offerHighlights?: OfferHighlights;
  aiSummary?: string;
  aiTags?: string[];
  aiSummaryMode?: "live" | "fallback";
  aiSummaryModel?: string;
  intent?: string;
  featureTags?: string[];
  hasAiSummary?: boolean;
  bankStatus?: "active" | "suspended" | "unknown";
  sourceUrl?: string;
  sourceFetchedAt?: string;
  sourceChain?: string[];
  qualityFlags?: string[];
  qualityScore?: number;
  completeness?: "full" | "partial" | "pending";
  extractedAt?: string;
  verifiedAt?: string;
  updatedAt: string;
}

export type CountryOffers = Record<ServiceType, Offer[]>;
export type OffersByCountry = Record<Country, CountryOffers>;

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  tag: string;
  country: string;
  publishedAt: string;
  url: string;
  stableId?: string;
  articleUrl?: string;
  resolvedUrl?: string;
  contentHash?: string;
  isFresh?: boolean;
  extractionReady?: boolean;
  imageUrl?: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  openStatus?: "ready" | "fallback_only";
  provider?: "yandex+trusted" | "trusted" | "fallback";
}

export interface NewsProviderStatus {
  yandex: "healthy" | "degraded" | "down";
  trustedFeeds: "healthy" | "degraded" | "down";
  fulltextExtractor: "healthy" | "degraded";
  lastSuccessfulFetch: string | null;
  lastError?: string | null;
}

export interface ServiceFetchMeta {
  provider: string;
  status: "live" | "fallback";
  url: string;
  message?: string;
  providerCount: number;
}

export interface ProviderCatalogItem {
  id: string;
  name: string;
  website: string;
  logoUrl: string;
  services: ServiceType[];
}

export type BankCoverageStatus = "full" | "partial" | "registry_only";

export interface BankRegistryItem {
  id: string;
  country: Country;
  name: string;
  website: string;
  logoUrl: string;
  coverageStatus: BankCoverageStatus;
  productsCount: number;
  source: "regulator" | "sravni" | "bank_site";
  registryStatus?: "active" | "suspended" | "unknown";
  lastProductSeenAt?: string;
  regulatorSource?: string;
}

export interface ServiceSummaryItem {
  serviceType: ServiceType;
  offerCount: number;
  providerCount: number;
}

export interface ServicesApiResponse {
  country: Country;
  offers: CountryOffers;
  fetchedAt: string;
  sourceStatus: "live" | "mixed" | "fallback";
  meta: Record<ServiceType, ServiceFetchMeta>;
  providers: ProviderCatalogItem[];
  summary: ServiceSummaryItem[];
}

export interface SnapshotSourceHealth {
  sravni: "healthy" | "degraded" | "down";
  bankSites: "healthy" | "degraded" | "down";
  registries: "healthy" | "degraded" | "down";
}

export interface CatalogFacets {
  banks: Array<{ id: string; name: string; count: number }>;
  currencies: Array<{ code: string; count: number }>;
  categories: Array<{ key: ProductCategory; count: number }>;
}

export interface CatalogTotals {
  products: number;
  banksTotal: number;
  banksCovered: number;
}

export interface CatalogSectionSummary {
  minRate: number | null;
  maxRate: number | null;
  minFee: number | null;
  maxFee: number | null;
  currencies: string[];
  banks: number;
}

export interface CatalogResponse {
  snapshotId: string;
  updatedAt: string;
  sourceHealth: SnapshotSourceHealth;
  banksTotal: number;
  banksCovered: number;
  products: ProductItem[];
  facets: CatalogFacets;
  totals: CatalogTotals;
  sectionSummary: CatalogSectionSummary;
  sourceBreakdown?: {
    sravniLive: number;
    bankLive: number;
    fallback: number;
  };
  searchMeta?: {
    matchedByAiSummary: number;
    matchedByParams: number;
    matchedByName: number;
  };
  sourceMeta?: {
    sourceStatus: SnapshotSourceHealth;
    generatedAt: string;
  };
  qualityMeta?: {
    flagged: number;
    withAiSummary: number;
  };
  coverage?: {
    full: number;
    partial: number;
    registryOnly: number;
  };
}

export interface SourceRun {
  runId: string;
  cycleId: string;
  source: string;
  country: Country;
  status: "ok" | "degraded" | "failed";
  errorCode?: string;
  durationMs?: number;
  itemsFetched?: number;
  errorText?: string;
}

export interface SearchGroupResult<T> {
  total: number;
  items: T[];
}

export interface SearchResponse {
  query: string;
  suggestions: string[];
  banks?: SearchGroupResult<BankRegistryItem>;
  products: SearchGroupResult<ProductItem>;
  news: SearchGroupResult<NewsItem>;
  academy?: SearchGroupResult<{
    id: string;
    slug: string;
    title: string;
    moduleTitle: string;
    level: "basic" | "intermediate" | "advanced";
  }>;
  matchedBy?: {
    banks: Array<{ id: string; reasons: Array<"name" | "website">; score: number }>;
    products: Array<{ id: string; reasons: Array<"name" | "params" | "aiSummary" | "bank">; score: number }>;
    news: Array<{ id: string; reasons: Array<"title" | "summary">; score: number }>;
    academy?: Array<{ id: string; reasons: Array<"title" | "content" | "tags">; score: number }>;
  };
  entityHighlights?: {
    products: Array<{ id: string; text: string }>;
    news: Array<{ id: string; text: string }>;
    academy?: Array<{ id: string; text: string }>;
  };
  confidence?: {
    products: number;
    news: number;
    academy: number;
  };
}

export interface CountryCoverageReport {
  country: Country;
  snapshotId: string;
  updatedAt: string;
  stale: boolean;
  banksTotal: number;
  banksCovered: number;
  coverage: {
    full: number;
    partial: number;
    registryOnly: number;
  };
  sources: {
    sravni: number;
    bankSite: number;
    fallback: number;
  };
  categories: Partial<Record<ProductCategory, number>>;
  productsTotal: number;
}

export interface CoverageReportResponse {
  currentSnapshotId: string;
  generatedAt: string;
  countries: CountryCoverageReport[];
}

export interface MobileExpoLinkResponse {
  status: "active" | "expired" | "unavailable" | "refreshing";
  expoGoUrl?: string;
  qrUrl?: string;
  startedAt?: string;
  expiresAt?: string;
  message?: string;
  refreshInProgress?: boolean;
  lastRefreshError?: string | null;
  lastSuccessfulAt?: string | null;
  retryAttempt?: number;
  retryMax?: number;
}

export interface PulseItem extends NewsItem {
  translatedTitle?: string;
  translatedSummary?: string;
  language: LanguageCode;
}

export interface PulseDetailResponse {
  id: string;
  originalUrl: string;
  resolvedUrl?: string;
  originalTitle: string;
  translatedTitle: string;
  translatedBody: string;
  fullTextBlocks?: string[];
  originalTextBlocks?: string[];
  extractionStatus?: "ok" | "partial" | "failed";
  heroImage?: string;
  extractionTrace?: string[];
  fallbackReason?: string;
  summary: string;
  keyPoints: string[];
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiModel?: string;
  aiGeneratedAt?: string;
  summaryMode?: "live" | "fallback";
  translatedAt: string;
  language: LanguageCode;
}

export type CalculatorType =
  | "debit_card"
  | "credit_card"
  | "consumer_loan"
  | "mortgage"
  | "deposit"
  | "investment"
  | "business"
  | "documents";

export interface CalculatorResponse {
  type: CalculatorType;
  result: Record<string, string | number>;
  explanation: string;
  sensitivity: Array<{ label: string; value: string }>;
  schedule?: Array<{
    period: number;
    principal: number;
    interest: number;
    payment: number;
    balance: number;
  }>;
}

export type AcademyLevel = "basic" | "intermediate" | "advanced";

export interface LessonImage {
  src: string;
  alt: string;
  caption?: string;
  kind?: "diagram" | "timeline" | "comparison" | "formula" | "checklist";
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type LessonBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; title?: string; items: string[] }
  | { type: "callout"; tone?: "info" | "warning" | "success"; text: string }
  | { type: "table"; title?: string; headers: string[]; rows: string[][] }
  | { type: "formula"; title: string; expression: string; explanation: string };

export interface AcademyLesson {
  id: string;
  slug: string;
  level: AcademyLevel;
  moduleSlug: string;
  title: string;
  summary: string;
  readingMinutes: number;
  tags: string[];
  blocks: LessonBlock[];
  images: LessonImage[];
  quiz: QuizQuestion[];
}

export interface AcademyModule {
  id: string;
  slug: string;
  level: AcademyLevel;
  title: string;
  summary: string;
  lessonSlugs: string[];
}

export interface BankGroupItem {
  bankId: string;
  bankName: string;
  bankLogoUrl: string;
  offersCount: number;
  registryStatus: "active" | "suspended" | "unknown";
  hasOffers: boolean;
  sources: Array<"sravni" | "bank_site" | "registry_fallback">;
  topHighlights: string[];
}

export interface BusinessArticleAction {
  id: string;
  label: string;
  href: string;
}

export interface BusinessArticleSection {
  id: string;
  title: string;
  content: string[];
  formula?: {
    expression: string;
    explanation: string;
  };
  checklist?: string[];
}

export interface BusinessArticle {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
  sections: BusinessArticleSection[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  actions: BusinessArticleAction[];
}

export interface BusinessBankItem {
  bankId: string;
  name: string;
  country: Country;
  website: string;
  logoUrl: string;
  services: Array<"rko" | "acquiring" | "guarantees" | "leasing" | "ved" | "business_loans" | "business_deposits">;
  priorityTags: string[];
}

export interface BusinessChatResponse {
  reply: string;
  metadata: {
    mode: "live" | "fallback";
    reason: string | null;
    provider: string;
    model: string;
    articleSlug: string | null;
    country: Country;
  };
}

export interface FxSeriesPoint {
  date: string;
  rates: Partial<Record<CurrencyCode, number>>;
}

export interface FxResponse {
  base: CurrencyCode;
  quote: CurrencyCode;
  pair: string;
  country: Country;
  window: 7 | 30 | 90;
  source: "google" | "frankfurter" | "fxratesapi" | "fallback";
  stale: boolean;
  updatedAt: string;
  latestRates: Partial<Record<CurrencyCode, number>>;
  latest: number | null;
  supportedCurrencies: CurrencyCode[];
  series: FxSeriesPoint[];
}

export interface FxHistoryResponse {
  base: CurrencyCode;
  quote: CurrencyCode;
  pair: string;
  window: 7 | 30 | 90;
  source: "google" | "frankfurter" | "fxratesapi" | "fallback";
  stale: boolean;
  updatedAt: string;
  latest: number | null;
  series: Array<{ date: string; rate: number }>;
}

export interface CurrencyMeta {
  code: CurrencyCode;
  emoji: string;
  label: string;
}

export interface AcademyChatResponse {
  reply: string;
  metadata: {
    mode: "live" | "fallback";
    reason: string | null;
    provider: string;
    model: string;
    lessonSlug: string;
    country: Country;
    locale: Locale;
  };
}
