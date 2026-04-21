import { NextRequest, NextResponse } from "next/server";
import { getAcademyLessonBySlug } from "@/data/academy";
import { getLlmConfig } from "@/lib/ai/llmConfig";
import { requestLiveLlm } from "@/lib/ai/liveClient";
import { translateText } from "@/lib/news/articleTools";
import { AcademyChatResponse, Country, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

interface AcademyChatBody {
  lessonSlug?: string;
  country?: Country;
  locale?: Locale;
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

function asCountry(value: unknown): Country {
  if (typeof value !== "string") return "russia";
  return COUNTRIES.includes(value as Country) ? (value as Country) : "russia";
}

function asLocale(value: unknown): Locale {
  if (typeof value !== "string") return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(value)) {
    return value as Locale;
  }
  return "ru";
}

function buildFallbackReply(
  locale: Locale,
  lessonTitle: string,
  message: string
): string {
  if (locale === "ru") {
    return [
      `По теме урока «${lessonTitle}»:`,
      "1. Сначала определите цель расчета и входные параметры.",
      "2. Проверьте формулы и ограничения перед выводом.",
      "3. Зафиксируйте риски и сделайте короткий чек-лист действий.",
      "",
      `Ваш вопрос: ${message}`,
      "Если хотите, разберу этот вопрос пошагово на конкретном примере."
    ].join("\n");
  }

  return [
    `For lesson "${lessonTitle}":`,
    "1. Define your objective and input parameters first.",
    "2. Validate formulas and constraints before conclusions.",
    "3. Capture risks and prepare a short action checklist.",
    "",
    `Your question: ${message}`,
    "I can break it down step-by-step with a practical example."
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AcademyChatBody;
    const lessonSlug = typeof body.lessonSlug === "string" ? body.lessonSlug.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const locale = asLocale(body.locale);
    const country = asCountry(body.country);

    if (!lessonSlug || !message) {
      return NextResponse.json({ error: "lessonSlug and message are required" }, { status: 400 });
    }

    const lesson = getAcademyLessonBySlug(lessonSlug);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const llm = getLlmConfig();
    let reply = "";
    let mode: "live" | "fallback" = "fallback";
    let reason: string | null = null;

    if (llm.apiKey) {
      try {
        const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
        const historyBlock = history
          .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
          .join("\n");

        const result = await requestLiveLlm({
          temperature: 0.2,
          model: llm.model,
          messages: [
            {
              role: "system",
              content:
                "You are an educational finance assistant. Explain clearly, do not ask for personal sensitive data, and keep advice informational."
            },
            {
              role: "user",
              content: [
                `Context: lesson=${lesson.title}; country=${country}; locale=${locale}`,
                `Lesson summary: ${lesson.summary}`,
                historyBlock ? `Conversation history:\n${historyBlock}` : "",
                `User question: ${message}`,
                "Return a concise answer with: explanation, practical steps, and one short risk note."
              ]
                .filter(Boolean)
                .join("\n\n")
            }
          ]
        });
        reply = result.content;
        mode = "live";
      } catch (error) {
        reason = error instanceof Error ? error.message : "Live request failed";
      }
    } else {
      reason = "LLM_API_KEY is not configured";
    }

    if (!reply) {
      reply = buildFallbackReply(locale, lesson.title, message);
      if (locale !== "ru" && locale !== "en") {
        reply = await translateText(reply, locale);
      }
      mode = "fallback";
    }

    const payload: AcademyChatResponse = {
      reply,
      metadata: {
        mode,
        reason,
        provider: llm.provider,
        model: llm.model,
        lessonSlug,
        country,
        locale
      }
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Academy chat API error", error);
    return NextResponse.json({ error: "Failed to process academy chat request" }, { status: 500 });
  }
}
