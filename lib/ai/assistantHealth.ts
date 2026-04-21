import { getLlmConfig, maskBaseUrl } from "@/lib/ai/llmConfig";

interface AssistantHealthState {
  lastError: string | null;
  lastCheckedAt: string | null;
  lastLiveSuccessAt: string | null;
}

const state: AssistantHealthState = {
  lastError: null,
  lastCheckedAt: null,
  lastLiveSuccessAt: null
};

export function markAssistantLiveSuccess() {
  const now = new Date().toISOString();
  state.lastCheckedAt = now;
  state.lastLiveSuccessAt = now;
  state.lastError = null;
}

export function markAssistantLiveError(error: unknown) {
  state.lastCheckedAt = new Date().toISOString();
  state.lastError = error instanceof Error ? error.message : String(error);
}

export function getAssistantHealth() {
  const config = getLlmConfig();
  const hasApiKey = Boolean(config.apiKey);
  const liveAvailable = hasApiKey;

  return {
    provider: config.provider,
    model: config.model,
    base_url_masked: maskBaseUrl(config.baseUrl),
    live_available: liveAvailable,
    summary_live_available: liveAvailable,
    fallback_active: !liveAvailable || Boolean(state.lastError),
    last_error: !hasApiKey ? "LLM_API_KEY is not configured" : state.lastError,
    last_checked_at: state.lastCheckedAt,
    last_live_success_at: state.lastLiveSuccessAt
  };
}
