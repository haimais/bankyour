"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { getCategoryLabel, getCountryLabel } from "@/data/i18n";
import { CoverageReportResponse, CountryCoverageReport, ProductCategory } from "@/lib/types";

const REFRESH_MS = 180_000;

const LABELS: Record<string, Record<string, string>> = {
  title: {
    ru: "Покрытие банков и офферов",
    en: "Banks & offers coverage",
    hy: "Բանկերի և առաջարկների ծածկույթ",
    be: "Пакрыццё банкаў і прапаноў",
    kk: "Банктер мен ұсыныстар қамтуы",
    ka: "ბანკებისა და შეთავაზებების დაფარვა",
    az: "Banklar və təkliflər üzrə əhatə",
    ar: "تغطية البنوك والعروض",
    tr: "Banka ve teklif kapsamı"
  },
  subtitle: {
    ru: "Отчет по всем странам: банки из реестра, покрытие предложениями, источники и категории.",
    en: "All-country report: registry banks, offers coverage, sources, and categories.",
    hy: "Բոլոր երկրների հաշվետվություն՝ ռեգիստրի բանկեր, առաջարկների ծածկույթ, աղբյուրներ և կատեգորիաներ։",
    be: "Справаздача па ўсіх краінах: банкі рэестра, пакрыццё прапановамі, крыніцы і катэгорыі.",
    kk: "Барлық елдер бойынша есеп: тізілім банктері, ұсыныстар қамтуы, дереккөздер және санаттар.",
    ka: "ანგარიში ყველა ქვეყნისთვის: რეესტრის ბანკები, შეთავაზებების დაფარვა, წყაროები და კატეგორიები.",
    az: "Bütün ölkələr üzrə hesabat: reyestr bankları, təklif əhatəsi, mənbələr və kateqoriyalar.",
    ar: "تقرير لجميع الدول: بنوك السجل، تغطية العروض، المصادر والفئات.",
    tr: "Tüm ülkeler için rapor: kayıt bankaları, teklif kapsamı, kaynaklar ve kategoriler."
  },
  banks: {
    ru: "Банки",
    en: "Banks",
    hy: "Բանկեր",
    be: "Банкі",
    kk: "Банктер",
    ka: "ბანკები",
    az: "Banklar",
    ar: "البنوك",
    tr: "Bankalar"
  },
  covered: {
    ru: "с покрытием",
    en: "covered",
    hy: "ծածկույթով",
    be: "з пакрыццём",
    kk: "қамтылған",
    ka: "დაფარული",
    az: "əhatə olunub",
    ar: "مشمولة",
    tr: "kapsamda"
  },
  products: {
    ru: "Офферы",
    en: "Offers",
    hy: "Առաջարկներ",
    be: "Прапановы",
    kk: "Ұсыныстар",
    ka: "შეთავაზებები",
    az: "Təkliflər",
    ar: "العروض",
    tr: "Teklifler"
  },
  source: {
    ru: "Источники",
    en: "Sources",
    hy: "Աղբյուրներ",
    be: "Крыніцы",
    kk: "Дереккөздер",
    ka: "წყაროები",
    az: "Mənbələr",
    ar: "المصادر",
    tr: "Kaynaklar"
  },
  coverage: {
    ru: "Статус покрытия",
    en: "Coverage status",
    hy: "Ծածկույթի կարգավիճակ",
    be: "Статус пакрыцця",
    kk: "Қамту статусы",
    ka: "დაფარვის სტატუსი",
    az: "Əhatə statusu",
    ar: "حالة التغطية",
    tr: "Kapsam durumu"
  },
  categories: {
    ru: "Категории",
    en: "Categories",
    hy: "Կատեգորիաներ",
    be: "Катэгорыі",
    kk: "Санаттар",
    ka: "კატეგორიები",
    az: "Kateqoriyalar",
    ar: "الفئات",
    tr: "Kategoriler"
  },
  stale: {
    ru: "устарело",
    en: "stale",
    hy: "հնացած",
    be: "састарэла",
    kk: "ескірген",
    ka: "მოძველებული",
    az: "köhnəlib",
    ar: "قديم",
    tr: "eski"
  },
  fresh: {
    ru: "актуально",
    en: "fresh",
    hy: "ակտուալ",
    be: "актуальна",
    kk: "жаңа",
    ka: "აქტუალური",
    az: "aktual",
    ar: "محدث",
    tr: "güncel"
  },
  full: {
    ru: "полное",
    en: "full",
    hy: "լիարժեք",
    be: "поўнае",
    kk: "толық",
    ka: "სრული",
    az: "tam",
    ar: "كامل",
    tr: "tam"
  },
  partial: {
    ru: "частичное",
    en: "partial",
    hy: "մասնակի",
    be: "частковае",
    kk: "ішінара",
    ka: "ნაწილობრივი",
    az: "qismən",
    ar: "جزئي",
    tr: "kısmi"
  },
  registry: {
    ru: "только реестр",
    en: "registry only",
    hy: "միայն ռեգիստր",
    be: "толькі рэестр",
    kk: "тек тізілім",
    ka: "მხოლოდ რეესტრი",
    az: "yalnız reyestr",
    ar: "السجل فقط",
    tr: "yalnız kayıt"
  },
  updatedAt: {
    ru: "Обновлено",
    en: "Updated",
    hy: "Թարմացվել է",
    be: "Абноўлена",
    kk: "Жаңартылды",
    ka: "განახლდა",
    az: "Yeniləndi",
    ar: "تم التحديث",
    tr: "Güncellendi"
  },
  loading: {
    ru: "Загружаем отчет покрытия...",
    en: "Loading coverage report...",
    hy: "Բեռնվում է ծածկույթի հաշվետվությունը...",
    be: "Загружаем справаздачу пакрыцця...",
    kk: "Қамту есебі жүктелуде...",
    ka: "დაფარვის ანგარიში იტვირთება...",
    az: "Əhatə hesabatı yüklənir...",
    ar: "جارٍ تحميل تقرير التغطية...",
    tr: "Kapsam raporu yükleniyor..."
  },
  requestFailed: {
    ru: "Не удалось загрузить отчет покрытия.",
    en: "Failed to load coverage report.",
    hy: "Չհաջողվեց բեռնել ծածկույթի հաշվետվությունը։",
    be: "Не ўдалося загрузіць справаздачу пакрыцця.",
    kk: "Қамту есебін жүктеу сәтсіз аяқталды.",
    ka: "დაფარვის ანგარიშის ჩატვირთვა ვერ მოხერხდა.",
    az: "Əhatə hesabatını yükləmək mümkün olmadı.",
    ar: "تعذر تحميل تقرير التغطية.",
    tr: "Kapsam raporu yüklenemedi."
  },
  retry: {
    ru: "Повторить",
    en: "Retry",
    hy: "Կրկնել",
    be: "Паўтарыць",
    kk: "Қайталау",
    ka: "გამეორება",
    az: "Yenidən",
    ar: "إعادة المحاولة",
    tr: "Yeniden dene"
  }
};

function txt(locale: string, key: keyof typeof LABELS): string {
  return LABELS[key][locale] ?? LABELS[key].en;
}

function toLocaleDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const map: Record<string, string> = {
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
  return new Intl.DateTimeFormat(map[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

const CATEGORY_ORDER: ProductCategory[] = [
  "debit_cards",
  "credit_cards",
  "consumer_loans",
  "mortgages",
  "deposits",
  "investments",
  "business_services",
  "document_assistance"
];

export function CoverageReport() {
  const { locale } = useLocale();
  const { country } = useCountry();
  const [rows, setRows] = useState<CountryCoverageReport[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setRequestError(null);
        const response = await fetch("/api/coverage", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Coverage API failed");
        }
        const payload = (await response.json()) as CoverageReportResponse;
        if (cancelled) return;
        setRows(payload.countries);
        setGeneratedAt(payload.generatedAt);
      } catch {
        if (!cancelled) {
          setRows([]);
          setRequestError(txt(locale, "requestFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locale, reloadKey]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.banks += row.banksTotal;
        acc.covered += row.banksCovered;
        acc.products += row.productsTotal;
        return acc;
      },
      { banks: 0, covered: 0, products: 0 }
    );
  }, [rows]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{txt(locale, "title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{txt(locale, "subtitle")}</p>
        </div>
        <p className="text-xs text-slate-500">
          {txt(locale, "updatedAt")}: {generatedAt ? toLocaleDate(generatedAt, locale) : "—"}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {txt(locale, "loading")}
        </div>
      ) : null}

      {requestError ? (
        <div className="mb-4 space-y-2">
          <ActionErrorBanner message={requestError} />
          <RetryButton
            label={txt(locale, "retry")}
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          />
        </div>
      ) : null}

      {!loading ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{txt(locale, "banks")}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{totals.banks}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{txt(locale, "covered")}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{totals.covered}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{txt(locale, "products")}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{totals.products}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => {
          const isCurrent = row.country === country;
          return (
            <article
              key={row.country}
              className={`rounded-xl border px-4 py-3 ${
                isCurrent ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {getCountryLabel(row.country, locale)}
                </h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    row.stale ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {row.stale ? txt(locale, "stale") : txt(locale, "fresh")}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {txt(locale, "banks")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {row.banksCovered}/{row.banksTotal}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {txt(locale, "products")}:{" "}
                  <span className="font-semibold text-slate-900">{row.productsTotal}</span>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {txt(locale, "updatedAt")}:{" "}
                  <span className="font-semibold text-slate-900">{toLocaleDate(row.updatedAt, locale)}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{txt(locale, "source")}</p>
                  <p className="text-slate-700">
                    Sravni: <span className="font-semibold text-slate-900">{row.sources.sravni}</span>
                  </p>
                  <p className="text-slate-700">
                    Bank-site: <span className="font-semibold text-slate-900">{row.sources.bankSite}</span>
                  </p>
                  <p className="text-slate-700">
                    Fallback: <span className="font-semibold text-slate-900">{row.sources.fallback}</span>
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{txt(locale, "coverage")}</p>
                  <p className="text-slate-700">
                    {txt(locale, "full")}: <span className="font-semibold text-slate-900">{row.coverage.full}</span>
                  </p>
                  <p className="text-slate-700">
                    {txt(locale, "partial")}:{" "}
                    <span className="font-semibold text-slate-900">{row.coverage.partial}</span>
                  </p>
                  <p className="text-slate-700">
                    {txt(locale, "registry")}:{" "}
                    <span className="font-semibold text-slate-900">{row.coverage.registryOnly}</span>
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{txt(locale, "categories")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_ORDER.map((category) => {
                    const count = row.categories[category] ?? 0;
                    return (
                      <span
                        key={`${row.country}-${category}`}
                        className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {getCategoryLabel(category, locale)}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
