import { spawn } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import {
  isMobileExpoRefreshStateStale,
  MOBILE_EXPO_REFRESH_STALE_MS,
  MOBILE_EXPO_LINK_TTL_MS,
  readMobileExpoLinkFile,
  readMobileExpoRefreshState,
  toMobileExpoLinkResponse,
  writeMobileExpoRefreshState
} from "@/lib/mobile/expoLink";

export const dynamic = "force-dynamic";

const REFRESH_COOLDOWN_MS = 15_000;
const RETRY_MAX = 6;

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

function isRefreshActive(
  state: Awaited<ReturnType<typeof readMobileExpoRefreshState>>,
  nowMs: number
) {
  if (!state?.refreshInProgress) {
    return false;
  }
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : NaN;
  const ageMs = Number.isFinite(startedAtMs) ? nowMs - startedAtMs : Number.POSITIVE_INFINITY;
  if (ageMs > MOBILE_EXPO_REFRESH_STALE_MS) {
    return false;
  }
  if (state.pid != null) {
    return isProcessAlive(state.pid);
  }
  return true;
}

function isLocalHost(host: string | null): boolean {
  if (!host) {
    return false;
  }
  const normalized = host.toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("[::1]")
  );
}

function isAuthorized(request: NextRequest): boolean {
  const guardToken = process.env.MOBILE_REFRESH_TOKEN?.trim();
  const requestToken = request.headers.get("x-mobile-refresh-token")?.trim();
  if (guardToken) {
    return Boolean(requestToken) && guardToken === requestToken;
  }
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return isLocalHost(request.headers.get("host"));
}

function startExpoRefreshProcess() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "mobile:expo-go:publish"], {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  return child.pid;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Expo link refresh is not authorized for this environment."
      },
      { status: 401 }
    );
  }

  const nowMs = Date.now();
  const [payload, initialRefreshState] = await Promise.all([
    readMobileExpoLinkFile(),
    readMobileExpoRefreshState()
  ]);
  let refreshState = initialRefreshState;

  if (isMobileExpoRefreshStateStale(refreshState, nowMs, payload)) {
    refreshState = {
      refreshInProgress: false,
      startedAt: refreshState?.startedAt,
      pid: refreshState?.pid,
      lastRefreshError: refreshState?.lastRefreshError ?? "refresh_stale",
      lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
      retryAttempt: refreshState?.retryAttempt,
      retryMax: refreshState?.retryMax
    };
    await writeMobileExpoRefreshState(refreshState);
  }

  if (!refreshState?.refreshInProgress && isProcessAlive(refreshState?.pid)) {
    return NextResponse.json(
      {
        ...toMobileExpoLinkResponse(payload, nowMs, refreshState),
        message: "Expo tunnel session is already running."
      },
      { status: 200 }
    );
  }

  if (isRefreshActive(refreshState, nowMs)) {
    return NextResponse.json(
      toMobileExpoLinkResponse(payload, nowMs, refreshState),
      { status: 202 }
    );
  }

  const startedAt = new Date(nowMs).toISOString();
  const previousStartedAtMs = refreshState?.startedAt
    ? new Date(refreshState.startedAt).getTime()
    : NaN;
  const cooldownActive =
    Number.isFinite(previousStartedAtMs) &&
    nowMs - previousStartedAtMs >= 0 &&
    nowMs - previousStartedAtMs < REFRESH_COOLDOWN_MS;

  if (cooldownActive) {
    const response = toMobileExpoLinkResponse(payload, nowMs, {
      refreshInProgress: true,
      startedAt: refreshState?.startedAt,
      pid: refreshState?.pid,
      lastRefreshError: null,
      lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
      retryAttempt: refreshState?.retryAttempt,
      retryMax: refreshState?.retryMax ?? RETRY_MAX
    });
    return NextResponse.json(response, { status: 202 });
  }

  try {
    const pid = startExpoRefreshProcess();
    await writeMobileExpoRefreshState({
      refreshInProgress: true,
      startedAt,
      pid: typeof pid === "number" ? pid : undefined,
      lastRefreshError: null,
      lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
      retryAttempt: 0,
      retryMax: RETRY_MAX
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "spawn_failed";
    await writeMobileExpoRefreshState({
      refreshInProgress: false,
      startedAt,
      lastRefreshError: errorMessage,
      lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
      retryAttempt: 0,
      retryMax: RETRY_MAX
    });
    return NextResponse.json(
      {
        status: "unavailable",
        refreshInProgress: false,
        lastRefreshError: errorMessage,
        lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
        message: "Could not start Expo tunnel refresh."
      },
      { status: 200 }
    );
  }

  const provisionalExpiry = new Date(nowMs + MOBILE_EXPO_LINK_TTL_MS).toISOString();
  const response = toMobileExpoLinkResponse(payload, nowMs, {
    refreshInProgress: true,
    startedAt,
    lastRefreshError: null,
    lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
    retryAttempt: 0,
    retryMax: RETRY_MAX
  });

  return NextResponse.json(
    {
      ...response,
      status: response.status === "active" ? "active" : "refreshing",
      refreshInProgress: true,
      startedAt,
      // During refresh, we always expose provisional expiry instead of stale legacy date.
      expiresAt: response.status === "active" ? response.expiresAt ?? provisionalExpiry : provisionalExpiry,
      message:
        response.status === "active"
          ? response.message ??
            "Expo refresh started in background. Current link remains active until replaced."
          : "Expo refresh started in background. Check this page in ~20-60 seconds."
    },
    { status: 202 }
  );
}
