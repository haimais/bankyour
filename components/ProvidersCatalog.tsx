"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { SERVICE_CATEGORIES } from "@/data/services";
import { ProviderCatalogItem, ServiceType } from "@/lib/types";

interface ProvidersCatalogProps {
  providers: ProviderCatalogItem[];
}

export function ProvidersCatalog({ providers }: ProvidersCatalogProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const localeKey = locale === "ru" ? "ru" : "en";

  const labelMap = useMemo(() => {
    return SERVICE_CATEGORIES.reduce((acc, service) => {
      acc[service.key] = service.title[localeKey];
      return acc;
    }, {} as Record<ServiceType, string>);
  }, [localeKey]);

  if (providers.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      <h3 className="text-xl font-semibold text-slate-900">{copy.providersTitle}</h3>
      <p className="mt-1 text-sm text-slate-600">{copy.providerCatalogNote}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <article key={provider.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold text-slate-900">{provider.name}</p>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 transition hover:text-blue-600"
                >
                  {copy.providerWebsite}
                </a>
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                {copy.servicesCovered}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                  >
                    {labelMap[service]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
