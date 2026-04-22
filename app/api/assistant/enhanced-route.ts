import { NextRequest, NextResponse } from "next/server";
import { generateMockAssistantReply } from "@/lib/ai/mockAssistant";
import { getLlmConfig } from "@/lib/ai/llmConfig";
import { requestLiveLlm } from "@/lib/ai/liveClient";
import { BANK_YOUR_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import {
  getAssistantHealth,
  markAssistantLiveError,
  markAssistantLiveSuccess
} from "@/lib/ai/assistantHealth";
import { translateText } from "@/lib/news/articleTools";
import { buildAiContext, getFinancialAdviceDisclaimer } from "@/lib/ai/assistantContext";
import { Country, Locale, ServiceType, ProductItem } from "@/lib/types";

interface AssistantRequestBody {
  message?: string;
  country?: Country;
  serviceType?: ServiceType;
  locale?: Locale;
  products?: ProductItem[];
  selectedProductId?: string;
  includeContext?: boolean;
}

interface AssistantResponse {
  reply?: string;
  metadata?: {
    mode?: "live" | "fallback";
    reason?: string | null;
    provider?: string;
    model?: string;
    live_available?: boolean;
    fallback_active?: boolean;
  };
  error?: string;
}

function buildCompletionPrompt(body: AssistantRequestBody): string {
  const locale = body.locale ?? "ru";
  const lines: string[] = [];

  // Add system context
  lines.push(`Current context:`);
  lines.push(`- country: ${body.country ?? "russia"}`);
  lines.push(`- serviceType: ${body.serviceType ?? "unknown"}`);
  lines.push(`- preferred language: ${locale}`);

  // Add AI context if products provided
  if (body.includeContext && body.products && body.products.length > 0) {
    lines.push("");
    const context = buildAiContext({
      country: body.country ?? "russia",
      products: body.products,
      selectedProductId: body.selectedProductId
    });
    lines.push(context);
  }

  lines.push("");
  lines.push(`User question:`);
  lines.push(body.message ?? "");

  return lines.join("\n");
}

async function requestLiveAssistant(body: AssistantRequestBody): Promise<string | null> {
  if (!getLlmConfig().apiKey) {
    return null;
  }

  try {
    const config = getLlmConfig();
    const prompt = buildCompletionPrompt(body);

    const result = await requestLiveLlm({
      temperature: 0.3,
      model: config.model,
      messages: [
        {
          role: "system",
          content: BANK_YOUR_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return result.content;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("LLM assistant error:", errorMsg);
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AssistantResponse>> {
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

    // Try live LLM first
    try {
      if (health.live_available && llm.apiKey) {
        reply = await requestLiveAssistant(body);

        if (reply) {
          mode = "live";
          markAssistantLiveSuccess();
        }
      } else if (!llm.apiKey) {
        reason = "LLM API key not configured";
      } else {
        reason = health.last_error ?? "Live mode unavailable";
      }
    } catch (error) {
      markAssistantLiveError(error);
      reason = error instanceof Error ? error.message : "Live provider request failed";
      console.error("Falling back to mock assistant due to error:", error);
    }

    // Fallback to mock if live failed
    if (!reply) {
      reply = generateMockAssistantReply({
        country: body.country ?? "russia",
        serviceType: body.serviceType,
        userMessage: body.message,
        locale: body.locale ?? "ru"
      });
      mode = "fallback";
    }

    // Add financial advice disclaimer
    const locale = body.locale ?? "ru";
    if (
      reply &&
      (body.message.toLowerCase().includes("recommend") ||
        body.message.toLowerCase().includes("choose") ||
        body.message.toLowerCase().includes("best"))
    ) {
      reply += getFinancialAdviceDisclaimer(locale);
    }

    // Translate if needed
    if (reply && mode === "fallback" && locale !== "ru" && locale !== "en") {
      try {
        reply = await translateText(reply, locale);
      } catch (error) {
        console.error("Translation error:", error);
        // Keep original reply if translation fails
      }
    }

    const nextHealth = getAssistantHealth();

    return NextResponse.json({
      reply,
      metadata: {
        mode,
        reason,
        provider: llm.provider,
        model: llm.model,
        live_available: nextHealth.live_available,
        fallback_active: mode === "fallback"
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Assistant API error:", errorMsg);

    return NextResponse.json(
      { error: `Failed to process request: ${errorMsg}` },
      { status: 500 }
    );
  }
}
