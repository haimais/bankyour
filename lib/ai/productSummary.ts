import crypto from "node:crypto";
import { requestLiveLlmJson } from "@/lib/ai/liveClient";
import { Locale, ProductItem } from "@/lib/types";

interface ProductSummaryCacheValue {
  summary: string;
  tags: string[];
  mode: "live" | "fallback";
  model: string;
  generatedAt: string;
}

const CACHE = new Map<string, ProductSummaryCacheValue>();
const PROMPT_VERSION = "v1";
export const ALLOWED_AI_TAGS = [
  "travel",
  "cashback_high",
  "low_fee",
  "salary_card",
  "premium",
  "quick_approval",
  "low_risk",
  "business_start"
] as const;

type AllowedTag = (typeof ALLOWED_AI_TAGS)[number];

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const allowed = new Set<string>(ALLOWED_AI_TAGS);
  return input
    .map((value) => String(value).trim().toLowerCase())
    .filter((value) => value && allowed.has(value))
    .slice(0, 6);
}

function contentHash(product: ProductItem, locale: Locale): string {
  return crypto
    .createHash("sha1")
    .update(
      [
        product.name,
        product.description,
        product.category,
        product.bankName,
        product.rate,
        product.annualFee,
        product.cashback,
        product.term,
        product.minAmount,
        product.currencyOptions?.join("|"),
        locale,
        PROMPT_VERSION
      ]
        .filter(Boolean)
        .join("::")
    )
    .digest("hex");
}

export function deriveRuleTags(product: ProductItem): string[] {
  const tags = new Set<AllowedTag>();
  const text = `${product.name} ${product.description} ${product.params
    .map((param) => `${param.label} ${param.value}`)
    .join(" ")}`.toLowerCase();

  const fee = Number.parseFloat((product.annualFee ?? "").replace(",", "."));
  const cashback = Number.parseFloat((product.cashback ?? "").replace(",", "."));
  const rate = Number.parseFloat((product.rate ?? "").replace(",", "."));

  if (text.includes("travel") || text.includes("путеше")) tags.add("travel");
  if (Number.isFinite(cashback) && cashback >= 5) tags.add("cashback_high");
  if ((Number.isFinite(fee) && fee <= 0) || text.includes("free")) tags.add("low_fee");
  if (text.includes("salary") || text.includes("зарплат")) tags.add("salary_card");
  if (text.includes("premium") || text.includes("преми")) tags.add("premium");
  if (text.includes("same day") || text.includes("онлайн") || text.includes("быстро"))
    tags.add("quick_approval");
  if (
    product.category === "deposits" ||
    product.category === "investments" ||
    (Number.isFinite(rate) && rate > 0 && rate < 8)
  ) {
    tags.add("low_risk");
  }
  if (product.category === "business_services" || text.includes("startup") || text.includes("бизнес")) {
    tags.add("business_start");
  }

  return Array.from(tags);
}

export function deriveProductIntent(product: ProductItem): string {
  if (product.category === "debit_cards" || product.category === "credit_cards") {
    const tags = deriveRuleTags(product);
    if (tags.includes("travel")) return "travel";
    if (tags.includes("cashback_high")) return "cashback";
    if (tags.includes("low_fee")) return "everyday";
    return "cards";
  }
  if (product.category === "consumer_loans" || product.category === "mortgages") {
    return "borrowing";
  }
  if (product.category === "deposits" || product.category === "investments") {
    return "savings";
  }
  if (product.category === "business_services" || product.category === "document_assistance") {
    return "business";
  }
  return "general";
}

function ruleSummary(product: ProductItem, locale: Locale): string {
  const segments: string[] = [];
  if (product.cashback) {
    segments.push(locale === "ru" ? `кэшбэк ${product.cashback}` : `cashback ${product.cashback}`);
  }
  if (product.annualFee) {
    segments.push(locale === "ru" ? `обслуживание ${product.annualFee}` : `fee ${product.annualFee}`);
  }
  if (product.rate) {
    segments.push(locale === "ru" ? `ставка ${product.rate}` : `rate ${product.rate}`);
  }
  if (product.term) {
    segments.push(locale === "ru" ? `срок ${product.term}` : `term ${product.term}`);
  }
  if (product.minAmount) {
    segments.push(locale === "ru" ? `мин. сумма ${product.minAmount}` : `min amount ${product.minAmount}`);
  }
  if (product.currencyOptions?.length) {
    segments.push(
      locale === "ru"
        ? `валюты ${product.currencyOptions.join("/")}`
        : `currencies ${product.currencyOptions.join("/")}`
    );
  }

  if (locale === "ru") {
    return segments.length > 0
      ? `${product.name}: ${segments.slice(0, 3).join(", ")}. Проверьте полные условия на сайте провайдера.`
      : `${product.name}: базовые параметры доступны в карточке, проверьте полные условия на сайте провайдера.`;
  }

  return segments.length > 0
    ? `${product.name}: ${segments.slice(0, 3).join(", ")}. Verify full terms on provider website.`
    : `${product.name}: core parameters are available on card; verify full terms on provider website.`;
}

async function liveSummary(product: ProductItem, locale: Locale): Promise<{
  summary: string;
  tags: string[];
  model: string;
}> {
  const langInstruction =
    locale === "ru"
      ? "Пиши ответ на русском."
      : `Write response in ${locale}.`;

  const prompt = [
    "You summarize financial products for catalog cards.",
    "Output strict JSON only: {\"summary\":\"...\",\"tags\":[...]}",
    "Rules:",
    "- summary: 1-2 short sentences, neutral, no marketing hype.",
    "- tags: choose from [travel,cashback_high,low_fee,salary_card,premium,quick_approval,low_risk,business_start].",
    "- do not invent facts; only use provided fields.",
    langInstruction,
    "",
    `Product name: ${product.name}`,
    `Category: ${product.category}`,
    `Bank: ${product.bankName}`,
    `Description: ${product.description}`,
    `Cashback: ${product.cashback ?? ""}`,
    `Fee: ${product.annualFee ?? ""}`,
    `Rate: ${product.rate ?? ""}`,
    `Term: ${product.term ?? ""}`,
    `Min amount: ${product.minAmount ?? ""}`,
    `Currencies: ${(product.currencyOptions ?? []).join(", ")}`,
    `Params: ${product.params.map((param) => `${param.label}: ${param.value}`).join("; ")}`
  ].join("\n");

  const result = await requestLiveLlmJson<{ summary?: string; tags?: string[] }>({
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: "You are a strict JSON API. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const summary = (result.parsed.summary ?? "").trim();
  const tags = normalizeTags(result.parsed.tags);
  if (!summary) {
    throw new Error("Product summary is empty");
  }

  return {
    summary,
    tags,
    model: result.model
  };
}

export async function getProductAiSummary(
  product: ProductItem,
  locale: Locale
): Promise<ProductSummaryCacheValue> {
  const key = contentHash(product, locale);
  const cached = CACHE.get(key);
  if (cached) {
    return cached;
  }

  const fallbackValue: ProductSummaryCacheValue = {
    summary: ruleSummary(product, locale),
    tags: deriveRuleTags(product),
    mode: "fallback",
    model: "rule-based",
    generatedAt: new Date().toISOString()
  };

  try {
    const live = await liveSummary(product, locale);
    const value: ProductSummaryCacheValue = {
      summary: live.summary,
      tags: live.tags.length > 0 ? live.tags : deriveRuleTags(product),
      mode: "live",
      model: live.model,
      generatedAt: new Date().toISOString()
    };
    CACHE.set(key, value);
    return value;
  } catch {
    CACHE.set(key, fallbackValue);
    return fallbackValue;
  }
}
