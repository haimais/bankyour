"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT, getCountryLabel } from "@/data/i18n";
import { getCategoryTranslation } from "@/lib/i18n/serviceTranslations";
import { ProductItem, ServiceType, LanguageCode, ProductCategory } from "@/lib/types";
import { CatalogProductCard } from "./CatalogProductCard";

interface CatalogExplorerClientProps {
  country: string;
  serviceType: ServiceType;
  initialProviders: ProductItem[];
}

export function CatalogExplorerClient({
  country,
  serviceType,
  initialProviders
}: CatalogExplorerClientProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const countryLabel = getCountryLabel(country as "russia" | "armenia" | "belarus" | "kazakhstan" | "georgia" | "azerbaijan" | "uae", locale);

  const [expandedCategory, setExpandedCategory] = useState<ProductCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [providers, setProviders] = useState(initialProviders);
  const [loading, setLoading] = useState(false);

  // Group providers by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<ProductCategory, ProductItem[]> = {
      debit_cards: [],
      credit_cards: [],
      consumer_loans: [],
      mortgages: [],
      deposits: [],
      investments: [],
      business_services: [],
      document_assistance: []
    };

    for (const provider of providers) {
      if (groups[provider.category]) {
        groups[provider.category].push(provider);
      }
    }

    return groups;
  }, [providers]);

  // Filter and search
  const filteredProviders = useMemo(() => {
    if (!searchTerm) return providers;

    const searchLower = searchTerm.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
    );
  }, [providers, searchTerm]);

  // Refresh data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/catalog?country=${country}&service=${serviceType}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load catalog");
        }

        const data = await response.json();
        if (!cancelled) {
          setProviders(data.items || initialProviders);
        }
      } catch {
        if (!cancelled) {
          // Error state intentionally not shown
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [country, serviceType, initialProviders]);

  const categories = Object.keys(groupedByCategory) as ProductCategory[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          {copy.providersTitle} · {countryLabel}
        </h2>
        <p className="text-slate-600">{copy.providerCatalogNote}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={copy.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-4 py-2 placeholder-slate-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 size={16} className="animate-spin" />
          {locale === "ru" ? "Загрузка..." : "Loading..."}
        </div>
      )}

      {/* Categories - Collapsible */}
      {!loading && categories.length > 0 && (
        <div className="space-y-4">
          {categories.map((category) => {
            const items = groupedByCategory[category] || [];
            const categoryTitle = getCategoryTranslation(category, locale as LanguageCode);
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="rounded-lg border border-slate-200">
                {/* Category Header */}
                <button
                  onClick={() =>
                    setExpandedCategory(isExpanded ? null : category)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">{categoryTitle}</h3>
                    <p className="text-sm text-slate-600">
                      {items.length} {locale === "ru" ? "предложений" : "offers"}
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`transition ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4">
                    <div className="space-y-3">
                      {items.map((provider) => (
                        <CatalogProductCard
                          key={provider.id}
                          item={provider}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProviders.length === 0 && (
        <div className="rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-slate-600">
            {searchTerm ? copy.noSearchResults : copy.noOffers}
          </p>
        </div>
      )}
    </div>
  );
}
