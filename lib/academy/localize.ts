import crypto from "node:crypto";
import { translateText } from "@/lib/news/articleTools";
import { AcademyLesson, AcademyModule, Locale } from "@/lib/types";

const textCache = new Map<string, string>();

async function translateCached(text: string, lang: Locale): Promise<string> {
  if (!text.trim() || lang === "ru") {
    return text;
  }
  const key = crypto.createHash("sha1").update(`${lang}:${text}`).digest("hex");
  const cached = textCache.get(key);
  if (cached) {
    return cached;
  }
  const translated = await translateText(text, lang);
  textCache.set(key, translated);
  return translated;
}

export async function localizeModule(moduleData: AcademyModule, lang: Locale): Promise<AcademyModule> {
  if (lang === "ru") {
    return moduleData;
  }
  return {
    ...moduleData,
    title: await translateCached(moduleData.title, lang),
    summary: await translateCached(moduleData.summary, lang)
  };
}

export async function localizeLesson(lessonData: AcademyLesson, lang: Locale): Promise<AcademyLesson> {
  if (lang === "ru") {
    return lessonData;
  }

  const [title, summary, tags] = await Promise.all([
    translateCached(lessonData.title, lang),
    translateCached(lessonData.summary, lang),
    Promise.all(lessonData.tags.map((tag) => translateCached(tag, lang)))
  ]);

  const blocks = await Promise.all(
    lessonData.blocks.map(async (block) => {
      if (block.type === "paragraph") {
        return {
          ...block,
          text: await translateCached(block.text, lang)
        } as typeof block;
      }
      if (block.type === "callout") {
        return {
          ...block,
          text: await translateCached(block.text, lang)
        } as typeof block;
      }
      if (block.type === "bullets") {
        return {
          ...block,
          title: block.title ? await translateCached(block.title, lang) : undefined,
          items: await Promise.all(block.items.map((item) => translateCached(item, lang)))
        } as typeof block;
      }
      if (block.type === "table") {
        return {
          ...block,
          title: block.title ? await translateCached(block.title, lang) : undefined,
          headers: await Promise.all(block.headers.map((item) => translateCached(item, lang))),
          rows: await Promise.all(
            block.rows.map((row) => Promise.all(row.map((item) => translateCached(item, lang))))
          )
        } as typeof block;
      }

      return {
        ...block,
        title: await translateCached(block.title, lang),
        expression: await translateCached(block.expression, lang),
        explanation: await translateCached(block.explanation, lang)
      } as typeof block;
    })
  );

  const images = await Promise.all(
    lessonData.images.map(async (image) => ({
      ...image,
      alt: await translateCached(image.alt, lang),
      caption: image.caption ? await translateCached(image.caption, lang) : undefined
    }))
  );

  const quiz = await Promise.all(
    lessonData.quiz.map(async (question) => ({
      ...question,
      question: await translateCached(question.question, lang),
      options: await Promise.all(question.options.map((item) => translateCached(item, lang))),
      explanation: await translateCached(question.explanation, lang)
    }))
  );

  return {
    ...lessonData,
    title,
    summary,
    tags,
    blocks,
    images,
    quiz
  };
}

