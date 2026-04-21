import { NextRequest, NextResponse } from "next/server";
import { getBusinessArticleBySlug } from "@/data/businessArticles";
import { getLlmConfig } from "@/lib/ai/llmConfig";
import { requestLiveLlm } from "@/lib/ai/liveClient";
import { markAssistantLiveError, markAssistantLiveSuccess } from "@/lib/ai/assistantHealth";
import { BusinessChatResponse, Country, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

interface BusinessChatRequest {
  message?: string;
  articleSlug?: string;
  country?: Country;
  locale?: Locale;
  serviceContext?: string;
}

function asCountry(input: Country | undefined): Country {
  if (!input) return "russia";
  return COUNTRIES.includes(input) ? input : "russia";
}

function asLocale(input: Locale | undefined): Locale {
  if (!input) return "ru";
  return ["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)
    ? input
    : "ru";
}

function fallbackBusinessReply(input: {
  country: Country;
  articleTitle?: string;
  message: string;
  locale: Locale;
}): string {
  const baseRu = [
    `Контекст: ${input.articleTitle ?? "бизнес-раздел Bank-your"} (${input.country}).`,
    "Рекомендую проверить три блока:",
    "1) Стоимость услуги (тариф + скрытые комиссии).",
    "2) Операционные риски (SLA, лимиты, валютный контроль, штрафы).",
    "3) Юридические условия (договор, ковенанты, досрочные изменения).",
    "Если хотите, я могу разобрать ваш сценарий по шагам: цель, оборот, срок, риски, и предложить чек-лист сравнения банков.",
    "Важно: это общий информационный ответ, не индивидуальная консультация."
  ];

  if (input.locale === "ru") {
    return baseRu.join("\n");
  }

  return [
    `Context: ${input.articleTitle ?? "Bank-your business section"} (${input.country}).`,
    "Compare total cost, operational risk (SLA/limits), and legal terms before selecting a provider.",
    "I can break this down into a step-by-step checklist for your specific scenario.",
    "Important: this is general information, not individual financial advice."
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BusinessChatRequest;
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const country = asCountry(body.country);
    const locale = asLocale(body.locale);
    const article = body.articleSlug ? getBusinessArticleBySlug(body.articleSlug) : null;
    const llm = getLlmConfig();

    let mode: "live" | "fallback" = "fallback";
    let reason: string | null = null;
    let reply: string | null = null;

    if (llm.apiKey) {
      try {
        const articleContext = article
          ? [
              `Article: ${article.title}`,
              `Summary: ${article.summary}`,
              `Key sections: ${article.sections.map((section) => section.title).join(", ")}`
            ].join("\n")
          : "No specific article selected.";

        const result = await requestLiveLlm({
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are a business navigation assistant inside Bank-your. Give practical, non-promotional, concise guidance with risk-aware checklists. Do not request sensitive data."
            },
            {
              role: "user",
              content: [
                `Country: ${country}`,
                `Language: ${locale}`,
                `Service context: ${body.serviceContext ?? "general business"}`,
                articleContext,
                "",
                `User question: ${message}`,
                "",
                locale === "ru"
                  ? "Ответь на русском языке, структурно и по делу."
                  : "Answer in the user language, concise and structured."
              ].join("\n")
            }
          ]
        });
        reply = result.content;
        mode = "live";
        markAssistantLiveSuccess();
      } catch (error) {
        markAssistantLiveError(error);
        reason = error instanceof Error ? error.message : "Live provider request failed";
      }
    } else {
      reason = "LLM_API_KEY is not configured";
    }

    if (!reply) {
      reply = fallbackBusinessReply({
        country,
        articleTitle: article?.title,
        message,
        locale
      });
      mode = "fallback";
    }

    const response: BusinessChatResponse = {
      reply,
      metadata: {
        mode,
        reason,
        provider: llm.provider,
        model: llm.model,
        articleSlug: article?.slug ?? null,
        country
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Business chat API error", error);
    return NextResponse.json(
      { error: "Failed to handle business chat request" },
      { status: 500 }
    );
  }
}
