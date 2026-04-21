"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useLocale } from "@/context/LocaleContext";
import { AcademyLevel } from "@/lib/types";

interface LessonTeaser {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: AcademyLevel;
  tags: string[];
}

interface ModulePayload {
  module: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    level: AcademyLevel;
  };
  lessons: LessonTeaser[];
}

export default function AcademyModulePage() {
  const params = useParams<{ slug: string }>();
  const { locale } = useLocale();
  const [data, setData] = useState<ModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setRequestError(null);
        const response = await fetch(`/api/academy/module/${params.slug}?lang=${locale}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load module");
        }
        const payload = (await response.json()) as ModulePayload;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setRequestError(locale === "ru" ? "Не удалось загрузить модуль." : "Failed to load module.");
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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/academy" className="text-sm font-medium text-blue-700">
        {locale === "ru" ? "← К академии" : "← Back to academy"}
      </Link>

      {loading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {locale === "ru" ? "Загружаем модуль..." : "Loading module..."}
        </div>
      ) : !data ? (
        <div className="mt-4 space-y-2">
          <ActionErrorBanner message={requestError ?? (locale === "ru" ? "Модуль не найден." : "Module not found.")} />
          <RetryButton
            label={locale === "ru" ? "Повторить" : "Retry"}
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          />
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-semibold text-slate-900">{data.module.title}</h1>
            <p className="mt-2 text-slate-600">{data.module.summary}</p>
          </motion.div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.lessons.map((lessonItem, idx) => (
              <motion.article
                key={lessonItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <h2 className="text-lg font-semibold text-slate-900">{lessonItem.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{lessonItem.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lessonItem.tags.slice(0, 5).map((tag) => (
                    <span key={`${lessonItem.id}-${tag}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/academy/lesson/${lessonItem.slug}`}
                  className="mt-4 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  {locale === "ru" ? "Открыть урок" : "Open lesson"}
                </Link>
              </motion.article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
