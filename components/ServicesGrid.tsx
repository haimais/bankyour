"use client";

import {
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Landmark,
  TrendingUp
} from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { SERVICE_CATEGORIES } from "@/data/services";
import { ServiceType } from "@/lib/types";

const ICON_MAP = {
  cards: CreditCard,
  loans: Landmark,
  deposits: TrendingUp,
  business: BriefcaseBusiness,
  documents: FileText
};

interface ServicesGridProps {
  onSelectService: (serviceType: ServiceType) => void;
}

export function ServicesGrid({ onSelectService }: ServicesGridProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const localeKey = locale === "ru" ? "ru" : "en";

  return (
    <section id="services" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-3xl font-semibold text-slate-900">{copy.servicesTitle}</h2>
        <p className="max-w-3xl text-slate-600">
          {copy.servicesSubtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_CATEGORIES.map((service, index) => (
          <ServiceCard
            key={service.key}
            title={service.title[localeKey]}
            description={service.description[localeKey]}
            ctaText={copy.viewOffers}
            icon={ICON_MAP[service.key]}
            index={index}
            onClick={() => onSelectService(service.key)}
          />
        ))}
      </div>
    </section>
  );
}
