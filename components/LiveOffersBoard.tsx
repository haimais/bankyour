"use client";

import { useEffect, useMemo, useState } from "react";
import { OffersSection } from "@/components/OffersSection";
import { ProvidersCatalog } from "@/components/ProvidersCatalog";
import { ServiceSummary } from "@/components/ServiceSummary";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { SERVICE_CATEGORIES } from "@/data/services";
import {
  CountryOffers,
  ProviderCatalogItem,
  ServiceSummaryItem,
  ServiceType,
  ServicesApiResponse
} from "@/lib/types";

const REFRESH_INTERVAL_MS = 60_000;

interface LiveOffersBoardProps {
  visibleServices?: ServiceType[];
}

function createEmptyOffers(): CountryOffers {
  return {
    cards: [],
    loans: [],
    deposits: [],
    business: [],
    documents: []
  };
}

function formatTimestamp(value: string, locale: string): string {
  const date = new Date(value);
  const localeMap: Record<string, string> = {
    ru: "ru-RU",
    en: "en-US",
    hy: "hy-AM",
    be: "be-BY",
    kk: "kk-KZ",
    ka: "ka-GE",
    az: "az-AZ",
    ar: "ar-AE",
    tr: "tr-TR"
  };
  return new Intl.DateTimeFormat(localeMap[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function LiveOffersBoard({ visibleServices }: LiveOffersBoardProps) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<CountryOffers>(createEmptyOffers());
  const [providers, setProviders] = useState<ProviderCatalogItem[]>([]);
  const [summary, setSummary] = useState<ServiceSummaryItem[]>([]);
  const [response, setResponse] = useState<ServicesApiResponse | null>(null);

  const categories = useMemo(() => {
    if (!visibleServices || visibleServices.length === 0) {
      return SERVICE_CATEGORIES;
    }

    return SERVICE_CATEGORIES.filter((category) =>
      visibleServices.includes(category.key)
    );
  }, [visibleServices]);

  const visibleSummary = useMemo(() => {
    const visibleKeys = new Set(categories.map((category) => category.key));
    return summary.filter((item) => visibleKeys.has(item.serviceType));
  }, [categories, summary]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/services?country=${country}&locale=${locale}`, {
          cache: "no-store"
        });

        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }

        const data = (await res.json()) as ServicesApiResponse;
        if (cancelled) {
          return;
        }

        setOffers(data.offers);
        setProviders(data.providers);
        setSummary(data.summary);
        setResponse(data);
      } catch {
        if (cancelled) {
          return;
        }
        setOffers(createEmptyOffers());
        setProviders([]);
        setSummary([]);
        setResponse(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setOffers(createEmptyOffers());
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [country, locale]);

  const sourceLabel = useMemo(() => {
    if (!response) {
      return copy.fallbackStatus;
    }

    if (response.sourceStatus === "live") {
      return copy.liveStatus;
    }

    if (response.sourceStatus === "mixed") {
      return copy.mixedStatus;
    }

    return copy.fallbackStatus;
  }, [copy, response]);

  return (
    <div className="bg-fintech-grid bg-[size:22px_22px]">
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-blue-100 bg-white/80 p-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{sourceLabel}</span>
          {loading && <span className="ml-2">{copy.loadingOffers}</span>}
          {response?.fetchedAt && (
            <span className="ml-2">
              {copy.updatedAt}: {formatTimestamp(response.fetchedAt, locale)}
            </span>
          )}
        </div>
      </div>

      <ServiceSummary summary={visibleSummary} />
      <ProvidersCatalog providers={providers} />

      {categories.map((service) => (
        <OffersSection
          key={service.key}
          service={service}
          offers={offers[service.key]}
          meta={response?.meta[service.key]}
        />
      ))}
    </div>
  );
}
