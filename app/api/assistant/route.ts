import { NextRequest, NextResponse } from "next/server";
import { generateMockAssistantReply } from "@/lib/ai/mockAssistant";
import { getLlmConfig } from "@/lib/ai/llmConfig";
import { requestLiveLlm } from "@/lib/ai/liveClient";
import { BANK_YOUR_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { getAssistantHealth, markAssistantLiveError, markAssistantLiveSuccess } from "@/lib/ai/assistantHealth";
import { translateText } from "@/lib/news/articleTools";
import { Country, Locale, ServiceType } from "@/lib/types";

interface AssistantRequestBody {
  message?: string;
  country?: Country;
  serviceType?: ServiceType;
  locale?: Locale;
}

function buildCompletionPrompt(body: AssistantRequestBody): string {
  const locale = body.locale ?? "ru";
  return [
    `Current context:`,
    `- country: ${body.country ?? "russia"}`,
    `- serviceType: ${body.serviceType ?? "unknown"}`,
    `- preferred language: ${locale}`,
    "",
    `User question:`,
    body.message ?? ""
  ].join("\n");
}

async function requestLiveAssistant(body: AssistantRequestBody): Promise<string | null> {
  if (!getLlmConfig().apiKey) {
    return null;
  }

  const result = await requestLiveLlm({
    temperature: 0.3,
    model: getLlmConfig().model,
    messages: [
      {
        role: "system",
        content: BANK_YOUR_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: buildCompletionPrompt(body)
      }
    ]
  });
  return result.content;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssistantRequestBody;

    if (!body.message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const health = getAssistantHealth();
    const llm = getLlmConfig();
    let reply: string | null = null;
    let mode: "live" | "fallback" = "fallback";
    let reason: string | null = null;

    try {
      if (health.live_available) {
        reply = await requestLiveAssistant(body);
      } else {
        reason = health.last_error ?? "Live mode unavailable";
      }

      if (reply && health.live_available) {
        mode = "live";
        markAssistantLiveSuccess();
      }
    } catch (error) {
      markAssistantLiveError(error);
      reason = error instanceof Error ? error.message : "Live provider request failed";
      console.error("LLM assistant error, fallback to mock", error);
    }

    if (!reply) {
      reply = generateMockAssistantReply({
        country: body.country ?? "russia",
        serviceType: body.serviceType,
        userMessage: body.message,
        locale: body.locale ?? "ru"
      });
      mode = "fallback";
    }

    const locale = body.locale ?? "ru";
    if (reply && mode === "fallback" && locale !== "ru" && locale !== "en") {
      reply = await translateText(reply, locale);
    }

    const nextHealth = getAssistantHealth();

    return NextResponse.json({
      reply,
      metadata: {
        country: body.country ?? "russia",
        serviceType: body.serviceType ?? null,
        mode,
        reason,
        provider: llm.provider,
        model: llm.model,
        live_available: nextHealth.live_available,
        fallback_active: mode === "fallback" || nextHealth.fallback_active
      }
    });
  } catch (error) {
    console.error("Assistant API error", error);
    markAssistantLiveError(error);
    return NextResponse.json({
      reply:
        "Сервис ассистента временно в резервном режиме. Попробуйте сформулировать вопрос еще раз.",
      metadata: {
        mode: "fallback",
        reason: "Assistant runtime error",
        provider: getLlmConfig().provider,
        model: getLlmConfig().model,
        live_available: getAssistantHealth().live_available,
        fallback_active: true
      }
    });
  }
}
