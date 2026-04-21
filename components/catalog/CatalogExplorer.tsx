"use client";

import { motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { CATEGORY_CONFIG } from "@/data/catalog";
import { UI_TEXT, getCategoryLabel } from "@/data/i18n";
import { CatalogResponse, ProductCategory, ProductItem } from "@/lib/types";

interface CatalogExplorerProps {
  initialCategory?: ProductCategory;
  initialQuery?: string;
}

interface CatalogBankGroup {
  bankId: string;
  bankName: string;
  bankLogoUrl: string;
  offersCount: number;
  registryStatus: "active" | "suspended" | "unknown";
  hasOffers: boolean;
  sources: Array<"sravni" | "bank_site" | "registry_fallback">;
  topHighlights: string[];
}

interface BankGroupsApiResponse {
  snapshotId: string;
  updatedAt: string;
  totalBanks: number;
  banks: CatalogBankGroup[];
}

interface BankProductsApiResponse {
  snapshotId: string;
  updatedAt: string;
  total: number;
  products: CatalogResponse["products"];
}

type SortOption = "" | "rate_asc" | "rate_desc" | "fee_asc" | "fee_desc";

const PAGE_SIZE = 20;
const GROUP_PAGE_SIZE = 60;

const LOCAL_LABELS: Record<string, Record<string, string>> = {
  currency: {
    ru: "Валюта",
    en: "Currency",
    hy: "Արժույթ",
    be: "Валюта",
    kk: "Валюта",
    ka: "ვალუტა",
    az: "Valyuta",
    ar: "العملة",
    tr: "Para birimi"
  },
  allDeposits: {
    ru: "Все вклады",
    en: "All deposits",
    hy: "Բոլոր ավանդները",
    be: "Усе ўклады",
    kk: "Барлық депозиттер",
    ka: "ყველა ანაბარი",
    az: "Bütün əmanətlər",
    ar: "كل الودائع",
    tr: "Tüm mevduatlar"
  },
  onDemand: {
    ru: "До востребования",
    en: "On demand",
    hy: "Ցպահանջ",
    be: "Да запатрабавання",
    kk: "Талап етілгенге дейін",
    ka: "მოთხოვნამდე",
    az: "Tələb olunanadək",
    ar: "تحت الطلب",
    tr: "Vadesiz"
  },
  termDeposits: {
    ru: "Срочные",
    en: "Term",
    hy: "Ժամկետային",
    be: "Тэрміновыя",
    kk: "Мерзімді",
    ka: "ვადიანი",
    az: "Müddətli",
    ar: "أجل",
    tr: "Vadeli"
  },
  rateFrom: {
    ru: "Ставка от %",
    en: "Rate min %",
    hy: "Դրույք՝ սկսած %",
    be: "Стаўка ад %",
    kk: "Мөлшерлеме, бастап %",
    ka: "განაკვეთი, მინ %",
    az: "Faiz, min %",
    ar: "الحد الأدنى للفائدة %",
    tr: "Faiz min %"
  },
  rateTo: {
    ru: "Ставка до %",
    en: "Rate max %",
    hy: "Դրույք՝ մինչև %",
    be: "Стаўка да %",
    kk: "Мөлшерлеме, дейін %",
    ka: "განაკვეთი, მაქს %",
    az: "Faiz, max %",
    ar: "الحد الأقصى للفائدة %",
    tr: "Faiz max %"
  },
  feeTo: {
    ru: "Комиссия до",
    en: "Fee max",
    hy: "Միջնորդավճար՝ մինչև",
    be: "Камісія да",
    kk: "Комиссия, дейін",
    ka: "საკომისიო მაქს",
    az: "Komissiya, max",
    ar: "الرسوم القصوى",
    tr: "Ücret max"
  },
  amountFrom: {
    ru: "Сумма от",
    en: "Amount min",
    hy: "Գումար՝ սկսած",
    be: "Сума ад",
    kk: "Сома, бастап",
    ka: "თანხა მინ",
    az: "Məbləğ, min",
    ar: "الحد الأدنى للمبلغ",
    tr: "Tutar min"
  },
  termTo: {
    ru: "Срок до (мес.)",
    en: "Term max (months)",
    hy: "Ժամկետ՝ մինչև (ամիս)",
    be: "Тэрмін да (мес.)",
    kk: "Мерзім, дейін (ай)",
    ka: "ვადა მაქს (თვე)",
    az: "Müddət max (ay)",
    ar: "المدة القصوى (أشهر)",
    tr: "Vade max (ay)"
  },
  cashbackFrom: {
    ru: "Кэшбэк от %",
    en: "Cashback min %",
    hy: "Քեշբեք՝ սկսած %",
    be: "Кэшбэк ад %",
    kk: "Кэшбэк, бастап %",
    ka: "ქეშბექი მინ %",
    az: "Keşbek min %",
    ar: "الحد الأدنى للاسترداد %",
    tr: "Nakit iade min %"
  },
  onlineOnly: {
    ru: "Только онлайн-оформление",
    en: "Online approval only",
    hy: "Միայն առցանց ձևակերպում",
    be: "Толькі анлайн-афармленне",
    kk: "Тек онлайн рәсімдеу",
    ka: "მხოლოდ ონლაინ გაფორმება",
    az: "Yalnız onlayn rəsmiləşdirmə",
    ar: "الموافقة عبر الإنترنت فقط",
    tr: "Sadece çevrim içi onay"
  },
  currencies: {
    ru: "Валюты",
    en: "Currencies",
    hy: "Արժույթներ",
    be: "Валюты",
    kk: "Валюталар",
    ka: "ვალუტები",
    az: "Valyutalar",
    ar: "العملات",
    tr: "Para birimleri"
  },
  previous: {
    ru: "Назад",
    en: "Previous",
    hy: "Նախորդ",
    be: "Назад",
    kk: "Артқа",
    ka: "წინა",
    az: "Əvvəlki",
    ar: "السابق",
    tr: "Önceki"
  },
  next: {
    ru: "Вперед",
    en: "Next",
    hy: "Հաջորդ",
    be: "Наперад",
    kk: "Келесі",
    ka: "შემდეგი",
    az: "Növbəti",
    ar: "التالي",
    tr: "Sonraki"
  },
  requestFailed: {
    ru: "Не удалось загрузить каталог. Проверьте сеть и повторите запрос.",
    en: "Failed to load catalog. Check connection and retry.",
    hy: "Կատալոգը բեռնել չհաջողվեց։ Ստուգեք կապը և կրկնեք։",
    be: "Не ўдалося загрузіць каталог. Праверце сетку і паўтарыце.",
    kk: "Каталогты жүктеу сәтсіз. Байланысты тексеріп, қайталап көріңіз.",
    ka: "კატალოგის ჩატვირთვა ვერ მოხერხდა. შეამოწმეთ კავშირი და სცადეთ თავიდან.",
    az: "Kataloqu yükləmək olmadı. Şəbəkəni yoxlayın və yenidən cəhd edin.",
    ar: "تعذر تحميل الكتالوج. تحقق من الاتصال وحاول مرة أخرى.",
    tr: "Katalog yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin."
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
  },
  compareTitle: {
    ru: "Сравнение продуктов",
    en: "Product comparison",
    hy: "Ապրանքների համեմատում",
    be: "Параўнанне прадуктаў",
    kk: "Өнімдерді салыстыру",
    ka: "პროდუქტების შედარება",
    az: "Məhsulların müqayisəsi",
    ar: "مقارنة المنتجات",
    tr: "Ürün karşılaştırması"
  },
  clearCompare: {
    ru: "Очистить сравнение",
    en: "Clear comparison",
    hy: "Մաքրել համեմատումը",
    be: "Ачысціць параўнанне",
    kk: "Салыстыруды тазалау",
    ka: "შედარების გასუფთავება",
    az: "Müqayisəni təmizlə",
    ar: "مسح المقارنة",
    tr: "Karşılaştırmayı temizle"
  },
  alertsTitle: {
    ru: "Алерты на изменения",
    en: "Change alerts",
    hy: "Փոփոխությունների ահազանգեր",
    be: "Алерты змен",
    kk: "Өзгеріс ескертулері",
    ka: "ცვლილებების ალერტები",
    az: "Dəyişiklik xəbərdarlıqları",
    ar: "تنبيهات التغييرات",
    tr: "Değişim uyarıları"
  },
  clearAlerts: {
    ru: "Очистить алерты",
    en: "Clear alerts",
    hy: "Մաքրել ահազանգերը",
    be: "Ачысціць алерты",
    kk: "Алерттерді тазалау",
    ka: "ალერტების გასუფთავება",
    az: "Xəbərdarlıqları təmizlə",
    ar: "مسح التنبيهات",
    tr: "Uyarıları temizle"
  },
  noCompareYet: {
    ru: "Добавьте до 4 продуктов в сравнение.",
    en: "Add up to 4 products to compare.",
    hy: "Համեմատելու համար ավելացրեք մինչև 4 ապրանք։",
    be: "Дадайце да 4 прадуктаў для параўнання.",
    kk: "Салыстыру үшін 4 өнімге дейін қосыңыз.",
    ka: "შედარებისთვის დაამატეთ 4-მდე პროდუქტი.",
    az: "Müqayisə üçün 4 məhsuladək əlavə edin.",
    ar: "أضف حتى 4 منتجات للمقارنة.",
    tr: "Karşılaştırmak için en fazla 4 ürün ekleyin."
  }
};

function localText(locale: string, key: keyof typeof LOCAL_LABELS): string {
  return LOCAL_LABELS[key][locale] ?? LOCAL_LABELS[key].en;
}

function categoryEmoji(category: ProductCategory): string {
  if (category === "debit_cards") return "💳";
  if (category === "credit_cards") return "🪪";
  if (category === "consumer_loans") return "💸";
  if (category === "mortgages") return "🏠";
  if (category === "deposits") return "🏦";
  if (category === "business_services") return "💼";
  return "📄";
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

function parseNumber(value: string): string {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return "";
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? `${parsed}` : "";
}

export function CatalogExplorer({ initialCategory, initialQuery }: CatalogExplorerProps) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];

  const [category, setCategory] = useState<ProductCategory>(initialCategory ?? "debit_cards");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [depositType, setDepositType] = useState<"all" | "on_demand" | "term">("all");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [termMax, setTermMax] = useState("");
  const [cashbackMin, setCashbackMin] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"" | "sravni" | "bank_site" | "registry_fallback">("");
  const [intentFilter, setIntentFilter] = useState("");
  const [featureTagsFilter, setFeatureTagsFilter] = useState("");
  const [hasAiSummary, setHasAiSummary] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [bankGroups, setBankGroups] = useState<CatalogBankGroup[]>([]);
  const [bankGroupsTotal, setBankGroupsTotal] = useState(0);
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
  const [bankProductsById, setBankProductsById] = useState<Record<string, CatalogResponse["products"]>>({});
  const [bankProductsLoading, setBankProductsLoading] = useState<Record<string, boolean>>({});
  const [bankProductsError, setBankProductsError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [compareItems, setCompareItems] = useState<ProductItem[]>([]);
  const [alertItemsById, setAlertItemsById] = useState<Record<string, ProductItem>>({});
  const isBankGroupMode = category === "debit_cards" || category === "credit_cards";

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      setPage(1);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (category !== "deposits" && depositType !== "all") {
      setDepositType("all");
    }
  }, [category, depositType]);

  useEffect(() => {
    if (isBankGroupMode && selectedBank) {
      setSelectedBank("");
    }
  }, [isBankGroupMode, selectedBank]);

  useEffect(() => {
    if (!isBankGroupMode) {
      return;
    }
    setSelectedCurrency("");
    setIntentFilter("");
    setFeatureTagsFilter("");
    setHasAiSummary(false);
  }, [isBankGroupMode]);

  useEffect(() => {
    if (typeof initialQuery === "string") {
      setQuery(initialQuery);
      setPage(1);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compareRaw = window.localStorage.getItem(`bankyour-compare:${country}`);
    if (compareRaw) {
      try {
        const parsed = JSON.parse(compareRaw) as ProductItem[];
        setCompareItems(Array.isArray(parsed) ? parsed.slice(0, 4) : []);
      } catch {
        setCompareItems([]);
      }
    } else {
      setCompareItems([]);
    }

    const alertsRaw = window.localStorage.getItem(`bankyour-alerts:${country}`);
    if (alertsRaw) {
      try {
        const parsed = JSON.parse(alertsRaw) as ProductItem[];
        const mapped = (Array.isArray(parsed) ? parsed : []).reduce<Record<string, ProductItem>>(
          (acc, item) => {
            acc[item.id] = item;
            return acc;
          },
          {}
        );
        setAlertItemsById(mapped);
      } catch {
        setAlertItemsById({});
      }
    } else {
      setAlertItemsById({});
    }
  }, [country]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(`bankyour-compare:${country}`, JSON.stringify(compareItems.slice(0, 4)));
  }, [compareItems, country]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const alerts = Object.values(alertItemsById);
    window.localStorage.setItem(`bankyour-alerts:${country}`, JSON.stringify(alerts));
  }, [alertItemsById, country]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        setRequestError(null);
        const params = new URLSearchParams({
          country,
          lang: locale,
          category,
          page: `${page}`,
          pageSize: `${PAGE_SIZE}`
        });
        if (query.trim()) params.set("q", query.trim());
        if (sort) params.set("sort", sort);
        if (selectedBank) params.set("bank", selectedBank);
        if (selectedCurrency) params.set("currency", selectedCurrency);
        if (depositType !== "all") params.set("depositType", depositType);
        if (rateMin) params.set("rateMin", parseNumber(rateMin));
        if (rateMax) params.set("rateMax", parseNumber(rateMax));
        if (feeMax) params.set("feeMax", parseNumber(feeMax));
        if (amountMin) params.set("amountMin", parseNumber(amountMin));
        if (termMax) params.set("termMax", parseNumber(termMax));
        if (cashbackMin) params.set("cashbackMin", parseNumber(cashbackMin));
        if (onlineOnly) params.set("onlineOnly", "1");
        if (sourceFilter) params.set("source", sourceFilter);
        if (intentFilter.trim()) params.set("intent", intentFilter.trim());
        if (featureTagsFilter.trim()) params.set("featureTags", featureTagsFilter.trim());
        if (hasAiSummary) params.set("hasAiSummary", "1");

        const requests: Promise<Response>[] = [
          fetch(`/api/catalog?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal
          })
        ];

        if (isBankGroupMode) {
          const groupsParams = new URLSearchParams({
            country,
            lang: locale,
            category,
            page: `${page}`,
            pageSize: `${GROUP_PAGE_SIZE}`
          });
          if (query.trim()) groupsParams.set("q", query.trim());
          if (sourceFilter) groupsParams.set("source", sourceFilter);

          requests.push(
            fetch(`/api/catalog/bank-groups?${groupsParams.toString()}`, {
              cache: "no-store",
              signal: controller.signal
            })
          );
        }

        const [catalogResponse, groupsResponse] = await Promise.all(requests);
        if (!catalogResponse.ok) {
          throw new Error("Failed to load catalog");
        }
        if (isBankGroupMode && groupsResponse && !groupsResponse.ok) {
          throw new Error("Failed to load grouped catalog");
        }

        const catalogPayload = (await catalogResponse.json()) as CatalogResponse;
        if (!cancelled) {
          setData(catalogPayload);
          if (isBankGroupMode && groupsResponse) {
            const groupedPayload = (await groupsResponse.json()) as BankGroupsApiResponse;
            setBankGroups(groupedPayload.banks);
            setBankGroupsTotal(groupedPayload.totalBanks);
          } else {
            setBankGroups([]);
            setBankGroupsTotal(0);
            setExpandedBanks({});
            setBankProductsById({});
            setBankProductsLoading({});
            setBankProductsError({});
          }
        }
      } catch {
        if (!cancelled) {
          setRequestError(localText(locale, "requestFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    amountMin,
    cashbackMin,
    category,
    country,
    feeMax,
    locale,
    onlineOnly,
    page,
    query,
    rateMax,
    rateMin,
    selectedBank,
    selectedCurrency,
    depositType,
    sort,
    termMax,
    sourceFilter,
    intentFilter,
    featureTagsFilter,
    hasAiSummary,
    isBankGroupMode,
    reloadKey
  ]);

  const sortOptions = useMemo(
    () => [
      { value: "", label: copy.sortBy },
      { value: "rate_asc", label: copy.sortRateAsc },
      { value: "rate_desc", label: copy.sortRateDesc },
      { value: "fee_asc", label: copy.sortFeeAsc },
      { value: "fee_desc", label: copy.sortFeeDesc }
    ],
    [copy]
  );

  function toggleCompare(item: ProductItem) {
    setCompareItems((prev) => {
      const exists = prev.some((entry) => entry.id === item.id);
      if (exists) {
        return prev.filter((entry) => entry.id !== item.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), item];
      }
      return [...prev, item];
    });
  }

  function toggleAlert(item: ProductItem) {
    setAlertItemsById((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: item
      };
    });
  }

  const alertItems = useMemo(() => Object.values(alertItemsById), [alertItemsById]);

  async function loadBankProducts(bankId: string) {
    if (bankProductsById[bankId] || bankProductsLoading[bankId]) {
      return;
    }

    try {
      setBankProductsLoading((prev) => ({ ...prev, [bankId]: true }));
      setBankProductsError((prev) => {
        const next = { ...prev };
        delete next[bankId];
        return next;
      });

      const params = new URLSearchParams({
        country,
        lang: locale,
        page: "1",
        pageSize: "200"
      });
      if (category) {
        params.set("category", category);
      }

      const response = await fetch(`/api/catalog/banks/${encodeURIComponent(bankId)}/products?${params.toString()}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Failed to load bank products");
      }

      const payload = (await response.json()) as BankProductsApiResponse;
      setBankProductsById((prev) => ({ ...prev, [bankId]: payload.products }));
    } catch {
      setBankProductsError((prev) => ({
        ...prev,
        [bankId]: locale === "ru" ? "Не удалось загрузить предложения банка." : "Could not load bank offers."
      }));
    } finally {
      setBankProductsLoading((prev) => ({ ...prev, [bankId]: false }));
    }
  }

  function toggleBank(bankId: string) {
    setExpandedBanks((prev) => {
      const nextOpen = !prev[bankId];
      if (nextOpen) {
        void loadBankProducts(bankId);
      }
      return {
        ...prev,
        [bankId]: nextOpen
      };
    });
  }

  function clearFilters() {
    setQuery("");
    setSort("");
    setSelectedBank("");
    setSelectedCurrency("");
    setDepositType("all");
    setRateMin("");
    setRateMax("");
    setFeeMax("");
    setAmountMin("");
    setTermMax("");
    setCashbackMin("");
    setOnlineOnly(false);
    setSourceFilter("");
    setIntentFilter("");
    setFeatureTagsFilter("");
    setHasAiSummary(false);
    setPage(1);
  }

  const hasNextPage = isBankGroupMode
    ? bankGroupsTotal > page * GROUP_PAGE_SIZE
    : (data?.totals.products ?? 0) > page * PAGE_SIZE;
  const retryLabel = localText(locale, "retry");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{copy.servicesPageTitle}</h1>
          <p className="text-sm text-slate-500">
            {data?.updatedAt ? `${copy.updatedAt}: ${toLocaleDate(data.updatedAt, locale)}` : copy.loadingOffers}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_CONFIG.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setCategory(item.key);
                setPage(1);
              }}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                category === item.key
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <CategoryIcon icon={item.icon} size={16} className={category === item.key ? "text-blue-700" : "text-slate-500"} />
                <span className="truncate">{getCategoryLabel(item.key, locale)}</span>
              </div>
              <span className="ml-auto text-base leading-none" aria-hidden="true">
                {categoryEmoji(item.key)}
              </span>
            </button>
          ))}
        </div>

        <div className={`mt-5 grid gap-3 lg:grid-cols-2 ${isBankGroupMode ? "xl:grid-cols-2" : "xl:grid-cols-4"}`}>
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={copy.searchPlaceholder}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-300"
            />
          </label>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortOption);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
          >
            {sortOptions.map((option) => (
              <option key={option.value || "default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {!isBankGroupMode ? (
            <>
              <select
                value={selectedBank}
                onChange={(event) => {
                  setSelectedBank(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
              >
                <option value="">{copy.providersTitle}</option>
                {(data?.facets.banks ?? []).slice(0, 200).map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCurrency}
                onChange={(event) => {
                  setSelectedCurrency(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
              >
                <option value="">{localText(locale, "currency")}</option>
                {(data?.facets.currencies ?? []).slice(0, 20).map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>

        <div className={`mt-3 grid gap-3 lg:grid-cols-2 ${isBankGroupMode ? "xl:grid-cols-1" : "xl:grid-cols-4"}`}>
          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value as "" | "sravni" | "bank_site" | "registry_fallback");
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
          >
            <option value="">{locale === "ru" ? "Источник" : "Source"}</option>
            <option value="sravni">Sravni</option>
            <option value="bank_site">{locale === "ru" ? "Сайт банка" : "Bank site"}</option>
            <option value="registry_fallback">{locale === "ru" ? "Fallback" : "Fallback"}</option>
          </select>
          {!isBankGroupMode ? (
            <>
              <input
                value={intentFilter}
                onChange={(event) => {
                  setIntentFilter(event.target.value);
                  setPage(1);
                }}
                placeholder={locale === "ru" ? "Intent (cashback, travel...)" : "Intent (cashback, travel...)"}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
              />
              <input
                value={featureTagsFilter}
                onChange={(event) => {
                  setFeatureTagsFilter(event.target.value);
                  setPage(1);
                }}
                placeholder={locale === "ru" ? "AI теги через запятую" : "AI tags comma-separated"}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
              />
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasAiSummary}
                  onChange={(event) => {
                    setHasAiSummary(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {locale === "ru" ? "Только с AI-сводкой" : "Only with AI summary"}
              </label>
            </>
          ) : null}
        </div>

        {category === "deposits" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: "all", label: localText(locale, "allDeposits") },
              { key: "on_demand", label: localText(locale, "onDemand") },
              { key: "term", label: localText(locale, "termDeposits") }
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setDepositType(item.key);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  depositType === item.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-blue-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {!isBankGroupMode ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <input
              value={rateMin}
              onChange={(event) => setRateMin(event.target.value)}
              placeholder={localText(locale, "rateFrom")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={rateMax}
              onChange={(event) => setRateMax(event.target.value)}
              placeholder={localText(locale, "rateTo")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={feeMax}
              onChange={(event) => setFeeMax(event.target.value)}
              placeholder={localText(locale, "feeTo")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={amountMin}
              onChange={(event) => setAmountMin(event.target.value)}
              placeholder={localText(locale, "amountFrom")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={termMax}
              onChange={(event) => setTermMax(event.target.value)}
              placeholder={localText(locale, "termTo")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={cashbackMin}
              onChange={(event) => setCashbackMin(event.target.value)}
              placeholder={localText(locale, "cashbackFrom")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
            />
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {!isBankGroupMode ? (
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(event) => setOnlineOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {localText(locale, "onlineOnly")}
            </label>
          ) : (
            <p className="text-sm text-slate-600">
              {locale === "ru"
                ? "Карточные предложения сгруппированы по банкам. Откройте банк, чтобы увидеть все продукты."
                : "Card offers are grouped by bank. Expand a bank to view all products."}
            </p>
          )}

          <button
            onClick={clearFilters}
            aria-label="Clear filters"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            {copy.clearFilters}
          </button>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{copy.ratesByCredits}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {data?.sectionSummary.minRate != null && data.sectionSummary.maxRate != null
                ? `${data.sectionSummary.minRate.toFixed(1)}% - ${data.sectionSummary.maxRate.toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {localText(locale, "currencies")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {data?.sectionSummary.currencies.join(", ") || "—"}
            </p>
          </div>
        </div>
      </motion.section>

      {isBankGroupMode ? (
        <section className="space-y-3">
          {requestError ? (
            <div className="space-y-2">
              <ActionErrorBanner message={requestError} />
              <RetryButton label={retryLabel} onClick={() => setReloadKey((prev) => prev + 1)} disabled={loading} />
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {copy.loadingOffers}
            </div>
          ) : bankGroups.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {copy.noSearchResults}
            </div>
          ) : (
            bankGroups.map((group) => {
              const isOpen = Boolean(expandedBanks[group.bankId]);
              const products = bankProductsById[group.bankId] ?? [];
              const isLoadingProducts = Boolean(bankProductsLoading[group.bankId]);
              const productsError = bankProductsError[group.bankId];
              return (
                <article key={group.bankId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <button
                    onClick={() => toggleBank(group.bankId)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{group.bankName}</p>
                      <p className="text-sm text-slate-600">
                        {locale === "ru" ? "Предложений" : "Offers"}: {group.offersCount} ·{" "}
                        {locale === "ru" ? "Статус" : "Status"}:{" "}
                        {group.registryStatus === "active"
                          ? locale === "ru"
                            ? "активен"
                            : "active"
                          : group.registryStatus === "suspended"
                            ? locale === "ru"
                              ? "приостановлен"
                              : "suspended"
                            : locale === "ru"
                              ? "уточняется"
                              : "unknown"}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {group.topHighlights.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.topHighlights.map((entry) => (
                        <span key={`${group.bankId}-${entry}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                          {entry}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {isOpen ? (
                    <div className="mt-4 space-y-3">
                      {isLoadingProducts ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          {copy.loadingOffers}
                        </div>
                      ) : productsError ? (
                        <div className="space-y-2">
                          <ActionErrorBanner message={productsError} />
                          <RetryButton
                            label={retryLabel}
                            onClick={() => void loadBankProducts(group.bankId)}
                            disabled={isLoadingProducts}
                          />
                        </div>
                      ) : products.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          {copy.noSearchResults}
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {products.map((item) => (
                            <CatalogProductCard
                              key={item.id}
                              item={item}
                              isCompared={compareItems.some((entry) => entry.id === item.id)}
                              onToggleCompare={toggleCompare}
                              isAlerted={Boolean(alertItemsById[item.id])}
                              onToggleAlert={toggleAlert}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {requestError ? (
            <div className="col-span-full space-y-2">
              <ActionErrorBanner message={requestError} />
              <RetryButton label={retryLabel} onClick={() => setReloadKey((prev) => prev + 1)} disabled={loading} />
            </div>
          ) : null}
          {loading ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {copy.loadingOffers}
            </div>
          ) : (data?.products.length ?? 0) === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {copy.noSearchResults}
            </div>
          ) : (
            (data?.products ?? []).map((item) => (
              <CatalogProductCard
                key={item.id}
                item={item}
                isCompared={compareItems.some((entry) => entry.id === item.id)}
                onToggleCompare={toggleCompare}
                isAlerted={Boolean(alertItemsById[item.id])}
                onToggleAlert={toggleAlert}
              />
            ))
          )}
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{localText(locale, "compareTitle")}</h3>
          <button
            onClick={() => setCompareItems([])}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {localText(locale, "clearCompare")}
          </button>
        </div>

        {compareItems.length === 0 ? (
          <p className="text-sm text-slate-600">{localText(locale, "noCompareYet")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {compareItems.map((item) => (
                <button
                  key={`compare-chip-${item.id}`}
                  onClick={() => toggleCompare(item)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {item.bankName}: {item.name}
                </button>
              ))}
            </div>

            {compareItems.length >= 2 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 px-2 py-2 text-left text-slate-500">
                        {locale === "ru" ? "Параметр" : "Parameter"}
                      </th>
                      {compareItems.map((item) => (
                        <th
                          key={`compare-head-${item.id}`}
                          className="border-b border-slate-200 px-2 py-2 text-left text-slate-700"
                        >
                          {item.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: locale === "ru" ? "Банк" : "Bank",
                        getValue: (item: ProductItem) => item.bankName
                      },
                      {
                        label: locale === "ru" ? "Кэшбэк" : "Cashback",
                        getValue: (item: ProductItem) => item.cashback ?? "—"
                      },
                      {
                        label: locale === "ru" ? "Комиссия" : "Fee",
                        getValue: (item: ProductItem) => item.annualFee ?? "—"
                      },
                      {
                        label: locale === "ru" ? "Ставка" : "Rate",
                        getValue: (item: ProductItem) => item.rate ?? "—"
                      },
                      {
                        label: locale === "ru" ? "Срок" : "Term",
                        getValue: (item: ProductItem) => item.term ?? "—"
                      },
                      {
                        label: locale === "ru" ? "Мин. сумма" : "Min amount",
                        getValue: (item: ProductItem) => item.minAmount ?? "—"
                      },
                      {
                        label: locale === "ru" ? "Валюты" : "Currencies",
                        getValue: (item: ProductItem) =>
                          item.currencyOptions && item.currencyOptions.length > 0
                            ? item.currencyOptions.join(" / ")
                            : "—"
                      },
                      {
                        label: locale === "ru" ? "Источник" : "Source",
                        getValue: (item: ProductItem) => item.source
                      }
                    ].map((row) => (
                      <tr key={`compare-row-${row.label}`}>
                        <td className="border-b border-slate-100 px-2 py-2 font-medium text-slate-600">
                          {row.label}
                        </td>
                        {compareItems.map((item) => (
                          <td key={`compare-cell-${row.label}-${item.id}`} className="border-b border-slate-100 px-2 py-2 text-slate-800">
                            {row.getValue(item)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{localText(locale, "alertsTitle")}</h3>
          <button
            onClick={() => setAlertItemsById({})}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {localText(locale, "clearAlerts")}
          </button>
        </div>
        {alertItems.length === 0 ? (
          <p className="text-sm text-slate-600">
            {locale === "ru"
              ? "Добавьте продукты в алерты: кнопка «Алерт» на карточке продукта."
              : "Add products to alerts using the “Alert” button on product cards."}
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {alertItems.slice(0, 20).map((item) => (
              <div
                key={`alert-item-${item.id}`}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">
                  {item.bankName}: {item.name}
                </span>
                <button
                  onClick={() => toggleAlert(item)}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                >
                  {locale === "ru" ? "Убрать" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {localText(locale, "previous")}
        </button>
        <p className="text-sm text-slate-600">
          Page {page}
        </p>
        <button
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!hasNextPage}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {localText(locale, "next")}
        </button>
      </div>

    </div>
  );
}
