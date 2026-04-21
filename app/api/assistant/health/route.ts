import { NextResponse } from "next/server";
import { getAssistantHealth } from "@/lib/ai/assistantHealth";
import { getLlmConfig } from "@/lib/ai/llmConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = getAssistantHealth();
    return NextResponse.json(health);
  } catch (error) {
    console.error("Assistant health API error", error);
    return NextResponse.json(
      {
        provider: getLlmConfig().provider,
        model: getLlmConfig().model,
        base_url_masked: getLlmConfig().baseUrl,
        live_available: false,
        summary_live_available: false,
        fallback_active: true,
        last_error: "Failed to read assistant health"
      },
      { status: 500 }
    );
  }
}
