import { BusinessArticle, Locale } from "@/lib/types";
import { translateText } from "@/lib/news/articleTools";

const cache = new Map<string, BusinessArticle>();

function cacheKey(slug: string, locale: Locale) {
  return `${slug}:${locale}`;
}

async function translateMany(items: string[], locale: Locale): Promise<string[]> {
  return Promise.all(items.map((item) => safeTranslate(item, locale)));
}

async function safeTranslate(value: string, locale: Locale): Promise<string> {
  try {
    return await translateText(value, locale);
  } catch {
    return value;
  }
}

export async function localizeBusinessArticle(
  article: BusinessArticle,
  locale: Locale
): Promise<BusinessArticle> {
  if (locale === "ru") {
    return article;
  }

  const key = cacheKey(article.slug, locale);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const localized: BusinessArticle = {
    ...article,
    title: await safeTranslate(article.title, locale),
    summary: await safeTranslate(article.summary, locale),
    tags: await translateMany(article.tags, locale),
    sections: await Promise.all(
      article.sections.map(async (section) => ({
        ...section,
        title: await safeTranslate(section.title, locale),
        content: await translateMany(section.content, locale),
        checklist: section.checklist
          ? await translateMany(section.checklist, locale)
          : undefined,
        formula: section.formula
          ? {
              expression: section.formula.expression,
              explanation: await safeTranslate(section.formula.explanation, locale)
            }
          : undefined
      }))
    ),
    faq: await Promise.all(
      article.faq.map(async (entry) => ({
        question: await safeTranslate(entry.question, locale),
        answer: await safeTranslate(entry.answer, locale)
      }))
    ),
    actions: await Promise.all(
      article.actions.map(async (action) => ({
        ...action,
        label: await safeTranslate(action.label, locale)
      }))
    )
  };

  cache.set(key, localized);
  return localized;
}

export async function localizeBusinessArticles(
  articles: BusinessArticle[],
  locale: Locale
): Promise<BusinessArticle[]> {
  if (locale === "ru") {
    return articles;
  }
  return Promise.all(articles.map((item) => localizeBusinessArticle(item, locale)));
}
