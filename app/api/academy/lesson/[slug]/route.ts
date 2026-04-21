import { NextRequest, NextResponse } from "next/server";
import { getAcademyLessonBySlug, getAcademyModuleBySlug } from "@/data/academy";
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
    const lessonData = getAcademyLessonBySlug(context.params.slug);
    if (!lessonData) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const moduleData = getAcademyModuleBySlug(lessonData.moduleSlug);
    const [localizedLesson, localizedModule] = await Promise.all([
      localizeLesson(lessonData, lang),
      moduleData ? localizeModule(moduleData, lang) : null
    ]);

    return NextResponse.json({
      lang,
      module: localizedModule,
      lesson: localizedLesson
    });
  } catch (error) {
    console.error("Academy lesson API error", error);
    return NextResponse.json({ error: "Failed to load academy lesson" }, { status: 500 });
  }
}

