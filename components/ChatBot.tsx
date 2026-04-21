"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, SendHorizontal, X } from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { getCountryLabel, UI_TEXT } from "@/data/i18n";
import { ServiceType } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface OpenChatEventDetail {
  serviceType?: ServiceType;
}

interface AssistantHealthPayload {
  provider?: string;
  model?: string;
  base_url_masked?: string;
  live_available?: boolean;
  fallback_active?: boolean;
  last_error?: string | null;
}

interface AssistantReplyPayload {
  reply?: string;
  metadata?: {
    mode?: "live" | "fallback";
    reason?: string | null;
    provider?: string;
    model?: string;
    live_available?: boolean;
    fallback_active?: boolean;
  };
}

function scrollToBottom(ref: MutableRefObject<HTMLDivElement | null>) {
  if (ref.current) {
    ref.current.scrollTop = ref.current.scrollHeight;
  }
}

export function ChatBot() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType | undefined>("cards");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantMode, setAssistantMode] = useState<"live" | "fallback">("fallback");
  const [modeReason, setModeReason] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [liveProvider, setLiveProvider] = useState<string>("aimlapi");
  const [liveModel, setLiveModel] = useState<string>("gpt-4o-mini");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const countryLabel = getCountryLabel(country, locale);

  const greeting =
    locale === "ru"
      ? "Здравствуйте! Я AI-ассистент Bank-your. Помогу сравнить карты, кредиты, вклады и бизнес-сервисы."
      : "Hello! I am the Bank-your AI assistant. I can help compare cards, loans, deposits, and business services.";

  const quickSuggestions = useMemo(() => {
    return [copy.quickCard, `${copy.quickInvest} ${countryLabel}`, copy.quickMortgage];
  }, [copy, countryLabel]);

  useEffect(() => {
    setMessages([
      {
        id: "assistant-welcome",
        role: "assistant",
        content: greeting
      }
    ]);
  }, [greeting]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<OpenChatEventDetail>;
      setIsOpen(true);
      if (customEvent.detail?.serviceType) {
        setServiceType(customEvent.detail.serviceType);
      }
    };

    window.addEventListener("bankyour:open-chat", handler);
    return () => {
      window.removeEventListener("bankyour:open-chat", handler);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(messagesContainerRef);
    }
  }, [isOpen, messages, typing]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch("/api/assistant/health", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Assistant health request failed");
        }
        const payload = (await response.json()) as AssistantHealthPayload;
        if (cancelled) {
          return;
        }
        setAssistantMode(payload.live_available ? "live" : "fallback");
        setModeReason(payload.last_error ?? null);
        if (payload.provider) {
          setLiveProvider(payload.provider);
        }
        if (payload.model) {
          setLiveModel(payload.model);
        }
      } catch {
        if (!cancelled) {
          setAssistantMode("fallback");
          setModeReason(
            locale === "ru"
              ? "Статус live-режима временно недоступен."
              : "Live mode status is temporarily unavailable."
          );
        }
      }
    }

    void loadHealth();
    const timer = window.setInterval(() => {
      void loadHealth();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, locale]);

  async function sendMessage(customMessage?: string) {
    const message = (customMessage ?? input).trim();
    if (!message || typing) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        role: "user",
        content: message
      }
    ]);
    setInput("");
    setTyping(true);
    setLastFailedMessage(null);

    try {
      const [response] = await Promise.all([
        fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message,
            country,
            serviceType,
            locale
          })
        }),
        new Promise((resolve) => setTimeout(resolve, 650))
      ]);

      if (!response.ok) {
        throw new Error("Assistant API request failed");
      }

      const data = (await response.json()) as AssistantReplyPayload;
      if (data.metadata?.mode) {
        setAssistantMode(data.metadata.mode);
      }
      if (typeof data.metadata?.reason === "string" || data.metadata?.reason === null) {
        setModeReason(data.metadata.reason ?? null);
      }
      if (data.metadata?.provider) {
        setLiveProvider(data.metadata.provider);
      }
      if (data.metadata?.model) {
        setLiveModel(data.metadata.model);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content:
            data.reply ??
            (locale === "ru"
              ? "Не удалось получить ответ. Попробуйте еще раз через несколько секунд."
              : "Could not get a response. Please try again in a few seconds.")
        }
      ]);
    } catch {
      setLastFailedMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content:
            locale === "ru"
              ? "Ошибка соединения. Проверьте сеть и повторите отправку."
              : "Connection error. Please check your network and retry."
        }
      ]);
    } finally {
      setTyping(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 right-4 z-50 flex h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Bot size={17} />
                <div>
                  <p className="text-sm font-semibold">{copy.chatTitle}</p>
                  <p className="text-xs text-blue-100">
                    {countryLabel} • {assistantMode === "live" ? "Live" : "Fallback"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setMessages([
                      {
                        id: "assistant-welcome-reset",
                        role: "assistant",
                        content: greeting
                      }
                    ])
                  }
                  className="rounded-md bg-white/20 px-2 py-1 text-xs transition hover:bg-white/30"
                >
                  {locale === "ru" ? "Очистить" : "Clear"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1.5 transition hover:bg-blue-500"
                  aria-label={copy.closeAssistant}
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="border-b border-slate-100 p-3">
              {assistantMode === "fallback" ? (
                <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  {locale === "ru" ? "Режим: Fallback." : "Mode: Fallback."}{" "}
                  {modeReason
                    ? modeReason
                    : locale === "ru"
                      ? "Live-ответы временно недоступны."
                      : "Live responses are temporarily unavailable."}
                </p>
              ) : (
                <p className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  {locale === "ru"
                    ? `Режим: Live (${liveProvider}, ${liveModel}).`
                    : `Mode: Live (${liveProvider}, ${liveModel}).`}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:border-blue-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {lastFailedMessage ? (
                <button
                  onClick={() => void sendMessage(lastFailedMessage)}
                  className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                >
                  {locale === "ru" ? "Повторить последний запрос" : "Retry last request"}
                </button>
              ) : null}
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3"
            >
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                        isUser
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      {copy.typing}
                      <span className="inline-flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={`typing-dot-${dot}`}
                            className="h-1.5 w-1.5 rounded-full bg-slate-400"
                            animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.9,
                              delay: dot * 0.12
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={copy.chatPlaceholder}
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  aria-label={copy.sendMessage}
                >
                  <SendHorizontal size={17} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-soft transition hover:bg-blue-700"
        aria-label={copy.openAssistant}
      >
        <MessageCircle size={22} />
      </button>
    </>
  );
}
