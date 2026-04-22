import crypto from "node:crypto";
import { requestLiveLlm, requestLiveLlmJson } from "@/lib/ai/liveClient";
import { getLlmConfig } from "@/lib/ai/llmConfig";
import { markFulltextExtractor } from "@/lib/news/fetchFinancialNews";
import { Locale } from "@/lib/types";

type SummaryMode = "live" | "fallback";

interface AiSummaryPayload {
  aiSummary: string;
  aiKeyPoints: string[];
  aiModel: string;
  aiGeneratedAt: string;
  summaryMode: SummaryMode;
}

interface CachedArticlePayload extends AiSummaryPayload {
  translatedTitle: string;
  translatedBody: string;
  fullTextBlocks: string[];
  originalTextBlocks: string[];
  extractionStatus: "ok" | "partial" | "failed";
  heroImage?: string;
  extractionTrace?: string[];
  fallbackReason?: string;
  summary: string;
  keyPoints: string[];
  translatedAt: string;
}

interface TranslatedArticlePayload extends CachedArticlePayload {
  originalTitle: string;
  originalBody: string;
}

const ARTICLE_CACHE = new Map<string, CachedArticlePayload>();

const ARTICLE_AI_SUMMARY_CACHE = new Map<
  string,
  {
    aiSummary: string;
    aiKeyPoints: string[];
    aiModel: string;
    aiGeneratedAt: string;
    summaryMode: SummaryMode;
  }
>();

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 20);
}

function chunkTextIntoBlocks(text: string, targetSize = 420): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return text.trim() ? [text.trim()] : [];
  }

  const blocks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > targetSize && current) {
      blocks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) {
    blocks.push(current.trim());
  }
  return blocks.slice(0, 40);
}

function buildTextRankSummary(text: string, count = 5): { summary: string; keyPoints: string[] } {
  const sentences = splitSentences(text).slice(0, 80);
  if (sentences.length === 0) {
    return { summary: "", keyPoints: [] };
  }

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "was",
    "are",
    "have",
    "has",
    "или",
    "как",
    "для",
    "что",
    "это",
    "при",
    "его",
    "она",
    "они",
    "также"
  ]);

  const frequencies = new Map<string, number>();
  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    words.forEach((word) => {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    });
  }

  const scored = sentences.map((sentence, index) => {
    const words = sentence
      .toLowerCase()
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
    const score = words.reduce((acc, word) => acc + (frequencies.get(word) ?? 0), 0);
    return { sentence, score, index };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  return {
    summary: top.slice(0, 2).join(" "),
    keyPoints: top
  };
}

async function buildAiSummary(
  translatedTitle: string,
  translatedBody: string,
  lang: Locale
): Promise<{
  aiSummary: string;
  aiKeyPoints: string[];
  aiModel: string;
  aiGeneratedAt: string;
  summaryMode: SummaryMode;
}> {
  const trimmedBody = translatedBody.slice(0, 6000);
  const cacheKey = crypto
    .createHash("sha1")
    .update(`${translatedTitle}:${trimmedBody}:${lang}:news-ai-v1`)
    .digest("hex");
  const cached = ARTICLE_AI_SUMMARY_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fallback = buildTextRankSummary(trimmedBody, 6);
  const fallbackValue = {
    aiSummary: fallback.summary,
    aiKeyPoints: fallback.keyPoints.slice(0, 7),
    aiModel: "text-rank",
    aiGeneratedAt: new Date().toISOString(),
    summaryMode: "fallback" as const
  };

  try {
    const languageHint =
      lang === "ru"
        ? "Пиши на русском языке."
        : `Write in language code ${lang}.`;

    const prompt = [
      "You summarize financial news for fintech users.",
      "Return strict JSON only:",
      "{\"summary\":\"...\",\"keyPoints\":[\"...\"],\"warnings\":[\"...\"]}",
      "Rules:",
      "- summary: one short paragraph, neutral tone.",
      "- keyPoints: 3-7 concise bullets.",
      "- do not invent facts beyond provided text.",
      languageHint,
      "",
      `Title: ${translatedTitle}`,
      `Body: ${trimmedBody}`
    ].join("\n");

    const result = await requestLiveLlmJson<{
      summary?: string;
      keyPoints?: string[];
    }>({
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a strict JSON API. Return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const aiSummary = (result.parsed.summary ?? "").trim();
    const aiKeyPoints = Array.isArray(result.parsed.keyPoints)
      ? result.parsed.keyPoints
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 7)
      : [];

    if (!aiSummary) {
      ARTICLE_AI_SUMMARY_CACHE.set(cacheKey, fallbackValue);
      return fallbackValue;
    }

    const value = {
      aiSummary,
      aiKeyPoints: aiKeyPoints.length > 0 ? aiKeyPoints : fallback.keyPoints.slice(0, 7),
      aiModel: result.model,
      aiGeneratedAt: new Date().toISOString(),
      summaryMode: "live" as const
    };
    ARTICLE_AI_SUMMARY_CACHE.set(cacheKey, value);
    return value;
  } catch {
    ARTICLE_AI_SUMMARY_CACHE.set(cacheKey, fallbackValue);
    return fallbackValue;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function extractArticle(url: string): Promise<{
  title: string;
  body: string;
  heroImage?: string;
  trace: string[];
}> {
  const trace: string[] = [];
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      trace.push(`fetch_failed_${response.status}`);
      markFulltextExtractor("degraded");
      throw new Error(`Article fetch failed: ${response.status}`);
    }
    const html = await response.text();
    trace.push("fetched_html");
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = stripHtml(titleMatch?.[1] ?? "");

    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) {
      trace.push("used_article_tag");
    }
    const mainMatch = !articleMatch ? html.match(/<main[\s\S]*?<\/main>/i) : null;
    if (mainMatch) {
      trace.push("used_main_tag");
    }
    const bodyMatch = !articleMatch && !mainMatch ? html.match(/<body[\s\S]*?<\/body>/i) : null;
    if (bodyMatch) {
      trace.push("used_body_tag");
    }
    const articleBlock = articleMatch?.[0] ?? mainMatch?.[0] ?? bodyMatch?.[0] ?? html;
    if (!articleMatch && !mainMatch && !bodyMatch) {
      trace.push("fallback_whole_html");
    }

    const body = stripHtml(articleBlock).slice(0, 20_000);
    const ogImage = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    )?.[1];
    const firstImage =
      ogImage ??
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ??
      undefined;

    markFulltextExtractor("healthy");
    return { title, body, heroImage: firstImage, trace };
  } catch (error) {
    markFulltextExtractor("degraded");
    throw error;
  }
}

export async function translateText(input: string, targetLang: Locale): Promise<string> {
  if (!input.trim()) {
    return "";
  }

  if (targetLang === "en") {
    return input;
  }

  const endpoint = process.env.LIBRETRANSLATE_URL;
  if (endpoint) {
    try {
      const response = await fetchWithTimeout(endpoint, 12_000);
      if (response.ok) {
        const translationResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            q: input.slice(0, 8000),
            source: "auto",
            target: targetLang,
            format: "text"
          })
        });

        if (translationResponse.ok) {
          const data = (await translationResponse.json()) as { translatedText?: string };
          if (data.translatedText?.trim()) {
            return data.translatedText.trim();
          }
        }
      }
    } catch {
      // fallback below
    }
  }

  const llm = getLlmConfig();
  if (llm.apiKey) {
    try {
      const result = await requestLiveLlm({
        temperature: 0,
        model: llm.model,
        messages: [
          {
            role: "system",
            content: "You are a translator. Return only translated text without comments."
          },
          {
            role: "user",
            content: `Translate to language code \"${targetLang}\".\n\nText:\n${input.slice(0, 7000)}`
          }
        ]
      });
      if (result.content.trim()) {
        return result.content.trim();
      }
    } catch {
      // fallback below
    }
  }

  return input;
}

export async function getTranslatedArticle(url: string, lang: Locale): Promise<TranslatedArticlePayload> {
  const { title, body, heroImage, trace } = await extractArticle(url);
  const contentHash = crypto
    .createHash("sha1")
    .update(`${title}:${body}`)
    .digest("hex");
  const key = `${url}:${lang}:${contentHash}`;

  const cached = ARTICLE_CACHE.get(key);
  if (cached) {
    return {
      originalTitle: title,
      originalBody: body,
      ...cached
    };
  }

  const translatedTitle = await translateText(title, lang);
  const translatedBody = await translateText(body, lang);
  const translationFallback = translatedBody === body && translatedTitle === title;
  const originalTextBlocks = chunkTextIntoBlocks(body);
  const fullTextBlocks = chunkTextIntoBlocks(translatedBody);
  const extractionStatus: "ok" | "partial" | "failed" =
    body.length > 800 ? "ok" : body.length > 200 ? "partial" : "failed";
  const { summary, keyPoints } = buildTextRankSummary(translatedBody);
  const aiSummary = await buildAiSummary(translatedTitle, translatedBody, lang);
  const translatedAt = new Date().toISOString();

  const value: CachedArticlePayload = {
    translatedTitle,
    translatedBody,
    fullTextBlocks,
    originalTextBlocks,
    extractionStatus,
    heroImage,
    extractionTrace: trace,
    fallbackReason:
      extractionStatus === "failed"
        ? "fulltext_unavailable"
        : translationFallback && lang !== "en"
          ? "translation_service_unavailable"
          : undefined,
    summary,
    keyPoints,
    translatedAt,
    aiSummary: aiSummary.aiSummary,
    aiKeyPoints: aiSummary.aiKeyPoints,
    aiModel: aiSummary.aiModel,
    aiGeneratedAt: aiSummary.aiGeneratedAt,
    summaryMode: aiSummary.summaryMode
  };
  ARTICLE_CACHE.set(key, value);

  return {
    originalTitle: title,
    originalBody: body,
    ...value
  };
}
