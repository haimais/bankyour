"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useLocale } from "@/context/LocaleContext";

interface AcademyLevelItem {
  level: "basic" | "intermediate" | "advanced";
  title: string;
  description: string;
}

interface AcademyModuleItem {
  id: string;
  slug: string;
  level: "basic" | "intermediate" | "advanced";
  title: string;
  summary: string;
  lessonsCount: number;
  matchedLessons: number;
}

interface AcademyIndexResponse {
  levels: AcademyLevelItem[];
  modules: AcademyModuleItem[];
}

const LEVEL_LABELS: Array<"basic" | "intermediate" | "advanced"> = ["basic", "intermediate", "advanced"];

export default function AcademyPage() {
  const { locale } = useLocale();
  const [activeLevel, setActiveLevel] = useState<"basic" | "intermediate" | "advanced" | "all">("all");
  const [data, setData] = useState<AcademyIndexResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRequestError(null);
        const params = new URLSearchParams({
          lang: locale
        });
        if (activeLevel !== "all") {
          params.set("level", activeLevel);
        }
        const response = await fetch(`/api/academy?${params.toString()}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("Failed to load academy");
        }
        const payload = (await response.json()) as AcademyIndexResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setRequestError(
            locale === "ru"
              ? "Не удалось загрузить раздел обучения."
              : "Failed to load academy section."
          );
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
  }, [activeLevel, locale, reloadKey]);

  const grouped = useMemo(() => {
    const modules = data?.modules ?? [];
    return {
      basic: modules.filter((item) => item.level === "basic"),
      intermediate: modules.filter((item) => item.level === "intermediate"),
      advanced: modules.filter((item) => item.level === "advanced")
    };
  }, [data]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-3xl font-semibold text-slate-900">
          {locale === "ru" ? "Курс финансовой грамотности" : "Financial Literacy Academy"}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          {locale === "ru"
            ? "Полная программа: личные финансы, инвестиции, налоги, льготы, кредиты, ипотека, ЦФА и бизнес-финансы."
            : "Complete curriculum: personal finance, investing, taxes, benefits, loans, mortgage, digital assets, and business finance."}
        </p>
      </motion.div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveLevel("all")}
          className={`rounded-full px-3 py-1.5 text-sm ${activeLevel === "all" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
        >
          {locale === "ru" ? "Все уровни" : "All levels"}
        </button>
        {LEVEL_LABELS.map((level) => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              activeLevel === level ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {level === "basic"
              ? locale === "ru"
                ? "Базовый"
                : "Basic"
              : level === "intermediate"
                ? locale === "ru"
                  ? "Средний"
                  : "Intermediate"
                : locale === "ru"
                  ? "Продвинутый"
                  : "Advanced"}
          </button>
        ))}
      </div>

      {requestError ? (
        <div className="mt-4 space-y-2">
          <ActionErrorBanner message={requestError} />
          <RetryButton
            label={locale === "ru" ? "Повторить" : "Retry"}
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {locale === "ru" ? "Загружаем программу..." : "Loading curriculum..."}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {(activeLevel === "all" ? LEVEL_LABELS : [activeLevel]).map((level, sectionIndex) => (
            <motion.section
              key={level}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: sectionIndex * 0.06 }}
              className="space-y-3"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                {level === "basic"
                  ? locale === "ru"
                    ? "Уровень 1"
                    : "Level 1"
                  : level === "intermediate"
                    ? locale === "ru"
                      ? "Уровень 2"
                      : "Level 2"
                    : locale === "ru"
                      ? "Уровень 3"
                      : "Level 3"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {grouped[level].map((moduleItem, idx) => (
                  <motion.article
                    key={moduleItem.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
                  >
                    <h3 className="text-lg font-semibold text-slate-900">{moduleItem.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{moduleItem.summary}</p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                      {locale === "ru" ? "Уроков" : "Lessons"}: {moduleItem.lessonsCount}
                    </p>
                    <Link
                      href={`/academy/module/${moduleItem.slug}`}
                      className="mt-4 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {locale === "ru" ? "Открыть модуль" : "Open module"}
                    </Link>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </section>
  );
}

