import { NextRequest, NextResponse } from "next/server";
import {
  ACADEMY_LEVELS,
  getAcademyLessonBySlug,
  getAcademyModules
} from "@/data/academy";
import { localizeLesson, localizeModule } from "@/lib/academy/localize";
import { AcademyLevel, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function asLocale(input: string | null): Locale {
  if (!input) return "ru";
  if (["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"].includes(input)) {
    return input as Locale;
  }
  return "ru";
}

function asLevel(input: string | null): AcademyLevel | undefined {
  if (!input) return undefined;
  if (input === "basic" || input === "intermediate" || input === "advanced") {
    return input;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const lang = asLocale(params.get("lang") ?? params.get("locale"));
    const level = asLevel(params.get("level"));
    const q = (params.get("q") ?? "").trim().toLowerCase();
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") ?? "30", 10)));

    const modules = getAcademyModules(level);
    const localizedModules = await Promise.all(modules.map((item) => localizeModule(item, lang)));

    const withStats = await Promise.all(
      localizedModules.map(async (moduleItem) => {
        const lessons = await Promise.all(
          moduleItem.lessonSlugs.map(async (lessonSlug) => {
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
              tags: localizedLesson.tags
            };
          })
        );
        const resolvedLessons = lessons.filter(Boolean) as Array<{
          id: string;
          slug: string;
          title: string;
          summary: string;
          tags: string[];
        }>;

        const matched = q
          ? resolvedLessons.filter((lessonItem) =>
              `${lessonItem.title} ${lessonItem.summary} ${lessonItem.tags.join(" ")}`
                .toLowerCase()
                .includes(q)
            )
          : resolvedLessons;
        return {
          ...moduleItem,
          lessonsCount: resolvedLessons.length,
          matchedLessons: matched.length
        };
      })
    );

    const filtered = q ? withStats.filter((item) => item.matchedLessons > 0 || item.title.toLowerCase().includes(q)) : withStats;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      lang,
      level: level ?? null,
      page,
      pageSize,
      totalModules: filtered.length,
      levels: ACADEMY_LEVELS,
      modules: paginated
    });
  } catch (error) {
    console.error("Academy index API error", error);
    return NextResponse.json({ error: "Failed to load academy" }, { status: 500 });
  }
}
