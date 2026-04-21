"use client";

import { motion } from "framer-motion";
import { OfferCard } from "@/components/OfferCard";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { ServiceCategory } from "@/data/services";
import { Offer, ServiceFetchMeta } from "@/lib/types";

interface OffersSectionProps {
  service: ServiceCategory;
  offers: Offer[];
  meta?: ServiceFetchMeta;
}

export function OffersSection({ service, offers, meta }: OffersSectionProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const localeKey = locale === "ru" ? "ru" : "en";

  return (
    <motion.section
      id={service.anchor}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mb-5">
        <h3 className="text-2xl font-semibold text-slate-900">{service.title[localeKey]}</h3>
        <p className="mt-1 max-w-3xl text-slate-600">{service.description[localeKey]}</p>
        {meta && (
          <p className="mt-2 text-sm text-slate-500">
            {meta.provider} · {meta.status === "live" ? copy.liveStatus : copy.fallbackStatus} ·{" "}
            {meta.providerCount} {copy.providerCount}
          </p>
        )}
      </div>

      {offers.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {offers.map((offer, index) => (
            <OfferCard key={offer.id} offer={offer} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {copy.noOffers}
        </div>
      )}
    </motion.section>
  );
}
