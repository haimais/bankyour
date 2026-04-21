"use client";

import { Bot, RotateCcw, Send, User } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { AcademyChatResponse } from "@/lib/types";

interface LessonChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LessonChatProps {
  lessonSlug: string;
  lessonTitle: string;
}

function quickPrompts(locale: string): string[] {
  if (locale === "ru") {
    return [
      "Объясни тему урока простыми словами",
      "Какие 3 ключевые ошибки совершают новички?",
      "Сделай короткий чек-лист по теме"
    ];
  }
  return [
    "Explain this lesson in simple words",
    "What are 3 common beginner mistakes?",
    "Give me a short checklist for this topic"
  ];
}

export function LessonChat({ lessonSlug, lessonTitle }: LessonChatProps) {
  const { country } = useCountry();
  const { locale } = useLocale();

  const [messages, setMessages] = useState<LessonChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "fallback">("fallback");

  const prompts = useMemo(() => quickPrompts(locale), [locale]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/academy/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lessonSlug,
          country,
          locale,
          message: trimmed,
          history: nextMessages.slice(-8)
        })
      });
      if (!response.ok) {
        throw new Error("chat_failed");
      }
      const payload = (await response.json()) as AcademyChatResponse;
      setMessages((prev) => [...prev, { role: "assistant", content: payload.reply }]);
      setMode(payload.metadata.mode);
    } catch {
      setRequestError(
        locale === "ru"
          ? "Не удалось получить ответ ассистента."
          : "Could not get assistant reply."
      );
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {locale === "ru" ? "AI-чат по уроку" : "AI Lesson Chat"}
          </h2>
          <p className="text-sm text-slate-600">{lessonTitle}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            mode === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {mode === "live"
            ? locale === "ru"
              ? "Live"
              : "Live"
            : locale === "ru"
              ? "Fallback"
              : "Fallback"}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              void sendMessage(prompt);
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          >
            {prompt}
          </button>
        ))}
      </div>

      {requestError ? (
        <div className="mb-3">
          <ActionErrorBanner message={requestError} />
        </div>
      ) : null}

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            {locale === "ru"
              ? "Задайте вопрос по этому уроку: формулы, риски, практический кейс."
              : "Ask a question about this lesson: formulas, risks, practical case."}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto max-w-[88%] bg-blue-600 text-white"
                  : "max-w-[92%] bg-white text-slate-700"
              }`}
            >
              <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
                {message.role === "user" ? <User size={12} /> : <Bot size={12} />}
                {message.role === "user"
                  ? locale === "ru"
                    ? "Вы"
                    : "You"
                  : locale === "ru"
                    ? "Ассистент"
                    : "Assistant"}
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
        {sending ? (
          <p className="text-xs text-slate-500">
            {locale === "ru" ? "Ассистент печатает..." : "Assistant is typing..."}
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={locale === "ru" ? "Ваш вопрос по уроку..." : "Your lesson question..."}
          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex h-10 items-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          <Send size={14} />
          {locale === "ru" ? "Отправить" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setRequestError(null);
          }}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={14} />
          {locale === "ru" ? "Очистить" : "Clear"}
        </button>
      </form>
    </section>
  );
}
