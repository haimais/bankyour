import { NextRequest, NextResponse } from "next/server";
import {
  getAcademyLessonBySlug,
  getAcademyModuleBySlug
} from "@/data/academy";
import { localizeLesson, localizeModule } from "@/lib/academy/localize";
import { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

export async function GET(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  try {
    const lang = asLocale(request.nextUrl.searchParams.get("lang") ?? request.nextUrl.searchParams.get("locale"));
    const moduleData = getAcademyModuleBySlug(context.params.slug);
    if (!moduleData) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const localizedModule = await localizeModule(moduleData, lang);
    const lessonTeasers = await Promise.all(
      moduleData.lessonSlugs.map(async (lessonSlug) => {
        const lessonData = getAcademyLessonBySlug(lessonSlug);
        if (!lessonData) {
          return null;
        }
        const localizedLesson = await localizeLesson(lessonData, lang);
        return {
          id: localizedLesson.id,
          slug: localizedLesson.slug,
          title: localizedLesson.title,
          summary: localizedLesson.summary,
          readingMinutes: localizedLesson.readingMinutes,
          level: localizedLesson.level,
          tags: localizedLesson.tags
        };
      })
    );

    return NextResponse.json({
      lang,
      module: localizedModule,
      lessons: lessonTeasers.filter(Boolean)
    });
  } catch (error) {
    console.error("Academy module API error", error);
    return NextResponse.json({ error: "Failed to load academy module" }, { status: 500 });
  }
}
