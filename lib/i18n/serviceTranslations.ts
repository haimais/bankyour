import { LanguageCode, ServiceType } from "@/lib/types";

/**
 * Service type translations for all supported languages
 */
export const SERVICE_TRANSLATIONS: Record<ServiceType, Record<LanguageCode, string>> = {
  cards: {
    ru: "Карты",
    en: "Cards",
    hy: "Քարտեր",
    be: "Карты",
    kk: "Карталар",
    ka: "ბარათი",
    az: "Kartlar",
    ar: "البطاقات",
    tr: "Kartlar"
  },
  loans: {
    ru: "Кредиты и ипотека",
    en: "Loans & Mortgages",
    hy: "Վարկեր և հիպոთեկ",
    be: "Крэдыты ды іпатэка",
    kk: "Ішету және ипотека",
    ka: "სესხი და იპოთეკა",
    az: "Kreditleri və hekllər",
    ar: "القروض والرهون العقارية",
    tr: "Krediler ve İpotekler"
  },
  deposits: {
    ru: "Вклады",
    en: "Deposits",
    hy: "Ավանդներ",
    be: "Ўклады",
    kk: "Салымдар",
    ka: "დეპოზიტი",
    az: "Depozitlər",
    ar: "الودائع",
    tr: "Mevduat"
  },
  business: {
    ru: "Бизнес",
    en: "Business Services",
    hy: "Բիզնես",
    be: "Бізнес",
    kk: "Бизнес",
    ka: "ბიზნესი",
    az: "İşlə",
    ar: "الأعمال",
    tr: "İşletme"
  },
  documents: {
    ru: "Документы",
    en: "Documents",
    hy: "Փաստաթղթեր",
    be: "Дакументы",
    kk: "Құжаттар",
    ka: "დოკუმენტები",
    az: "Sənədlər",
    ar: "المستندات",
    tr: "Belgeler"
  }
};

/**
 * Product category translations for all supported languages
 */
export const CATEGORY_TRANSLATIONS: Record<
  string,
  Record<LanguageCode, string>
> = {
  debit_cards: {
    ru: "Дебетовые карты",
    en: "Debit Cards",
    hy: "Դեբետային քարտեր",
    be: "Дэбетавыя карты",
    kk: "Дебеттік карталар",
    ka: "დებიტის ბარათი",
    az: "Debit Kartlar",
    ar: "بطاقات الخصم",
    tr: "Banka Kartları"
  },
  credit_cards: {
    ru: "Кредитные карты",
    en: "Credit Cards",
    hy: "Վարկային քարտեր",
    be: "Крэдытныя карты",
    kk: "Кредиттік карталар",
    ka: "საკრედიტო ბარათი",
    az: "Kredit Kartlar",
    ar: "بطاقات الائتمان",
    tr: "Kredi Kartları"
  },
  consumer_loans: {
    ru: "Потребительские кредиты",
    en: "Personal Loans",
    hy: "Սպառիչ վարկեր",
    be: "Спажывецкія крэдыты",
    kk: "Тұтынушы кредиттері",
    ka: "PersonaLური სესხი",
    az: "Şəxsi Kreditleri",
    ar: "قروض شخصية",
    tr: "Kişisel Krediler"
  },
  mortgages: {
    ru: "Ипотека",
    en: "Mortgages",
    hy: "Հիպոտեկներ",
    be: "Іпатэка",
    kk: "Ипотека",
    ka: "იპოთეკა",
    az: "İpoteka",
    ar: "قروض الرهن العقاري",
    tr: "İpotekler"
  },
  deposits: {
    ru: "Вклады",
    en: "Deposits",
    hy: "Ավանդներ",
    be: "Ўклады",
    kk: "Салымдар",
    ka: "დეპოზიტი",
    az: "Depozitlər",
    ar: "الودائع",
    tr: "Mevduat"
  },
  investments: {
    ru: "Инвестиции",
    en: "Investments",
    hy: "Ներդրումներ",
    be: "Інвестыцыі",
    kk: "Инвестициялар",
    ka: "ინვესტიციები",
    az: "Sərmayə",
    ar: "الاستثمارات",
    tr: "Yatırımlar"
  },
  business_services: {
    ru: "Бизнес-сервисы",
    en: "Business Services",
    hy: "Բիզնեսային ծառայություններ",
    be: "Бізнес-сервісы",
    kk: "Бизнес-сервистері",
    ka: "ბიზნეს სერვისები",
    az: "İş xidmətləri",
    ar: "خدمات الأعمال",
    tr: "İş Hizmetleri"
  },
  document_assistance: {
    ru: "Помощь с документами",
    en: "Document Assistance",
    hy: "Փաստաթղթերի օգնություն",
    be: "Дапамога з дакументамі",
    kk: "Құжаттар бойынша көмек",
    ka: "დოკუმენტაციის დახმარება",
    az: "Sənəd Yardımı",
    ar: "مساعدة المستندات",
    tr: "Belge Yardımı"
  }
};

/**
 * Get translated service name
 */
export function getServiceTranslation(
  serviceType: ServiceType,
  locale: LanguageCode
): string {
  return SERVICE_TRANSLATIONS[serviceType][locale] || SERVICE_TRANSLATIONS[serviceType]["en"];
}

/**
 * Get translated category name
 */
export function getCategoryTranslation(
  category: string,
  locale: LanguageCode
): string {
  const translated = CATEGORY_TRANSLATIONS[category];
  if (!translated) {
    return category;
  }
  return translated[locale] || translated["en"];
}

/**
 * Translate all service names for a locale
 */
export function getAllServiceTranslations(locale: LanguageCode): Record<ServiceType, string> {
  const services: ServiceType[] = ["cards", "loans", "deposits", "business", "documents"];
  const result: Partial<Record<ServiceType, string>> = {};

  for (const service of services) {
    result[service] = getServiceTranslation(service, locale);
  }

  return result as Record<ServiceType, string>;
}
