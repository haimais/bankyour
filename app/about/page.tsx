"use client";

import { motion } from "framer-motion";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { getCountryLabel, UI_TEXT } from "@/data/i18n";

export default function AboutPage() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const countryLabel = getCountryLabel(country, locale);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card"
      >
        <h1 className="mb-3 text-3xl font-semibold text-slate-900">{copy.aboutTitle}</h1>
        <p className="max-w-4xl leading-7 text-slate-600">{copy.aboutBody}</p>
      </motion.div>

      <motion.div
        id="privacy"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-card"
      >
        <h2 className="mb-3 text-2xl font-semibold text-slate-900">{copy.footerPrivacy}</h2>
        <p className="leading-7 text-slate-600">
          {copy.footerDisclaimer} {countryLabel}.{" "}
          {locale === "ru"
            ? "Мы не собираем чувствительные данные в чате ассистента и всегда направляем пользователей на официальные сайты провайдеров для оформления."
            : "We do not collect sensitive data in the assistant chat and always redirect users to official provider websites for applications."}
        </p>
      </motion.div>
    </section>
  );
}
