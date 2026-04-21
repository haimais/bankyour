import { getGigaChatAccessToken, getGigaChatFetchOptions } from "@/lib/ai/gigachatClient";
import { getLlmConfig } from "@/lib/ai/llmConfig";

interface ChatCompletionMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  temperature?: number;
  messages: ChatCompletionMessage[];
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface LiveLlmResult {
  content: string;
  provider: string;
  model: string;
}

async function requestOpenAiCompatible(
  requestBody: ChatCompletionRequest
): Promise<LiveLlmResult> {
  const config = getLlmConfig();
  if (!config.apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const body = {
    model: requestBody.model ?? config.model,
    temperature: requestBody.temperature ?? 0.2,
    stream: false,
    messages: requestBody.messages
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM response is empty");
  }

  return {
    content,
    provider: config.provider,
    model: body.model
  };
}

async function requestGigaChat(requestBody: ChatCompletionRequest): Promise<LiveLlmResult> {
  const config = getLlmConfig();
  if (!config.apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const body = {
    model: requestBody.model ?? config.model,
    temperature: requestBody.temperature ?? 0.2,
    stream: false,
    messages: requestBody.messages
  };

  let accessToken = await getGigaChatAccessToken(config);
  let response = await fetch(`${config.baseUrl}/chat/completions`, {
    ...getGigaChatFetchOptions(),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  if (response.status === 401 || response.status === 403) {
    accessToken = await getGigaChatAccessToken(config, true);
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      ...getGigaChatFetchOptions(),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GigaChat request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("GigaChat response is empty");
  }

  return {
    content,
    provider: config.provider,
    model: body.model
  };
}

export async function requestLiveLlm(
  requestBody: ChatCompletionRequest
): Promise<LiveLlmResult> {
  const config = getLlmConfig();
  const provider = config.provider.toLowerCase();
  if (provider === "gigachat") {
    return requestGigaChat(requestBody);
  }
  return requestOpenAiCompatible(requestBody);
}

function extractJsonSlice(input: string): string | null {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return input.slice(start, end + 1);
}

export async function requestLiveLlmJson<T>(
  requestBody: ChatCompletionRequest
): Promise<{
  parsed: T;
  provider: string;
  model: string;
}> {
  const result = await requestLiveLlm(requestBody);
  const jsonSlice = extractJsonSlice(result.content);
  if (!jsonSlice) {
    throw new Error("LLM JSON response not found");
  }

  try {
    return {
      parsed: JSON.parse(jsonSlice) as T,
      provider: result.provider,
      model: result.model
    };
  } catch (error) {
    throw new Error(
      `Failed to parse LLM JSON response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
