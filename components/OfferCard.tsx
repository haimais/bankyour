"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, CreditCard, ExternalLink, FileText, Info, Landmark, TrendingUp } from "lucide-react";
import { useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { Offer } from "@/lib/types";

interface OfferCardProps {
  offer: Offer;
  index: number;
}

export function OfferCard({ offer, index }: OfferCardProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const [showDetails, setShowDetails] = useState(false);
  const providerUrl = getValidExternalUrl(offer.url);
  const serviceIconMap = {
    cards: CreditCard,
    loans: Landmark,
    deposits: TrendingUp,
    business: BriefcaseBusiness,
    documents: FileText
  };
  const ServiceIcon = serviceIconMap[offer.serviceType];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {offer.providerName}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{offer.name}</h3>
          </div>
        </div>
        <div className="rounded-full bg-blue-50 p-2 text-blue-700">
          <ServiceIcon size={16} />
        </div>
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-600">{offer.description}</p>

      <dl className="mb-4 grid gap-2 sm:grid-cols-2">
        {offer.params.map((param) => (
          <div key={param.label} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {param.label}
            </dt>
            <dd className="text-sm font-semibold text-slate-800">{param.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
        >
          <Info size={16} />
          {copy.moreDetails}
        </button>
        {providerUrl ? (
          <a
            href={providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <ExternalLink size={16} />
            {copy.providerWebsite}
          </a>
        ) : (
          <span
            title={locale === "ru" ? "Ссылка временно недоступна" : "Link temporarily unavailable"}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
          >
            <ExternalLink size={16} />
            {copy.providerWebsite}
          </span>
        )}
      </div>

      {!providerUrl ? (
        <div className="mt-3">
          <ActionErrorBanner
            message={locale === "ru" ? "Ссылка на провайдера временно недоступна." : "Provider link is temporarily unavailable."}
          />
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-6 text-slate-700">
              {offer.details}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
