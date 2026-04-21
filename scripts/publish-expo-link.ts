import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  extractExpoLinkFromOutputLine,
  MOBILE_EXPO_LINK_TTL_MS,
  readMobileExpoRefreshState,
  writeMobileExpoLinkFile,
  writeMobileExpoRefreshState
} from "../lib/mobile/expoLink";

const TOTAL_ATTEMPTS = 6;
const TUNNEL_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [2000, 5000, 8000, 12000, 15000];
type PublishTransport = "tunnel" | "lan";
const PUBLISH_STRATEGY = (process.env.EXPO_PUBLISH_STRATEGY ?? "tunnel-first").toLowerCase();

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveLanIp(): string | null {
  const preferred = ["en0", "en1", "wifi0", "eth0", "wlan0"];
  const interfaces = os.networkInterfaces();
  const candidates = preferred
    .flatMap((name) => interfaces[name] ?? [])
    .concat(
      Object.values(interfaces)
        .flatMap((group) => group ?? [])
    );
  for (const item of candidates) {
    if (!item || item.internal || item.family !== "IPv4") continue;
    if (/^(10|192\.168|172\.(1[6-9]|2\d|3[0-1]))\./.test(item.address)) {
      return item.address;
    }
  }
  for (const item of candidates) {
    if (!item || item.internal || item.family !== "IPv4") continue;
    return item.address;
  }
  return null;
}

function deriveLanExpoUrl(line: string, lanIp: string | null): string | null {
  if (!lanIp) return null;
  const match =
    line.match(/waiting on http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i) ??
    line.match(/metro waiting on http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i);
  if (!match) return null;
  return `exp://${lanIp}:${match[1]}`;
}

async function publishCurrentLink(
  expoGoUrl: string,
  qrUrl: string | undefined,
  retryAttempt: number
) {
  const startedAt = nowIso();
  const expiresAt = new Date(Date.now() + MOBILE_EXPO_LINK_TTL_MS).toISOString();
  await writeMobileExpoLinkFile({
    expoGoUrl,
    qrUrl,
    startedAt,
    expiresAt,
    status: "active"
  });
  // eslint-disable-next-line no-console
  console.log(
    `[mobile-link] Published Expo Go link. Expires at ${expiresAt}.`
  );
  await writeMobileExpoRefreshState({
    refreshInProgress: false,
    startedAt,
    lastRefreshError: null,
    lastSuccessfulAt: startedAt,
    retryAttempt: 0,
    retryMax: TOTAL_ATTEMPTS
  });
}

async function setRefreshingState(
  retryAttempt: number,
  errorMessage: string | null,
  pid?: number
) {
  const previous = await readMobileExpoRefreshState();
  await writeMobileExpoRefreshState({
    refreshInProgress: true,
    startedAt: previous?.startedAt ?? nowIso(),
    pid,
    lastRefreshError: errorMessage,
    lastSuccessfulAt: previous?.lastSuccessfulAt ?? null,
    retryAttempt,
    retryMax: TOTAL_ATTEMPTS
  });
}

async function setFailedState(errorMessage: string, retryAttempt: number) {
  const previous = await readMobileExpoRefreshState();
  await writeMobileExpoRefreshState({
    refreshInProgress: false,
    startedAt: previous?.startedAt ?? nowIso(),
    lastRefreshError: errorMessage,
    lastSuccessfulAt: previous?.lastSuccessfulAt ?? null,
    retryAttempt,
    retryMax: TOTAL_ATTEMPTS
  });
}

function transportForAttempt(retryAttempt: number): PublishTransport {
  if (PUBLISH_STRATEGY === "tunnel-first") {
    return retryAttempt <= TUNNEL_ATTEMPTS ? "tunnel" : "lan";
  }
  if (PUBLISH_STRATEGY === "tunnel-only") {
    return "tunnel";
  }
  if (PUBLISH_STRATEGY === "lan-only") {
    return "lan";
  }
  return retryAttempt <= TUNNEL_ATTEMPTS ? "lan" : "tunnel";
}

function retryStateForNextAttempt(currentAttempt: number): string {
  const currentTransport = transportForAttempt(currentAttempt);
  const nextTransport = transportForAttempt(currentAttempt + 1);
  if (currentTransport === "tunnel" && nextTransport === "lan") {
    return "switching_to_lan";
  }
  if (currentTransport === "lan" && nextTransport === "tunnel") {
    return "switching_to_tunnel";
  }
  return nextTransport === "tunnel" ? "retrying_tunnel_start" : "retrying_lan_start";
}

async function runAttempt(
  mobileCwd: string,
  retryAttempt: number
): Promise<number> {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const transport = transportForAttempt(retryAttempt);
  const args = ["expo", "start", "--host", transport, "--non-interactive"];
  const lanIp = transport === "lan" ? resolveLanIp() : null;

  // eslint-disable-next-line no-console
  console.log(
    `[mobile-link] Starting Expo ${transport} in ${mobileCwd} (attempt ${retryAttempt}/${TOTAL_ATTEMPTS})`
  );

  const child = spawn(npxCommand, args, {
    cwd: mobileCwd,
    env: {
      ...process.env,
      CI: process.env.CI ?? "1"
    },
    stdio: ["inherit", "pipe", "pipe"]
  });

  await setRefreshingState(retryAttempt, null, child.pid);

  let lastPublishedUrl = "";
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let hasPublishedLink = false;

  const parseAndPublish = async (line: string) => {
    const parsed = extractExpoLinkFromOutputLine(line);
    const expoGoUrl =
      parsed.expoGoUrl ??
      (transport === "lan" ? deriveLanExpoUrl(line, lanIp) ?? undefined : undefined);
    if (!expoGoUrl) {
      return;
    }
    if (expoGoUrl === lastPublishedUrl) {
      return;
    }
    lastPublishedUrl = expoGoUrl;
    hasPublishedLink = true;
    await publishCurrentLink(expoGoUrl, parsed.qrUrl, retryAttempt);
  };

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    stdoutBuffer += text;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      void parseAndPublish(line);
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    stderrBuffer += text;
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const line of lines) {
      void parseAndPublish(line);
    }
  });

  const shutdown = () => {
    child.kill("SIGINT");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      resolve(code ?? 1);
    });
  });

  if (exitCode === 0) {
    return 0;
  }

  const failCode = hasPublishedLink
    ? `${transport}_closed_after_publish`
    : `${transport}_start_failed`;
  // eslint-disable-next-line no-console
  console.error(`[mobile-link] Expo process exited with code ${exitCode}. reason=${failCode}`);
  await setFailedState(failCode, retryAttempt);
  return exitCode;
}

async function main() {
  const mobileCwd = path.join(process.cwd(), "mobile");

  for (let retryAttempt = 1; retryAttempt <= TOTAL_ATTEMPTS; retryAttempt += 1) {
    const exitCode = await runAttempt(mobileCwd, retryAttempt);
    if (exitCode === 0) {
      process.exit(0);
      return;
    }
    if (retryAttempt < TOTAL_ATTEMPTS) {
      const delay =
        RETRY_BACKOFF_MS[retryAttempt - 1] ??
        RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      await setRefreshingState(
        retryAttempt + 1,
        retryStateForNextAttempt(retryAttempt)
      );
      await sleep(delay);
      continue;
    }
    process.exit(exitCode);
    return;
  }
}

void main();
