"use client";

import { motion } from "framer-motion";
import { UI_TEXT } from "@/data/i18n";
import { Locale } from "@/lib/types";

interface HeroSectionProps {
  countryLabel: string;
  locale: Locale;
  onExploreServices: () => void;
  onOpenAssistant: () => void;
}

export function HeroSection({
  countryLabel,
  locale,
  onExploreServices,
  onOpenAssistant
}: HeroSectionProps) {
  const copy = UI_TEXT[locale];

  return (
    <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex w-fit rounded-full border border-blue-200 bg-white px-4 py-1 text-sm font-medium text-blue-700"
        >
          {copy.heroChip}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="max-w-3xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl"
        >
          {copy.heroTitle} {countryLabel}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="max-w-2xl text-lg text-slate-600"
        >
          {copy.heroSubtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="flex flex-wrap gap-3"
        >
          <button
            onClick={onExploreServices}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {copy.exploreServices}
          </button>
          <button
            onClick={onOpenAssistant}
            className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            {copy.talkToAssistant}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
