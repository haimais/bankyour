import { NextRequest, NextResponse } from "next/server";
import { getAcademyLessonBySlug } from "@/data/academy";

interface GradeRequestBody {
  answers?: Record<string, number>;
}

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: { lessonSlug: string } }
) {
  try {
    const lessonData = getAcademyLessonBySlug(context.params.lessonSlug);
    if (!lessonData) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const body = (await request.json()) as GradeRequestBody;
    const answers = body.answers ?? {};
    const details = lessonData.quiz.map((question) => {
      const selectedIndex = answers[question.id];
      const isCorrect = selectedIndex === question.correctIndex;
      return {
        id: question.id,
        selectedIndex: Number.isFinite(selectedIndex) ? selectedIndex : null,
        correctIndex: question.correctIndex,
        isCorrect,
        explanation: question.explanation
      };
    });

    const total = details.length;
    const correct = details.filter((item) => item.isCorrect).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return NextResponse.json({
      lessonSlug: context.params.lessonSlug,
      total,
      correct,
      score,
      details,
      recommendNext:
        score >= 80
          ? "next"
          : "retry"
    });
  } catch (error) {
    console.error("Academy quiz grade API error", error);
    return NextResponse.json({ error: "Failed to grade quiz" }, { status: 500 });
  }
}

