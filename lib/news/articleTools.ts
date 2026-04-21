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
const ARTICLE_PIPELINE_VERSION = "news-pipeline-v2";
const TRANSLATE_CHUNK_MAX_CHARS = 2_400;
const TRANSLATE_MAX_CHUNKS = 60;
const BOILERPLATE_LINE_RE =
  /(подпис|subscribe|cookie|consent|advert|реклам|all rights reserved|читать также|related|recommended|share this|follow us|comments?)/i;

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

function decodeHtmlEntities(value: string): string {
  if (!value) {
    return "";
  }

  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    mdash: "-",
    ndash: "-",
    hellip: "...",
    laquo: '"',
    raquo: '"'
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower in named) {
      return named[lower];
    }
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

function stripHtml(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(cleaned)
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeInlineWhitespace(value: string): string {
  return value
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeBoilerplateBlocks(html: string): string {
  return html
    .replace(/<(script|style|noscript|template|svg|iframe|form|button|input|select|textarea|canvas)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(
      /<(div|section|ul|ol)[^>]*(?:id|class)=["'][^"']*(?:ad-|ads|advert|promo|banner|subscribe|newsletter|cookie|consent|share|social|related|recommend|comment|widget|sponsor|paywall|outbrain|taboola)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
      " "
    );
}

function isLikelyNoiseBlock(text: string): boolean {
  if (!text.trim()) {
    return true;
  }

  if (BOILERPLATE_LINE_RE.test(text)) {
    return true;
  }

  const lower = text.toLowerCase();
  if (/^\d{1,2}:\d{2}\s*,?\s*\d{1,2}\s+[a-zа-яё]+\s+\d{4}/i.test(lower)) {
    return true;
  }

  if (/(редактор|editor|updated|обновлено)/i.test(lower) && text.length < 120) {
    return true;
  }
  if (/(^|\s)(erid:|соглашение:|advertisement)(\s|$)/i.test(lower)) {
    return true;
  }

  const tokenCount = text.split(/\s+/).length;
  const punctuationCount = (text.match(/[.!?]/g) ?? []).length;
  if (punctuationCount === 0 && tokenCount >= 5 && tokenCount <= 28 && text.length < 190) {
    return true;
  }

  return false;
}

function htmlToTextBlocks(html: string): string[] {
  const normalized = removeBoilerplateBlocks(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|blockquote|section|article|div)>/gi, "\n");

  const paragraphMatches = normalized.match(/<(p|li|blockquote)[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  const rawBlocks =
    paragraphMatches.length > 0
      ? paragraphMatches.map((block) => normalizeInlineWhitespace(stripHtml(block)))
      : stripHtml(normalized)
          .split(/\n+/)
          .map((line) => normalizeInlineWhitespace(line));

  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const text of rawBlocks) {
    if (text.length < 45) {
      continue;
    }
    if (isLikelyNoiseBlock(text)) {
      continue;
    }
    const key = text.toLowerCase().slice(0, 180);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    blocks.push(text);
  }

  return blocks;
}

function scoreTextBlocks(blocks: string[]): number {
  const text = blocks.join(" ");
  const sentenceCount = Math.max(1, splitSentences(text).length);
  return text.length + blocks.length * 180 + sentenceCount * 40;
}

function pickBestCandidateText(html: string, trace: string[]): string {
  const candidates: Array<{ source: string; html: string }> = [];
  const articleMatches = Array.from(html.matchAll(/<article[\s\S]*?<\/article>/gi))
    .map((match) => match[0])
    .slice(0, 6);
  articleMatches.forEach((value) => candidates.push({ source: "article", html: value }));

  const mainMatches = Array.from(html.matchAll(/<main[\s\S]*?<\/main>/gi))
    .map((match) => match[0])
    .slice(0, 3);
  mainMatches.forEach((value) => candidates.push({ source: "main", html: value }));

  const semanticMatches = Array.from(
    html.matchAll(
      /<(section|div)[^>]*(?:id|class)=["'][^"']*(?:article|story|entry|content|post-body|article-body|news-body|article-content|story-body)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi
    )
  )
    .map((match) => match[0])
    .slice(0, 12);
  semanticMatches.forEach((value) => candidates.push({ source: "semantic", html: value }));

  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i)?.[0];
  if (bodyMatch) {
    candidates.push({ source: "body", html: bodyMatch });
  } else {
    candidates.push({ source: "full_html", html });
  }

  let bestScore = 0;
  let bestText = "";
  let bestSource = "fallback";

  for (const candidate of candidates) {
    const blocks = htmlToTextBlocks(candidate.html);
    if (blocks.length === 0) {
      continue;
    }

    const score = scoreTextBlocks(blocks);
    if (score > bestScore) {
      bestScore = score;
      bestText = blocks.join("\n\n");
      bestSource = candidate.source;
    }
  }

  if (bestText.trim()) {
    trace.push(`content_source_${bestSource}`);
    return bestText;
  }

  trace.push("content_source_fallback_strip");
  return stripHtml(removeBoilerplateBlocks(bodyMatch ?? html));
}

function extractMetaContent(html: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`,
      "i"
    )
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match?.trim()) {
      return normalizeInlineWhitespace(decodeHtmlEntities(match));
    }
  }
  return undefined;
}

function absolutizeUrl(sourceUrl: string, maybeRelative?: string): string | undefined {
  if (!maybeRelative?.trim()) {
    return undefined;
  }
  const value = maybeRelative.trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return value;
  }
}

function collectJsonLdArticleBodies(node: unknown, out: string[]) {
  if (!node) {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLdArticleBodies(item, out));
    return;
  }
  if (typeof node !== "object") {
    return;
  }
  const record = node as Record<string, unknown>;
  const typeRaw = record["@type"];
  const type = Array.isArray(typeRaw) ? typeRaw.join(" ") : typeof typeRaw === "string" ? typeRaw : "";
  if (/(newsarticle|article|blogposting|reportagenewsarticle)/i.test(type)) {
    const candidateBody =
      typeof record.articleBody === "string"
        ? record.articleBody
        : typeof record.description === "string"
          ? record.description
          : "";
    const cleaned = normalizeInlineWhitespace(stripHtml(candidateBody));
    if (cleaned.length > 120) {
      out.push(cleaned);
    }
  }

  Object.values(record).forEach((value) => collectJsonLdArticleBodies(value, out));
}

function extractJsonLdArticleText(html: string): string {
  const outputs: string[] = [];
  const scripts = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  )
    .map((match) => match[1])
    .slice(0, 20);

  for (const raw of scripts) {
    const candidate = raw.trim();
    if (!candidate) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate) as unknown;
      collectJsonLdArticleBodies(parsed, outputs);
    } catch {
      // ignore malformed JSON-LD block
    }
  }

  return outputs.sort((a, b) => b.length - a.length)[0] ?? "";
}

function postProcessArticleBody(rawBody: string, title: string): string {
  let body = rawBody
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!body) {
    return "";
  }

  body = body.replace(
    /^[\s\S]{0,420}?\b\d{1,2}:\d{2}\s*,?\s*\d{1,2}\s+[a-zа-яё]+\s+\d{4}\s*/i,
    ""
  );
  for (let i = 0; i < 4; i += 1) {
    body = body
      .replace(/^\s*соглашение:\s*[^.]{0,220}\.\s*/i, "")
      .replace(/^\s*vk\s*-\s*вк\.?\s*/i, "")
      .replace(/^\s*erid:\s*[a-z0-9]+\.?\s*/i, "")
      .replace(/^\s*advertisement:?\s*/i, "")
      .trim();
  }
  body = body.replace(/\b[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё.\- ]{2,100}\((?:редактор|editor)[^)]+\)\s*/gi, "");
  body = body.replace(/^(?:[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё-]{2,24}\s+){6,}/, "");

  const normalizedTitle = normalizeInlineWhitespace(title).toLowerCase();
  if (normalizedTitle) {
    const bodyNorm = normalizeInlineWhitespace(body);
    if (bodyNorm.toLowerCase().startsWith(normalizedTitle)) {
      body = bodyNorm.slice(normalizedTitle.length).trim();
    }
  }

  return body
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 24_000);
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

async function fetchWithTimeout(url: string, timeoutMs = 10_000, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
      signal: controller.signal
    });
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
    const titleTag = normalizeInlineWhitespace(
      stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    );
    const ogTitle = extractMetaContent(html, "og:title");
    const twitterTitle = extractMetaContent(html, "twitter:title");
    const h1Title = normalizeInlineWhitespace(
      stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
    );
    const title = ogTitle ?? twitterTitle ?? h1Title ?? titleTag;

    const jsonLdText = extractJsonLdArticleText(html);
    let body = "";
    if (jsonLdText.length > 280) {
      body = jsonLdText;
      trace.push("content_source_jsonld_articleBody");
    } else {
      body = pickBestCandidateText(html, trace);
    }

    body = postProcessArticleBody(body, title);

    const ogImage = extractMetaContent(html, "og:image");
    const twitterImage = extractMetaContent(html, "twitter:image");
    const articleImage =
      html.match(/<article[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ??
      html.match(/<main[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ??
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1];
    const firstImage = absolutizeUrl(url, ogImage ?? twitterImage ?? articleImage);

    markFulltextExtractor("healthy");
    return { title, body, heroImage: firstImage, trace };
  } catch (error) {
    markFulltextExtractor("degraded");
    throw error;
  }
}

function splitHardByLength(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const chunks: string[] = [];
  let cursor = trimmed;
  while (cursor.length > maxChars) {
    let cut = cursor.lastIndexOf(" ", maxChars);
    if (cut < Math.floor(maxChars * 0.6)) {
      cut = maxChars;
    }
    chunks.push(cursor.slice(0, cut).trim());
    cursor = cursor.slice(cut).trim();
  }
  if (cursor) {
    chunks.push(cursor);
  }
  return chunks;
}

function splitForTranslation(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= TRANSLATE_CHUNK_MAX_CHARS) {
    return [normalized];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const units = paragraphs.length > 0 ? paragraphs : [normalized];
  const expandedUnits: string[] = [];

  for (const unit of units) {
    if (unit.length <= TRANSLATE_CHUNK_MAX_CHARS) {
      expandedUnits.push(unit);
      continue;
    }

    const sentences = unit
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (sentences.length <= 1) {
      expandedUnits.push(...splitHardByLength(unit, TRANSLATE_CHUNK_MAX_CHARS));
      continue;
    }

    for (const sentence of sentences) {
      if (sentence.length <= TRANSLATE_CHUNK_MAX_CHARS) {
        expandedUnits.push(sentence);
      } else {
        expandedUnits.push(...splitHardByLength(sentence, TRANSLATE_CHUNK_MAX_CHARS));
      }
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const unit of expandedUnits) {
    const next = current ? `${current}\n\n${unit}` : unit;
    if (next.length > TRANSLATE_CHUNK_MAX_CHARS && current) {
      chunks.push(current.trim());
      current = unit;
    } else {
      current = next;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, TRANSLATE_MAX_CHUNKS);
}

async function translateWithLibre(chunk: string, targetLang: Locale): Promise<string | null> {
  const endpoint = process.env.LIBRETRANSLATE_URL?.trim();
  if (!endpoint) {
    return null;
  }

  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim();
  try {
    const response = await fetchWithTimeout(endpoint, 15_000, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: chunk,
        source: "auto",
        target: targetLang,
        format: "text",
        ...(apiKey ? { api_key: apiKey } : {})
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { translatedText?: string };
    const translated = data.translatedText?.trim();
    return translated ? translated : null;
  } catch {
    return null;
  }
}

async function translateWithLlm(chunk: string, targetLang: Locale): Promise<string | null> {
  const llm = getLlmConfig();
  if (!llm.apiKey) {
    return null;
  }

  try {
    const result = await requestLiveLlm({
      temperature: 0,
      model: llm.model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Return only translated text. Preserve names, numbers, currencies, and paragraph structure."
        },
        {
          role: "user",
          content: [
            `Translate to language code "${targetLang}".`,
            "Do not add comments.",
            "",
            "Text:",
            chunk
          ].join("\n")
        }
      ]
    });
    const translated = result.content.trim();
    return translated ? translated : null;
  } catch {
    return null;
  }
}

export async function translateText(input: string, targetLang: Locale): Promise<string> {
  const normalized = input.trim();
  if (!normalized) {
    return "";
  }

  const chunks = splitForTranslation(normalized);
  if (chunks.length === 0) {
    return normalized;
  }

  const translatedChunks: Array<string | null> = new Array(chunks.length).fill(null);
  for (let i = 0; i < chunks.length; i += 1) {
    translatedChunks[i] = await translateWithLibre(chunks[i], targetLang);
  }

  for (let i = 0; i < chunks.length; i += 1) {
    if (translatedChunks[i]) {
      continue;
    }
    translatedChunks[i] = await translateWithLlm(chunks[i], targetLang);
  }

  const hasAnyTranslated = translatedChunks.some((item) => Boolean(item));
  if (!hasAnyTranslated) {
    return normalized;
  }

  return translatedChunks
    .map((item, index) => (item?.trim() ? item.trim() : chunks[index]))
    .join("\n\n")
    .trim();
}

function translationLooksUnavailable(original: string, translated: string, targetLang: Locale): boolean {
  if (!original.trim()) {
    return false;
  }
  if (original !== translated) {
    return false;
  }

  const sample = original.slice(0, 3000);
  if (targetLang === "ru" || targetLang === "be" || targetLang === "kk") {
    return !/[А-Яа-яЁё]/.test(sample);
  }
  if (targetLang === "hy") {
    return !/[Ա-Ֆա-ֆ]/.test(sample);
  }
  if (targetLang === "ka") {
    return !/[\u10A0-\u10FF]/.test(sample);
  }
  if (targetLang === "ar") {
    return !/[\u0600-\u06FF]/.test(sample);
  }
  return false;
}

export async function getTranslatedArticle(url: string, lang: Locale): Promise<TranslatedArticlePayload> {
  const { title, body, heroImage, trace } = await extractArticle(url);
  const contentHash = crypto
    .createHash("sha1")
    .update(`${title}:${body}`)
    .digest("hex");
  const key = `${ARTICLE_PIPELINE_VERSION}:${url}:${lang}:${contentHash}`;

  const cached = ARTICLE_CACHE.get(key);
  if (cached) {
    return {
      originalTitle: title,
      originalBody: body,
      ...cached
    };
  }

  const [translatedTitle, translatedBody] = await Promise.all([
    translateText(title, lang),
    translateText(body, lang)
  ]);
  const translationFallback =
    translationLooksUnavailable(title, translatedTitle, lang) ||
    translationLooksUnavailable(body, translatedBody, lang);
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
        : translationFallback
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
