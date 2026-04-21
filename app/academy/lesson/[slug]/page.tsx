"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LessonChat } from "@/components/academy/LessonChat";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useLocale } from "@/context/LocaleContext";
import { AcademyLesson, LessonBlock } from "@/lib/types";

interface LessonResponse {
  lesson: AcademyLesson;
  module?: {
    slug: string;
    title: string;
  } | null;
}

interface GradeResponse {
  score: number;
  correct: number;
  total: number;
  details: Array<{
    id: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

function renderBlock(block: LessonBlock, key: string) {
  if (block.type === "paragraph") {
    return <p key={key} className="text-slate-700 leading-7">{block.text}</p>;
  }
  if (block.type === "callout") {
    const toneClass =
      block.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : block.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-blue-200 bg-blue-50 text-blue-900";
    return (
      <div key={key} className={`rounded-xl border px-4 py-3 text-sm ${toneClass}`}>
        {block.text}
      </div>
    );
  }
  if (block.type === "bullets") {
    return (
      <div key={key}>
        {block.title ? <h3 className="text-lg font-semibold text-slate-900">{block.title}</h3> : null}
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          {block.items.map((item) => (
            <li key={`${key}-${item}`}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.type === "table") {
    return (
      <div key={key} className="overflow-x-auto rounded-xl border border-slate-200">
        {block.title ? <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">{block.title}</h3> : null}
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {block.headers.map((header) => (
                <th key={`${key}-${header}`} className="px-4 py-2 text-left font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${key}-row-${rowIndex}`} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${key}-cell-${rowIndex}-${cellIndex}`} className="px-4 py-2 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{block.title}</h3>
      <p className="mt-2 font-mono text-sm text-blue-700">{block.expression}</p>
      <p className="mt-2 text-sm text-slate-700">{block.explanation}</p>
    </div>
  );
}

export default function AcademyLessonPage() {
  const params = useParams<{ slug: string }>();
  const { locale } = useLocale();

  const [data, setData] = useState<LessonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setRequestError(null);
        const response = await fetch(`/api/academy/lesson/${params.slug}?lang=${locale}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load lesson");
        }
        const payload = (await response.json()) as LessonResponse;
        if (!cancelled) {
          setData(payload);
          setAnswers({});
          setGrade(null);
        }
      } catch {
        if (!cancelled) {
          setRequestError(locale === "ru" ? "Не удалось загрузить урок." : "Failed to load lesson.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, params.slug, reloadKey]);

  const allAnswered = useMemo(() => {
    if (!data?.lesson.quiz) {
      return false;
    }
    return data.lesson.quiz.every((item) => Number.isInteger(answers[item.id]));
  }, [answers, data?.lesson.quiz]);

  async function onSubmitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.lesson) {
      return;
    }

    try {
      setGrading(true);
      setGradeError(null);
      const response = await fetch(`/api/academy/quiz/${data.lesson.slug}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers })
      });
      if (!response.ok) {
        throw new Error("Failed to grade quiz");
      }
      const payload = (await response.json()) as GradeResponse;
      setGrade(payload);
    } catch {
      setGradeError(locale === "ru" ? "Не удалось проверить тест." : "Failed to grade quiz.");
    } finally {
      setGrading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/academy" className="font-medium text-blue-700">
          {locale === "ru" ? "← Академия" : "← Academy"}
        </Link>
        {data?.module ? (
          <Link href={`/academy/module/${data.module.slug}`} className="font-medium text-blue-700">
            {locale === "ru" ? "К модулю" : "To module"}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {locale === "ru" ? "Загружаем урок..." : "Loading lesson..."}
        </div>
      ) : !data ? (
        <div className="mt-4 space-y-2">
          <ActionErrorBanner message={requestError ?? (locale === "ru" ? "Урок не найден." : "Lesson not found.")} />
          <RetryButton
            label={locale === "ru" ? "Повторить" : "Retry"}
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          />
        </div>
      ) : (
        <>
          <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h1 className="text-3xl font-semibold text-slate-900">{data.lesson.title}</h1>
            <p className="mt-2 text-slate-600">{data.lesson.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.lesson.tags.map((tag) => (
                <span key={`${data.lesson.id}-${tag}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </motion.article>

          <div className="mt-6 space-y-5">
            {data.lesson.blocks.map((block, index) => (
              <motion.div key={`${data.lesson.id}-block-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.02 }}>
                {renderBlock(block, `${data.lesson.id}-${index}`)}
              </motion.div>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-2xl font-semibold text-slate-900">
              {locale === "ru" ? "Проверка знаний" : "Knowledge check"}
            </h2>
            <form onSubmit={onSubmitQuiz} className="mt-4 space-y-5">
              {data.lesson.quiz.map((question, index) => (
                <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-base font-semibold text-slate-900">
                    {index + 1}. {question.question}
                  </legend>
                  <div className="mt-2 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={`${question.id}-${optionIndex}`} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === optionIndex}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                          className="mt-0.5 h-4 w-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <button
                type="submit"
                disabled={!allAnswered || grading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {grading
                  ? locale === "ru"
                    ? "Проверяем..."
                    : "Checking..."
                  : locale === "ru"
                    ? "Проверить тест"
                    : "Submit quiz"}
              </button>
            </form>

            {gradeError ? (
              <div className="mt-3">
                <ActionErrorBanner message={gradeError} />
              </div>
            ) : null}

            {grade ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-lg font-semibold text-emerald-900">
                  {locale === "ru" ? "Результат" : "Result"}: {grade.score}%
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  {locale === "ru" ? "Верно" : "Correct"}: {grade.correct} / {grade.total}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                  {grade.details.map((item) => (
                    <li key={item.id}>
                      {item.isCorrect ? (locale === "ru" ? "Верно." : "Correct.") : locale === "ru" ? "Есть ошибка." : "Needs review."}{" "}
                      {item.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <LessonChat lessonSlug={data.lesson.slug} lessonTitle={data.lesson.title} />
        </>
      )}
    </section>
  );
}
