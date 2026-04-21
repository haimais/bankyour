import fs from "node:fs/promises";
import path from "node:path";
import { MobileExpoLinkResponse } from "@/lib/types";

export type MobileExpoLinkStatus = "active" | "expired" | "unavailable" | "refreshing";

export interface MobileExpoLinkFilePayload {
  expoGoUrl: string;
  qrUrl?: string;
  startedAt: string;
  expiresAt: string;
  status?: MobileExpoLinkStatus;
}

export interface MobileExpoRefreshState {
  refreshInProgress: boolean;
  startedAt?: string;
  pid?: number;
  lastRefreshError?: string | null;
  lastSuccessfulAt?: string | null;
  retryAttempt?: number;
  retryMax?: number;
}

export const MOBILE_EXPO_LINK_TTL_MS = 8 * 60 * 60 * 1000;
const REFRESH_STALE_MS = 45 * 60 * 1000;
const REFRESH_LINK_MISSING_GRACE_MS = 2 * 60 * 1000;
export const MOBILE_EXPO_REFRESH_STALE_MS = REFRESH_STALE_MS;

export function getMobileExpoLinkFilePath(cwd = process.cwd()) {
  return path.join(cwd, ".tmp", "mobile-link.json");
}

export function getMobileExpoRefreshStateFilePath(cwd = process.cwd()) {
  return path.join(cwd, ".tmp", "mobile-link-refresh.json");
}

export function isValidExpoDeepLink(value: string): boolean {
  return /^(exp|exps):\/\/.+/i.test(value);
}

export function buildExpoQrUrl(expoGoUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    expoGoUrl
  )}`;
}

export function normalizeExpoGoUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (isValidExpoDeepLink(trimmed)) {
    return trimmed;
  }
  if (/^[a-z0-9.-]+:\d+$/i.test(trimmed)) {
    return `exp://${trimmed}`;
  }
  if (/^https?:\/\/.+/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function parseDateMs(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function isProcessAlive(pid: number | undefined): boolean {
  if (!pid || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function resolveRefreshInProgress(
  refreshState: MobileExpoRefreshState | null,
  nowMs: number
): boolean {
  if (!refreshState?.refreshInProgress) {
    return false;
  }
  const startedAtMs = parseDateMs(refreshState.startedAt);
  if (startedAtMs == null) {
    return refreshState.pid ? isProcessAlive(refreshState.pid) : false;
  }
  if (nowMs - startedAtMs > REFRESH_STALE_MS) {
    return false;
  }
  if (refreshState.pid != null) {
    return isProcessAlive(refreshState.pid);
  }
  return true;
}

export function isMobileExpoRefreshStateStale(
  refreshState: MobileExpoRefreshState | null,
  nowMs = Date.now(),
  payload: MobileExpoLinkFilePayload | null = null
): boolean {
  if (!refreshState?.refreshInProgress) {
    return false;
  }
  const startedAtMs = parseDateMs(refreshState.startedAt);
  if (startedAtMs == null) {
    return refreshState.pid ? !isProcessAlive(refreshState.pid) : true;
  }
  const ageMs = nowMs - startedAtMs;
  if (ageMs > REFRESH_STALE_MS) {
    return true;
  }
  if (refreshState.pid != null && !isProcessAlive(refreshState.pid)) {
    return true;
  }
  // If refresh was started but link file still missing for too long, consider it stale.
  if (!payload && ageMs > REFRESH_LINK_MISSING_GRACE_MS && !refreshState.pid) {
    return true;
  }
  return false;
}

export function toMobileExpoLinkResponse(
  payload: MobileExpoLinkFilePayload | null,
  nowMs = Date.now(),
  refreshState: MobileExpoRefreshState | null = null
): MobileExpoLinkResponse {
  const refreshInProgress = resolveRefreshInProgress(refreshState, nowMs);
  const lastRefreshError =
    refreshState?.lastRefreshError === "refresh_stale"
      ? "refresh_timeout"
      : refreshState?.lastRefreshError ?? null;
  const lastSuccessfulAt = refreshState?.lastSuccessfulAt ?? payload?.startedAt ?? null;
  const retryAttempt =
    refreshInProgress || Boolean(lastRefreshError)
      ? refreshState?.retryAttempt
      : undefined;
  const retryMax =
    refreshInProgress || Boolean(lastRefreshError)
      ? refreshState?.retryMax
      : undefined;

  if (!payload) {
    if (refreshInProgress) {
      return {
        status: "refreshing",
        refreshInProgress,
        lastRefreshError,
        lastSuccessfulAt,
        retryAttempt,
        retryMax,
        startedAt: refreshState?.startedAt,
        message: "Expo tunnel refresh is in progress. Please wait..."
      };
    }
    return {
      status: "unavailable",
      refreshInProgress,
      lastRefreshError,
      lastSuccessfulAt,
      retryAttempt,
      retryMax,
      message:
        "Expo Go link is unavailable. Tap refresh to generate a new share link."
    };
  }

  const expoGoUrl = normalizeExpoGoUrl(payload.expoGoUrl);
  if (!expoGoUrl) {
    if (refreshInProgress) {
      return {
        status: "refreshing",
        refreshInProgress,
        lastRefreshError,
        lastSuccessfulAt,
        retryAttempt,
        retryMax,
        startedAt: refreshState?.startedAt,
        message: "Refreshing Expo tunnel session. A new link will appear shortly."
      };
    }
    return {
      status: "unavailable",
      refreshInProgress,
      lastRefreshError,
      lastSuccessfulAt,
      retryAttempt,
      retryMax,
      message:
        "Stored Expo Go link is invalid. Tap refresh to create a valid link."
    };
  }

  const expiresAtMs = parseDateMs(payload.expiresAt);
  const startedAtMs = parseDateMs(payload.startedAt);
  const qrUrl = payload.qrUrl?.trim() || buildExpoQrUrl(expoGoUrl);

  if (expiresAtMs != null && nowMs > expiresAtMs) {
    if (refreshInProgress) {
      return {
        status: "refreshing",
        expoGoUrl,
        qrUrl,
        startedAt: startedAtMs == null ? undefined : new Date(startedAtMs).toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
        refreshInProgress,
        lastRefreshError,
        lastSuccessfulAt,
        retryAttempt,
        retryMax,
        message: "Refreshing expired Expo Go link..."
      };
    }
    return {
      status: "expired",
      expoGoUrl,
      qrUrl,
      startedAt: startedAtMs == null ? undefined : new Date(startedAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      refreshInProgress,
      lastRefreshError,
      lastSuccessfulAt,
      retryAttempt,
      retryMax,
      message: "Expo Go link expired. Tap refresh to start a new tunnel session."
    };
  }

  return {
    status: refreshInProgress ? "refreshing" : "active",
    expoGoUrl,
    qrUrl,
    startedAt: startedAtMs == null ? undefined : new Date(startedAtMs).toISOString(),
    expiresAt: expiresAtMs == null ? undefined : new Date(expiresAtMs).toISOString(),
    refreshInProgress,
    lastRefreshError,
    lastSuccessfulAt,
    retryAttempt,
    retryMax
  };
}

export async function readMobileExpoLinkFile(
  cwd = process.cwd()
): Promise<MobileExpoLinkFilePayload | null> {
  try {
    const filePath = getMobileExpoLinkFilePath(cwd);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<MobileExpoLinkFilePayload>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.expoGoUrl !== "string" || typeof parsed.startedAt !== "string") {
      return null;
    }
    return {
      expoGoUrl: parsed.expoGoUrl,
      qrUrl: parsed.qrUrl,
      startedAt: parsed.startedAt,
      expiresAt:
        typeof parsed.expiresAt === "string"
          ? parsed.expiresAt
          : new Date(
              new Date(parsed.startedAt).getTime() + MOBILE_EXPO_LINK_TTL_MS
            ).toISOString(),
      status: parsed.status
    };
  } catch {
    return null;
  }
}

export async function writeMobileExpoLinkFile(
  payload: MobileExpoLinkFilePayload,
  cwd = process.cwd()
) {
  const filePath = getMobileExpoLinkFilePath(cwd);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function removeMobileExpoLinkFile(cwd = process.cwd()) {
  const filePath = getMobileExpoLinkFilePath(cwd);
  await fs.rm(filePath, { force: true });
}

export async function readMobileExpoRefreshState(
  cwd = process.cwd()
): Promise<MobileExpoRefreshState | null> {
  try {
    const filePath = getMobileExpoRefreshStateFilePath(cwd);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<MobileExpoRefreshState>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      refreshInProgress: Boolean(parsed.refreshInProgress),
      startedAt:
        typeof parsed.startedAt === "string" && parsed.startedAt.trim()
          ? parsed.startedAt
          : undefined,
      pid: typeof parsed.pid === "number" ? parsed.pid : undefined,
      lastRefreshError:
        typeof parsed.lastRefreshError === "string" || parsed.lastRefreshError === null
          ? parsed.lastRefreshError
          : null,
      lastSuccessfulAt:
        typeof parsed.lastSuccessfulAt === "string" && parsed.lastSuccessfulAt.trim()
          ? parsed.lastSuccessfulAt
          : null,
      retryAttempt: typeof parsed.retryAttempt === "number" ? parsed.retryAttempt : undefined,
      retryMax: typeof parsed.retryMax === "number" ? parsed.retryMax : undefined
    };
  } catch {
    return null;
  }
}

export async function writeMobileExpoRefreshState(
  payload: MobileExpoRefreshState,
  cwd = process.cwd()
) {
  const filePath = getMobileExpoRefreshStateFilePath(cwd);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    const normalized = normalizeExpoGoUrl(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function getRawStringValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractExpoLinkFromOutputLine(input: string): {
  expoGoUrl?: string;
  qrUrl?: string;
} {
  const line = input.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "").trim();
  if (!line) {
    return {};
  }

  const fromText = line.match(/(exp(?:s)?:\/\/[^\s"'`]+)/i)?.[1];
  const fromTextQr = line.match(/(https?:\/\/[^\s"'`]*qr[^\s"'`]*)/i)?.[1];
  if (fromText) {
    return {
      expoGoUrl: fromText,
      qrUrl: fromTextQr ?? buildExpoQrUrl(fromText)
    };
  }

  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const expoGoUrl =
      getStringValue(parsed, [
        "expoGoUrl",
        "expUrl",
        "url",
        "deepLink",
        "devClientUrl",
        "manifestUrl"
      ]) ??
      (() => {
        const hostUri = getRawStringValue(parsed, ["hostUri"]);
        if (!hostUri) return null;
        return normalizeExpoGoUrl(hostUri) ?? normalizeExpoGoUrl(`exp://${hostUri}`);
      })();

    if (!expoGoUrl) {
      return {};
    }

    const qrUrl =
      getRawStringValue(parsed, ["qrUrl", "qrCodeUrl"]) ?? buildExpoQrUrl(expoGoUrl);

    return {
      expoGoUrl,
      qrUrl
    };
  } catch {
    return {};
  }
}
