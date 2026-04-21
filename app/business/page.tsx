"use client";

import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { BUSINESS_ARTICLES, getBusinessArticleBySlug } from "@/data/businessArticles";
import { UI_TEXT, getCountryLabel } from "@/data/i18n";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { BusinessArticle, BusinessBankItem, BusinessChatResponse, Country } from "@/lib/types";

interface BusinessArticlesListResponse {
  total: number;
  items: Array<Pick<BusinessArticle, "slug" | "title" | "summary" | "tags" | "updatedAt">>;
}

interface BusinessArticleDetailResponse {
  article: BusinessArticle;
}

interface BusinessBanksResponse {
  total: number;
  items: BusinessBankItem[];
}

const SERVICE_FILTERS: Array<{
  value: "" | BusinessBankItem["services"][number];
  ru: string;
  en: string;
}> = [
  { value: "", ru: "Все услуги", en: "All services" },
  { value: "rko", ru: "РКО", en: "Settlement account" },
  { value: "acquiring", ru: "Эквайринг", en: "Acquiring" },
  { value: "guarantees", ru: "Гарантии", en: "Guarantees" },
  { value: "leasing", ru: "Лизинг", en: "Leasing" },
  { value: "ved", ru: "ВЭД", en: "Foreign trade" },
  { value: "business_loans", ru: "Кредиты", en: "Business loans" },
  { value: "business_deposits", ru: "Вклады", en: "Business deposits" }
];

const BUSINESS_COUNTRY_PRESETS: Record<
  Country,
  {
    regulatorUrl: string;
    prioritiesRu: string[];
    prioritiesEn: string[];
    servicesRu: string[];
    servicesEn: string[];
    contentRu: string[];
    contentEn: string[];
  }
> = {
  russia: {
    regulatorUrl: "https://www.cbr.ru/banking_sector/",
    prioritiesRu: ["Регистрация бизнеса", "РКО и платежи", "Кредиты и гарантии", "ВЭД-контроль"],
    prioritiesEn: ["Business registration", "Settlement account", "Loans and guarantees", "FX compliance"],
    servicesRu: ["Эквайринг", "Лизинг", "Бухгалтерские сервисы", "Проверка контрагента"],
    servicesEn: ["Acquiring", "Leasing", "Accounting services", "Counterparty checks"],
    contentRu: ["Статьи о бизнесе", "Рейтинг банков для бизнеса", "Отзывы и кейсы"],
    contentEn: ["Business articles", "Business bank ranking", "Reviews and cases"]
  },
  belarus: {
    regulatorUrl: "https://www.nbrb.by/",
    prioritiesRu: ["Расчеты в BYN", "Экспорт/импорт", "Финансирование оборотки", "Налоговая дисциплина"],
    prioritiesEn: ["BYN settlements", "Export/import", "Working capital", "Tax discipline"],
    servicesRu: ["РКО", "Валютные счета", "Банковские гарантии", "Эквайринг"],
    servicesEn: ["Settlement account", "FX accounts", "Bank guarantees", "Acquiring"],
    contentRu: ["Чек-листы по документам", "Сценарии кассовых разрывов", "Шаблоны финансового плана"],
    contentEn: ["Document checklists", "Cash-gap scenarios", "Financial plan templates"]
  },
  kazakhstan: {
    regulatorUrl: "https://nationalbank.kz/",
    prioritiesRu: ["Платежные сервисы", "Тенговые кредиты", "Торговое финансирование", "Онлайн-кассы"],
    prioritiesEn: ["Payment services", "KZT loans", "Trade finance", "Online cash registers"],
    servicesRu: ["РКО", "Эквайринг", "Кредиты для МСБ", "Лизинг оборудования"],
    servicesEn: ["Settlement account", "Acquiring", "SME loans", "Equipment leasing"],
    contentRu: ["Гайды по запуску ТОО/ИП", "Матрица банковских тарифов", "FAQ по комплаенсу"],
    contentEn: ["LLP/sole startup guides", "Bank tariff matrix", "Compliance FAQ"]
  },
  georgia: {
    regulatorUrl: "https://nbg.gov.ge/",
    prioritiesRu: ["Открытие компании", "Мультивалютные счета", "Интернет-эквайринг", "Налоговый учет"],
    prioritiesEn: ["Company setup", "Multi-currency accounts", "Online acquiring", "Tax accounting"],
    servicesRu: ["РКО", "Торговые счета", "Бизнес-кредиты", "ВЭД-платежи"],
    servicesEn: ["Settlement account", "Merchant accounts", "Business loans", "Cross-border payments"],
    contentRu: ["Пошаговые карты запуска", "Риски договоров", "Сравнение банков"],
    contentEn: ["Launch roadmaps", "Contract risks", "Bank comparison"]
  },
  armenia: {
    regulatorUrl: "https://www.cba.am/",
    prioritiesRu: ["Регистрация ИП/ООО", "Счета для экспортных компаний", "Кредитование МСБ", "Валютные операции"],
    prioritiesEn: ["Business registration", "Accounts for exporters", "SME financing", "FX operations"],
    servicesRu: ["РКО", "Эквайринг", "Банковские гарантии", "Документарные операции"],
    servicesEn: ["Settlement account", "Acquiring", "Bank guarantees", "Documentary operations"],
    contentRu: ["Практика комплаенса", "Шаблоны заявок", "Чек-листы риска"],
    contentEn: ["Compliance practice", "Application templates", "Risk checklists"]
  },
  azerbaijan: {
    regulatorUrl: "https://www.cbar.az/page-42/banklar",
    prioritiesRu: ["Счета для бизнеса", "Платежная инфраструктура", "Кредиты и гарантии", "Импорт/экспорт расчеты"],
    prioritiesEn: ["Business accounts", "Payment infrastructure", "Loans and guarantees", "Import/export settlements"],
    servicesRu: ["РКО", "Эквайринг", "Лизинг", "Финансирование контрактов"],
    servicesEn: ["Settlement account", "Acquiring", "Leasing", "Contract financing"],
    contentRu: ["Статьи по бизнес-процессам", "Кейсы по cash-flow", "FAQ по банковским продуктам"],
    contentEn: ["Business process articles", "Cash-flow cases", "Bank product FAQ"]
  },
  uae: {
    regulatorUrl: "https://www.centralbank.ae/financial-system/licensed-financial-institutions/",
    prioritiesRu: ["Company setup (Mainland/Free Zone)", "Corporate account opening", "Merchant acquiring", "Cross-border compliance"],
    prioritiesEn: ["Company setup (Mainland/Free Zone)", "Corporate account opening", "Merchant acquiring", "Cross-border compliance"],
    servicesRu: ["Корпоративные счета", "Эквайринг", "Trade finance", "Лизинг и гарантии"],
    servicesEn: ["Corporate accounts", "Acquiring", "Trade finance", "Leasing and guarantees"],
    contentRu: ["Гайды по структуре компании", "Матрица банков по сегментам", "Документальные требования"],
    contentEn: ["Company structure guides", "Segmented bank matrix", "Documentation requirements"]
  }
};

export default function BusinessPage() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const countryLabel = getCountryLabel(country, locale);
  const countryPreset = BUSINESS_COUNTRY_PRESETS[country];
  const sectionTitles =
    locale === "ru"
      ? {
          priorities: "Приоритеты по стране",
          services: "Ключевые сервисы",
          content: "Контент и аналитика",
          regulator: "Регулятор и реестр банков"
        }
      : {
          priorities: "Country priorities",
          services: "Key services",
          content: "Content and analytics",
          regulator: "Regulator and bank registry"
        };
  const presetLinks = useMemo(
    () => ({
      priorities: [
        "/business#articles",
        "/services?category=business_services&q=rko",
        "/services?category=business_services&q=credit",
        "/services?category=document_assistance"
      ],
      services: [
        "/services?category=business_services&q=rko",
        "/services?category=business_services&q=acquiring",
        "/services?category=business_services&q=guarantee",
        "/services?category=business_services&q=leasing"
      ],
      content: [
        "/business#articles",
        "/business#business-banks",
        "/news?strictFinance=1"
      ]
    }),
    []
  );

  const [articles, setArticles] = useState<BusinessArticlesListResponse["items"]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [articleDetail, setArticleDetail] = useState<BusinessArticle | null>(null);
  const [banks, setBanks] = useState<BusinessBankItem[]>([]);
  const [banksServiceFilter, setBanksServiceFilter] = useState<
    "" | BusinessBankItem["services"][number]
  >("");
  const [banksQuery, setBanksQuery] = useState("");

  const [articleLoading, setArticleLoading] = useState(true);
  const [banksLoading, setBanksLoading] = useState(true);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "assistant" | "user"; content: string; mode?: "live" | "fallback" }>
  >([]);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadArticles() {
      try {
        setArticleError(null);
        const listResponse = await fetch(
          `/api/business/articles?lang=${locale}&country=${country}`,
          {
            cache: "no-store",
            signal: controller.signal
          }
        );
        if (!listResponse.ok) {
          throw new Error("Failed to load business articles");
        }
        const listPayload = (await listResponse.json()) as BusinessArticlesListResponse;
        if (cancelled) {
          return;
        }
        setArticles(listPayload.items);

        const nextSlug = selectedSlug || listPayload.items[0]?.slug;
        if (!nextSlug) {
          setArticleDetail(null);
          return;
        }

        const detailResponse = await fetch(
          `/api/business/articles/${encodeURIComponent(nextSlug)}?lang=${locale}&country=${country}`,
          {
            cache: "no-store",
            signal: controller.signal
          }
        );
        if (!detailResponse.ok) {
          throw new Error("Failed to load article detail");
        }
        const detailPayload = (await detailResponse.json()) as BusinessArticleDetailResponse;
        if (!cancelled) {
          setSelectedSlug(nextSlug);
          setArticleDetail(detailPayload.article);
        }
      } catch {
        if (!cancelled) {
          setArticles(
            BUSINESS_ARTICLES.map((item) => ({
              slug: item.slug,
              title: item.title,
              summary: item.summary,
              tags: item.tags,
              updatedAt: item.updatedAt
            }))
          );
          const fallbackArticle = getBusinessArticleBySlug(selectedSlug) ?? BUSINESS_ARTICLES[0] ?? null;
          setArticleDetail(fallbackArticle);
          setSelectedSlug(fallbackArticle?.slug ?? "");
          setArticleError(
            locale === "ru"
              ? "Не удалось загрузить статьи из API. Показан локальный набор."
              : "Could not load articles from API. Local fallback is shown."
          );
        }
      } finally {
        if (!cancelled) {
          setArticleLoading(false);
        }
      }
    }

    setArticleLoading(true);
    void loadArticles();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [country, locale, selectedSlug, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadBanks() {
      try {
        setBanksError(null);
        const params = new URLSearchParams({ country });
        if (banksServiceFilter) params.set("service", banksServiceFilter);
        if (banksQuery.trim()) params.set("q", banksQuery.trim());
        const response = await fetch(`/api/business/banks?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("Failed to load business banks");
        }
        const payload = (await response.json()) as BusinessBanksResponse;
        if (!cancelled) {
          setBanks(payload.items);
        }
      } catch {
        if (!cancelled) {
          setBanksError(
            locale === "ru"
              ? "Не удалось загрузить список банков."
              : "Failed to load banks list."
          );
        }
      } finally {
        if (!cancelled) {
          setBanksLoading(false);
        }
      }
    }

    setBanksLoading(true);
    void loadBanks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [country, locale, banksServiceFilter, banksQuery, reloadKey]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      return;
    }
    setChatMessages([
      {
        role: "assistant",
        content:
          locale === "ru"
            ? "Я бизнес-ассистент Bank-your. Могу разобрать статью, сравнить банки и дать практический чек-лист."
            : "I am your Bank-your business assistant. I can explain the article, compare banks, and give a practical checklist.",
        mode: "fallback"
      }
    ]);
  }, [chatMessages.length, locale]);

  async function sendChat() {
    const message = chatInput.trim();
    if (!message || chatLoading) {
      return;
    }
    setChatInput("");
    setChatError(null);
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/business/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          articleSlug: articleDetail?.slug,
          country,
          locale,
          serviceContext: "business_hub"
        })
      });
      if (!response.ok) {
        throw new Error("Failed to get assistant reply");
      }
      const payload = (await response.json()) as BusinessChatResponse;
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: payload.reply,
          mode: payload.metadata.mode
        }
      ]);
    } catch {
      setChatError(
        locale === "ru"
          ? "Не удалось получить ответ ассистента."
          : "Could not get assistant reply."
      );
    } finally {
      setChatLoading(false);
    }
  }

  async function openArticle(slug: string) {
    setSelectedSlug(slug);
    setArticleLoading(true);
    setArticleError(null);
    try {
      const response = await fetch(
        `/api/business/articles/${encodeURIComponent(slug)}?lang=${locale}&country=${country}`,
        {
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error("Failed to load article");
      }
      const payload = (await response.json()) as BusinessArticleDetailResponse;
      setArticleDetail(payload.article);
    } catch {
      const fallback = getBusinessArticleBySlug(slug);
      if (fallback) {
        setArticleDetail(fallback);
        setArticleError(
          locale === "ru"
            ? "Показана локальная версия статьи (API временно недоступен)."
            : "Local article version is shown (API temporarily unavailable)."
        );
      } else {
        setArticleError(locale === "ru" ? "Не удалось открыть статью." : "Could not open article.");
      }
    } finally {
      setArticleLoading(false);
    }
  }

  const serviceFilterOptions = useMemo(
    () =>
      SERVICE_FILTERS.map((item) => ({
        value: item.value,
        label: locale === "ru" ? item.ru : item.en
      })),
    [locale]
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
      >
        <h1 className="text-3xl font-semibold text-slate-900">
          {locale === "ru" ? `Business Hub — ${countryLabel}` : `Business Hub — ${countryLabel}`}
        </h1>
        <p className="mt-2 text-slate-600">
          {locale === "ru"
            ? `Большие статьи, AI-навигация и список банков для бизнеса в ${countryLabel}.`
            : `Long-form guides, AI navigation, and business banks list in ${countryLabel}.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/calculators/business"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {locale === "ru" ? "Бизнес-калькулятор" : "Business calculator"}
          </Link>
          <Link
            href="/services?category=business_services"
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            {locale === "ru" ? "Каталог бизнес-услуг" : "Business services catalog"}
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.05 }}
        className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:grid-cols-3"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {sectionTitles.priorities}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
            {(locale === "ru" ? countryPreset.prioritiesRu : countryPreset.prioritiesEn).map((item, index) => (
              <li key={`${country}-priority-${item}`}>
                <Link href={presetLinks.priorities[index] ?? "/services?category=business_services"} className="underline-offset-2 hover:text-blue-700 hover:underline">
                  • {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {sectionTitles.services}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
            {(locale === "ru" ? countryPreset.servicesRu : countryPreset.servicesEn).map((item, index) => (
              <li key={`${country}-service-${item}`}>
                <Link href={presetLinks.services[index] ?? "/services?category=business_services"} className="underline-offset-2 hover:text-blue-700 hover:underline">
                  • {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {sectionTitles.content}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
            {(locale === "ru" ? countryPreset.contentRu : countryPreset.contentEn).map((item, index) => (
              <li key={`${country}-content-${item}`}>
                <Link href={presetLinks.content[index] ?? "/business"} className="underline-offset-2 hover:text-blue-700 hover:underline">
                  • {item}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={countryPreset.regulatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700"
          >
            {sectionTitles.regulator}
            <ExternalLink size={13} />
          </a>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr_1.1fr]">
        <section id="articles" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {locale === "ru" ? "Статьи" : "Articles"}
            </h2>
            <button
              onClick={() => setReloadKey((prev) => prev + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} />
              {locale === "ru" ? "Обновить" : "Refresh"}
            </button>
          </div>
          {articleError ? <ActionErrorBanner message={articleError} /> : null}
          <div className="space-y-2">
            {articles.map((item) => (
              <button
                key={item.slug}
                onClick={() => void openArticle(item.slug)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedSlug === item.slug
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p>
              </button>
            ))}
            {!articleLoading && articles.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {locale === "ru" ? "Статьи не найдены." : "No articles found."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          {articleLoading ? (
            <p className="text-sm text-slate-600">
              {locale === "ru" ? "Загружаем статью..." : "Loading article..."}
            </p>
          ) : !articleDetail ? (
            <div className="space-y-2">
              <ActionErrorBanner
                message={
                  locale === "ru" ? "Статья временно недоступна." : "Article is temporarily unavailable."
                }
              />
              <RetryButton
                label={locale === "ru" ? "Повторить" : "Retry"}
                onClick={() => setReloadKey((prev) => prev + 1)}
              />
            </div>
          ) : (
            <article className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{articleDetail.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{articleDetail.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {copy.updatedAt}: {new Date(articleDetail.updatedAt).toLocaleString()}
                </p>
              </div>

              {articleDetail.sections.map((section) => (
                <section key={section.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                  <div className="space-y-2">
                    {section.content.map((line, index) => (
                      <p key={`${section.id}-line-${index}`} className="text-sm leading-6 text-slate-700">
                        {line}
                      </p>
                    ))}
                  </div>
                  {section.formula ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800">
                      <p className="font-semibold">{section.formula.expression}</p>
                      <p className="mt-1 text-slate-700">{section.formula.explanation}</p>
                    </div>
                  ) : null}
                  {section.checklist && section.checklist.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {section.checklist.map((item, index) => (
                        <li key={`${section.id}-check-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}

              <section>
                <h3 className="text-lg font-semibold text-slate-900">FAQ</h3>
                <div className="mt-3 space-y-2">
                  {articleDetail.faq.map((item, index) => (
                    <div key={`${articleDetail.slug}-faq-${index}`} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{item.question}</p>
                      <p className="mt-1 text-sm text-slate-700">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-slate-900">
                  {locale === "ru" ? "Действия" : "Actions"}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {articleDetail.actions.map((item) => {
                    const isExternal = /^https?:\/\//i.test(item.href);
                    if (isExternal) {
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {item.label}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </section>
            </article>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">
              {locale === "ru" ? "AI-чат по бизнесу" : "Business AI chat"}
            </h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {chatMessages.map((item, index) => (
                <div
                  key={`biz-chat-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    item.role === "assistant"
                      ? "border border-blue-100 bg-blue-50 text-slate-800"
                      : "bg-white text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-5">{item.content}</p>
                  {item.mode ? (
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                      {item.mode}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {chatError ? <div className="mt-2"><ActionErrorBanner message={chatError} /></div> : null}
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={locale === "ru" ? "Задайте вопрос по статье..." : "Ask about this article..."}
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendChat();
                  }
                }}
              />
              <button
                onClick={() => void sendChat()}
                disabled={chatLoading}
                className="inline-flex h-10 items-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send size={14} />
                {locale === "ru" ? "Отправить" : "Send"}
              </button>
            </div>
          </div>

          <div id="business-banks" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">
              {locale === "ru" ? "Банки для бизнеса" : "Business banks"}
            </h2>
            <div className="mt-3 grid gap-2">
              <select
                value={banksServiceFilter}
                onChange={(event) =>
                  setBanksServiceFilter(event.target.value as "" | BusinessBankItem["services"][number])
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
              >
                {serviceFilterOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={banksQuery}
                onChange={(event) => setBanksQuery(event.target.value)}
                placeholder={locale === "ru" ? "Поиск банка..." : "Search bank..."}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
              />
            </div>
            {banksError ? <div className="mt-3"><ActionErrorBanner message={banksError} /></div> : null}
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
              {banks.map((bank) => {
                const website = getValidExternalUrl(bank.website);
                return (
                  <article key={bank.bankId} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{bank.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bank.services.map((service) => (
                        <span
                          key={`${bank.bankId}-${service}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700"
                      >
                        {locale === "ru" ? "Официальный сайт" : "Official website"}
                        <ExternalLink size={13} />
                      </a>
                    ) : null}
                  </article>
                );
              })}
              {!banksLoading && banks.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {locale === "ru" ? "Банки не найдены." : "No banks found."}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
