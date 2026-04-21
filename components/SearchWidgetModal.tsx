"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { UI_TEXT } from "@/data/i18n";

interface SearchWidgetPayload {
  query: string;
  suggestions: string[];
  intents: string[];
  groups: {
    products: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: string;
    }>;
    news: Array<{
      id: string;
      title: string;
      subtitle: string;
      articleUrl: string;
    }>;
    academy: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string;
    }>;
  };
}

interface SearchWidgetModalProps {
  open: boolean;
  onClose: () => void;
}

function sectionTitle(locale: string, section: "products" | "news" | "academy") {
  if (locale === "ru") {
    if (section === "products") return "Продукты";
    if (section === "news") return "Новости";
    return "Обучение";
  }
  if (section === "products") return "Products";
  if (section === "news") return "News";
  return "Academy";
}

export function SearchWidgetModal({ open, onClose }: SearchWidgetModalProps) {
  const router = useRouter();
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchWidgetPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setRequestError(null);
        const response = await fetch(
          `/api/search/widget?country=${country}&lang=${locale}&q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load search widget");
        }
        const payload = (await response.json()) as SearchWidgetPayload;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setRequestError(
            locale === "ru"
              ? "Не удалось загрузить виджет поиска."
              : "Failed to load search widget."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, query.trim().length > 0 ? 260 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, country, locale, query, reloadKey]);

  const suggestions = useMemo(() => data?.suggestions ?? [], [data?.suggestions]);

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-slate-900/50 p-3 sm:p-6"
      >
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          className="glass-card mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-card"
        >
          <header className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && query.trim()) {
                      onClose();
                      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                    }
                  }}
                  placeholder={copy.searchPlaceholder}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label={locale === "ru" ? "Закрыть поиск" : "Close search"}
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {requestError ? (
              <div className="mb-3">
                <ActionErrorBanner message={requestError} />
                <button
                  onClick={() => setReloadKey((prev) => prev + 1)}
                  className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {locale === "ru" ? "Повторить" : "Retry"}
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`search-skeleton-${index}`}
                    className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : null}

            {!loading && data ? (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {locale === "ru" ? "Подсказки" : "Suggestions"}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setQuery(item)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {sectionTitle(locale, "products")}
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {data.groups.products.map((item) => (
                      <Link
                        key={item.id}
                        href={`/services?category=${item.category}&q=${encodeURIComponent(item.title)}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-blue-50"
                        onClick={onClose}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="truncate text-xs text-slate-600">{item.subtitle}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {sectionTitle(locale, "news")}
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {data.groups.news.map((item) => (
                      <Link
                        key={item.id}
                        href={`/pulse/${item.id}?country=${country}&lang=${locale}&url=${encodeURIComponent(item.articleUrl)}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-blue-50"
                        onClick={onClose}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-600">{item.subtitle}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {sectionTitle(locale, "academy")}
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {data.groups.academy.map((item) => (
                      <Link
                        key={item.id}
                        href={`/academy/lesson/${item.slug}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-blue-50"
                        onClick={onClose}
                      >
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="line-clamp-2 text-xs text-slate-600">{item.subtitle}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
