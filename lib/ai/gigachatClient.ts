import { randomUUID } from "crypto";
import { LlmConfig } from "@/lib/ai/llmConfig";

interface GigaChatTokenResponse {
  access_token?: string;
  expires_at?: number | string;
  expires_in?: number | string;
}

interface CachedTokenState {
  token: string;
  expiresAtMs: number;
}

let cachedToken: CachedTokenState | null = null;
function applyInsecureTlsIfNeeded() {
  const insecureTls = process.env.GIGACHAT_INSECURE_TLS?.trim().toLowerCase();
  const shouldDisableTlsCheck = insecureTls === "1" || insecureTls === "true" || insecureTls === "yes";
  if (!shouldDisableTlsCheck) {
    return;
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function parseExpiryMs(payload: GigaChatTokenResponse): number {
  const now = Date.now();

  const expiresAtRaw = Number(payload.expires_at);
  if (Number.isFinite(expiresAtRaw) && expiresAtRaw > 0) {
    return expiresAtRaw > 1_000_000_000_000 ? expiresAtRaw : expiresAtRaw * 1000;
  }

  const expiresInRaw = Number(payload.expires_in);
  if (Number.isFinite(expiresInRaw) && expiresInRaw > 0) {
    return now + expiresInRaw * 1000;
  }

  return now + 25 * 60 * 1000;
}

function normalizeAuthorizationKey(raw: string): string {
  const value = raw.trim();
  if (value.toLowerCase().startsWith("basic ")) {
    return value.slice(6).trim();
  }
  if (value.includes(":")) {
    return Buffer.from(value, "utf-8").toString("base64");
  }
  return value;
}

export async function getGigaChatAccessToken(
  config: LlmConfig,
  forceRefresh = false
): Promise<string> {
  if (!config.apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAtMs - now > 60_000) {
    return cachedToken.token;
  }

  applyInsecureTlsIfNeeded();
  const response = await fetch(config.gigaChatAuthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${normalizeAuthorizationKey(config.apiKey)}`,
      RqUID: randomUUID()
    },
    body: new URLSearchParams({
      scope: config.gigaChatScope
    }).toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GigaChat OAuth failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as GigaChatTokenResponse;
  const accessToken = payload.access_token?.trim();
  if (!accessToken) {
    throw new Error("GigaChat OAuth response does not contain access_token");
  }

  cachedToken = {
    token: accessToken,
    expiresAtMs: parseExpiryMs(payload)
  };

  return accessToken;
}

export function getGigaChatFetchOptions() {
  applyInsecureTlsIfNeeded();
  return {};
}
