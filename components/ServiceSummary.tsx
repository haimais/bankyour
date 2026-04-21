"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { SERVICE_CATEGORIES } from "@/data/services";
import { ServiceSummaryItem, ServiceType } from "@/lib/types";

interface ServiceSummaryProps {
  summary: ServiceSummaryItem[];
}

export function ServiceSummary({ summary }: ServiceSummaryProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const localeKey = locale === "ru" ? "ru" : "en";

  const labelMap = useMemo(() => {
    return SERVICE_CATEGORIES.reduce((acc, service) => {
      acc[service.key] = service.title[localeKey];
      return acc;
    }, {} as Record<ServiceType, string>);
  }, [localeKey]);

  if (summary.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8">
      <h3 className="mb-3 text-xl font-semibold text-slate-900">{copy.serviceSummaryTitle}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <article key={item.serviceType} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{labelMap[item.serviceType]}</p>
            <p className="mt-2 text-sm text-slate-600">
              {item.providerCount} {copy.providerCount}
            </p>
            <p className="text-sm text-slate-600">
              {item.offerCount} {copy.offersCount}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
