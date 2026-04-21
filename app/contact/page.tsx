"use client";

import { motion } from "framer-motion";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { getCountryLabel, UI_TEXT } from "@/data/i18n";

export default function ContactPage() {
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
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">{copy.contactTitle}</h1>
        <p className="mb-6 max-w-3xl text-slate-600">{copy.contactSubtitle}</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">{copy.contactEmail}</p>
            <p className="mt-1 text-slate-800">hello@bank-your.example</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">{copy.contactPhone}</p>
            <p className="mt-1 text-slate-800">+971 000 0000</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {copy.currentMarket}
            </p>
            <p className="mt-1 text-slate-800">{countryLabel}</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
