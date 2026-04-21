export interface LlmConfig {
  provider: string;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  gigaChatAuthUrl: string;
  gigaChatScope: string;
}

function normalizeBaseUrl(input: string | undefined, provider: string): string {
  const value = (input ?? "").trim();
  if (!value) {
    if (provider === "gigachat") {
      return "https://gigachat.devices.sberbank.ru/api/v1";
    }
    return "https://api.aimlapi.com/v1";
  }
  return value.replace(/\/+$/, "");
}

function normalizeProvider(input: string | undefined): string {
  const value = (input ?? "").trim();
  if (!value) {
    return "aimlapi";
  }
  return value;
}

function normalizeModelByProvider(input: string | undefined, provider: string): string {
  const value = (input ?? "").trim();
  if (value) {
    return value;
  }
  if (provider === "gigachat") {
    return "GigaChat";
  }
  return "gpt-4o-mini";
}

export function getLlmConfig(): LlmConfig {
  const provider = normalizeProvider(process.env.LLM_PROVIDER);
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? null;
  const baseUrl = normalizeBaseUrl(process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL, provider);
  const model = normalizeModelByProvider(process.env.LLM_MODEL ?? process.env.OPENAI_MODEL, provider);
  const gigaChatAuthUrl = normalizeBaseUrl(
    process.env.GIGACHAT_AUTH_URL ?? "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    provider
  );
  const gigaChatScope = (process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS").trim() || "GIGACHAT_API_PERS";

  return {
    provider,
    apiKey: apiKey?.trim() ? apiKey.trim() : null,
    baseUrl,
    model,
    gigaChatAuthUrl,
    gigaChatScope
  };
}

export function maskBaseUrl(baseUrl: string): string {
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return baseUrl;
  }
}
