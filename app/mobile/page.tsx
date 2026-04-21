"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useLocale } from "@/context/LocaleContext";
import { MobileExpoLinkResponse } from "@/lib/types";

const REFRESH_MS = 30_000;

const COPY = {
  ru: {
    title: "iPhone приложение (Expo Go)",
    subtitle:
      "Откройте ссылку или отсканируйте QR. Ничего в терминал вводить не нужно.",
    openButton: "Открыть в Expo Go",
    status: "Статус",
    active: "активна",
    expired: "истекла",
    unavailable: "недоступна",
    refreshing: "обновляется",
    updated: "Запущено",
    expires: "Истекает",
    refresh: "Обновить",
    refreshNow: "Запустить обновление ссылки",
    loading: "Проверяем ссылку Expo Go...",
    installHint: "Если Expo Go не установлен, установите его из App Store.",
    lastSuccessful: "Последний успешный запуск",
    retryAttempt: "Попытка",
    statusHelp: "Статус ссылки обновляется автоматически каждые 30 секунд."
  },
  en: {
    title: "iPhone App (Expo Go)",
    subtitle:
      "Open the link or scan the QR code. No terminal commands required.",
    openButton: "Open in Expo Go",
    status: "Status",
    active: "active",
    expired: "expired",
    unavailable: "unavailable",
    refreshing: "refreshing",
    updated: "Started",
    expires: "Expires",
    refresh: "Refresh",
    refreshNow: "Refresh link now",
    loading: "Checking Expo Go link...",
    installHint: "If Expo Go is missing, install it from the App Store.",
    lastSuccessful: "Last successful launch",
    retryAttempt: "Attempt",
    statusHelp: "The link status is auto-refreshed every 30 seconds."
  }
} as const;

function mapStatusLabel(
  locale: "ru" | "en",
  status: MobileExpoLinkResponse["status"]
) {
  if (status === "active") return COPY[locale].active;
  if (status === "expired") return COPY[locale].expired;
  if (status === "refreshing") return COPY[locale].refreshing;
  return COPY[locale].unavailable;
}

function formatDate(value: string | undefined, locale: "ru" | "en") {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}

function isOpenableExpoLink(url: string | undefined): string | null {
  if (!url) return null;
  return /^(exp|exps|https?):\/\//i.test(url) ? url : null;
}

function mapRefreshError(code: string | null | undefined, lang: "ru" | "en"): string | null {
  if (!code) return null;
  const normalized = code.trim();
  if (!normalized) return null;
  if (lang === "ru") {
    const ruMap: Record<string, string> = {
      refresh_stale: "Старая сессия обновления зависла и была сброшена.",
      refresh_timeout: "Предыдущая попытка обновления превысила лимит времени.",
      tunnel_start_failed: "Не удалось запустить Expo tunnel. Попробуйте обновить ссылку снова.",
      tunnel_closed_after_publish: "Tunnel закрылся после публикации ссылки. Идёт повторная попытка.",
      retrying_tunnel_start: "Пробуем повторно поднять tunnel...",
      switching_to_lan: "Tunnel нестабилен. Переключаемся на LAN-режим.",
      switching_to_tunnel: "LAN недоступен. Переключаемся на tunnel-режим.",
      retrying_lan_start: "Повторно запускаем LAN-сессию Expo Go.",
      spawn_failed: "Не удалось запустить процесс обновления Expo Go ссылки.",
      lan_start_failed: "Не удалось запустить LAN-сессию Expo Go. Проверьте Wi-Fi и повторите.",
      lan_closed_after_publish: "LAN-сессия была закрыта после публикации ссылки.",
      unexpected_error: "Непредвиденная ошибка при обновлении Expo Go ссылки."
    };
    return ruMap[normalized] ?? `Код ошибки: ${normalized}`;
  }
  const enMap: Record<string, string> = {
    refresh_stale: "A stale refresh session was reset.",
    refresh_timeout: "Previous refresh attempt timed out.",
    tunnel_start_failed: "Could not start Expo tunnel. Please retry.",
    tunnel_closed_after_publish: "Tunnel closed after publish. Retrying now.",
    retrying_tunnel_start: "Retrying tunnel startup...",
    switching_to_lan: "Tunnel is unstable. Switching to LAN mode.",
    switching_to_tunnel: "LAN is unavailable. Switching to tunnel mode.",
    retrying_lan_start: "Retrying Expo LAN session startup.",
    spawn_failed: "Could not start Expo link refresh process.",
    lan_start_failed: "Could not start Expo LAN session. Check Wi-Fi and retry.",
    lan_closed_after_publish: "LAN session closed after publishing the link.",
    unexpected_error: "Unexpected Expo Go refresh error."
  };
  return enMap[normalized] ?? `Error code: ${normalized}`;
}

function mapApiMessage(
  message: string | undefined,
  status: MobileExpoLinkResponse["status"],
  lang: "ru" | "en"
): string | null {
  if (!message) return null;
  if (lang === "en") return message;
  if (status === "active") return "Ссылка активна и готова к открытию в Expo Go.";
  if (status === "refreshing") return "Ссылка обновляется. Это может занять до 60 секунд.";
  if (status === "expired") return "Срок действия ссылки истёк. Запустите обновление.";
  return "Ссылка Expo Go пока недоступна. Нажмите «Запустить обновление ссылки».";
}

export default function MobilePage() {
  const { locale } = useLocale();
  const lang = locale === "ru" ? "ru" : "en";
  const copy = COPY[lang];

  const [data, setData] = useState<MobileExpoLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function triggerRefresh() {
    try {
      setRefreshing(true);
      setRequestError(null);
      const response = await fetch("/api/mobile/expo-link/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error("refresh_failed");
      }
      const payload = (await response.json()) as MobileExpoLinkResponse;
      setData(payload);
      setReloadKey((prev) => prev + 1);
    } catch {
      setRequestError(
        lang === "ru"
          ? "Не удалось запустить обновление Expo Go ссылки."
          : "Failed to start Expo Go link refresh."
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRequestError(null);
        const expoResponse = await fetch("/api/mobile/expo-link", {
          cache: "no-store"
        });
        if (!expoResponse.ok) {
          throw new Error("Failed to load expo link");
        }
        const payload = (await expoResponse.json()) as MobileExpoLinkResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setRequestError(
            lang === "ru"
              ? "Не удалось загрузить ссылку Expo Go."
              : "Failed to load Expo Go link."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [lang, reloadKey]);

  const openLink = useMemo(
    () => isOpenableExpoLink(data?.expoGoUrl),
    [data?.expoGoUrl]
  );
  const status = data?.status ?? "unavailable";
  const statusMessage =
    status === "active" ? null : mapApiMessage(data?.message, status, lang);
  const refreshErrorMessage = mapRefreshError(data?.lastRefreshError, lang);

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid-bg rounded-2xl border border-slate-700 bg-slate-950/95 p-6 text-slate-100 shadow-card"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{copy.title}</h1>
          <p className="mt-2 text-slate-300">{copy.subtitle}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === "active"
                ? "bg-emerald-500/20 text-emerald-300"
                : status === "refreshing"
                  ? "bg-blue-500/20 text-blue-300"
                : status === "expired"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-700/70 text-slate-200"
            }`}
          >
            {copy.status}: {mapStatusLabel(lang, status)}
          </span>
          <button
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {copy.refresh}
          </button>
          <button
            onClick={() => {
              void triggerRefresh();
            }}
            disabled={refreshing}
            className="rounded-lg border border-blue-400/50 bg-blue-500/20 px-3 py-1.5 text-sm text-blue-200 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? `${copy.refreshNow}...` : copy.refreshNow}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{copy.statusHelp}</p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-300">{copy.loading}</p>
        ) : null}
        {requestError ? <div className="mt-4"><ActionErrorBanner message={requestError} /></div> : null}
        {statusMessage ? <div className="mt-4"><ActionErrorBanner message={statusMessage} /></div> : null}
        {status !== "active" && refreshErrorMessage ? (
          <div className="mt-4">
            <ActionErrorBanner
              message={refreshErrorMessage}
            />
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          <div className="space-y-2">
            {openLink ? (
              <a
                href={openLink}
                className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {copy.openButton}
              </a>
            ) : (
              <RetryButton
                label={copy.refresh}
                onClick={() => setReloadKey((prev) => prev + 1)}
                disabled={loading || refreshing}
              />
            )}
            <p className="text-sm text-slate-300">{copy.installHint}</p>
            <p className="text-xs text-slate-400">
              {copy.updated}: {formatDate(data?.startedAt, lang)}
            </p>
            <p className="text-xs text-slate-400">
              {copy.expires}: {formatDate(data?.expiresAt, lang)}
            </p>
            <p className="text-xs text-slate-400">
              {copy.lastSuccessful}: {formatDate(data?.lastSuccessfulAt ?? undefined, lang)}
            </p>
            {status === "refreshing" &&
            typeof data?.retryAttempt === "number" &&
            typeof data?.retryMax === "number" ? (
              <p className="text-xs text-slate-400">
                {copy.retryAttempt}: {data.retryAttempt}/{data.retryMax}
              </p>
            ) : null}
          </div>

          {data?.qrUrl ? (
            <figure className="mt-4 inline-flex w-full max-w-[220px] rounded-xl border border-slate-700 bg-slate-900 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrUrl}
                alt="Expo Go QR"
                className="h-44 w-44 rounded-md bg-transparent object-contain"
              />
            </figure>
          ) : null}
        </div>

      </motion.div>
    </section>
  );
}
