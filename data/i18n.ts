import { Country, LanguageCode, Locale, ProductCategory } from "@/lib/types";

export type UiTextShape = {
  navServices: string;
  navNews: string;
  navBusiness: string;
  navAbout: string;
  navContact: string;
  navCalculators: string;
  navAcademy: string;
  navInsurance: string;
  navLoans: string;
  navMortgage: string;
  navCards: string;
  navDeposits: string;
  navJournal: string;
  navDebitCards: string;
  navCreditCards: string;
  country: string;
  language: string;
  langRu: string;
  langEn: string;
  langHy: string;
  langBe: string;
  langKk: string;
  langKa: string;
  langAz: string;
  langAr: string;
  langTr: string;
  heroChip: string;
  heroTitle: string;
  heroSubtitle: string;
  exploreServices: string;
  talkToAssistant: string;
  saveMoneyTitle: string;
  saveMoneySubtitle: string;
  allServices: string;
  searchServices: string;
  popularProducts: string;
  marketMonitoring: string;
  ratesByCredits: string;
  bestDeposits: string;
  ratesByMortgage: string;
  checkRate: string;
  openDeposit: string;
  checkedIn: string;
  banksWord: string;
  servicesTools: string;
  calculatorCredit: string;
  calculatorDeposit: string;
  calculatorMortgage: string;
  calculatorDebitCard: string;
  calculatorCreditCard: string;
  calculatorBusiness: string;
  calculatorDocuments: string;
  calculatorInvestments: string;
  reviewsLabel: string;
  financialPulseSection: string;
  viewAllJournal: string;
  chooseService: string;
  servicesTitle: string;
  servicesSubtitle: string;
  viewOffers: string;
  moreDetails: string;
  goToProvider: string;
  providerWebsite: string;
  providerCount: string;
  offersCount: string;
  serviceSummaryTitle: string;
  providersTitle: string;
  providerCatalogNote: string;
  servicesCovered: string;
  noOffers: string;
  loadingOffers: string;
  liveStatus: string;
  fallbackStatus: string;
  mixedStatus: string;
  updatedAt: string;
  financialPulse: string;
  pulseSubtitle: string;
  readSource: string;
  newsError: string;
  newsLoading: string;
  newsRefreshNote: string;
  typing: string;
  chatTitle: string;
  chatPlaceholder: string;
  quickCard: string;
  quickInvest: string;
  quickMortgage: string;
  aboutTitle: string;
  aboutBody: string;
  contactTitle: string;
  contactSubtitle: string;
  footerAbout: string;
  footerPartners: string;
  footerPrivacy: string;
  footerContact: string;
  footerDisclaimer: string;
  newsPageTitle: string;
  servicesPageTitle: string;
  businessPageTitle: string;
  businessPageSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  currentMarket: string;
  allRightsReserved: string;
  openMenu: string;
  openAssistant: string;
  closeAssistant: string;
  sendMessage: string;
  selectCountry: string;
  selectLanguage: string;
  filtersTitle: string;
  clearFilters: string;
  sortBy: string;
  sortRateAsc: string;
  sortRateDesc: string;
  sortFeeAsc: string;
  sortFeeDesc: string;
  searchPlaceholder: string;
  noSearchResults: string;
  categoryDebitCards: string;
  categoryCreditCards: string;
  categoryConsumerLoans: string;
  categoryMortgages: string;
  categoryDeposits: string;
  categoryInvestments: string;
  categoryBusinessServices: string;
  categoryDocumentAssistance: string;
};

export const EN_TEXT: UiTextShape = {
  navServices: "Services",
  navNews: "News",
  navBusiness: "Business",
  navAbout: "About",
  navContact: "Contact",
  navCalculators: "Calculators",
  navAcademy: "Academy",
  navInsurance: "Insurance",
  navLoans: "Loans",
  navMortgage: "Mortgage",
  navCards: "Cards",
  navDeposits: "Deposits",
  navJournal: "Financial Pulse",
  navDebitCards: "Debit Cards",
  navCreditCards: "Credit Cards",
  country: "Country",
  language: "Language",
  langRu: "Русский",
  langEn: "English",
  langHy: "Հայերեն",
  langBe: "Беларуская",
  langKk: "Қазақша",
  langKa: "ქართული",
  langAz: "Azərbaycan dili",
  langAr: "العربية",
  langTr: "Türkçe",
  heroChip: "Fintech Aggregator & AI Assistant",
  heroTitle: "Your Financial Compass in",
  heroSubtitle: "Compare cards, loans, and deposits tailored to your selected region.",
  exploreServices: "Explore Services",
  talkToAssistant: "Talk to AI Assistant",
  saveMoneyTitle: "Helping You Save Money",
  saveMoneySubtitle: "Compare bank and broker offers, track rates, and choose better terms.",
  allServices: "All services",
  searchServices: "Search services",
  popularProducts: "Popular products",
  marketMonitoring: "Market monitoring",
  ratesByCredits: "Loan rates",
  bestDeposits: "Top deposits",
  ratesByMortgage: "Mortgage rates",
  checkRate: "Check rate",
  openDeposit: "Open deposit",
  checkedIn: "Rates checked in",
  banksWord: "banks",
  servicesTools: "Tools",
  calculatorCredit: "Loan calculator",
  calculatorDeposit: "Deposit calculator",
  calculatorMortgage: "Mortgage calculator",
  calculatorDebitCard: "Debit card calculator",
  calculatorCreditCard: "Credit card calculator",
  calculatorBusiness: "Business calculator",
  calculatorDocuments: "Documents calculator",
  calculatorInvestments: "Investment calculator",
  reviewsLabel: "Bank and service reviews",
  financialPulseSection: "Financial Pulse",
  viewAllJournal: "View all",
  chooseService: "Choose service",
  servicesTitle: "Services",
  servicesSubtitle: "Choose a category, compare offers, and continue on official provider websites.",
  viewOffers: "View offers",
  moreDetails: "More details",
  goToProvider: "Go to provider website",
  providerWebsite: "Bank website",
  providerCount: "banks covered",
  offersCount: "offers",
  serviceSummaryTitle: "Service summary",
  providersTitle: "Banks and providers",
  providerCatalogNote: "Logos and services are shown from the current country source catalog.",
  servicesCovered: "Available services",
  noOffers: "No offers are available for this category right now.",
  loadingOffers: "Loading latest offers...",
  liveStatus: "Live data",
  fallbackStatus: "Fallback data",
  mixedStatus: "Mixed data",
  updatedAt: "Updated",
  financialPulse: "Financial Pulse",
  pulseSubtitle: "News feed refreshes every 30 seconds with source fallback support.",
  readSource: "Read source",
  newsError: "Could not load live news. Fallback items are shown.",
  newsLoading: "Refreshing news...",
  newsRefreshNote: "Feed refreshes every 30 seconds.",
  typing: "typing",
  chatTitle: "Bank-your AI Assistant",
  chatPlaceholder: "Type your question...",
  quickCard: "Help me find the best debit card",
  quickInvest: "Compare deposit options in",
  quickMortgage: "Explain mortgage terms",
  aboutTitle: "About platform",
  aboutBody: "Bank-your helps users compare financial products and navigate to official provider websites.",
  contactTitle: "Contact",
  contactSubtitle: "If you are a bank, broker, or fintech partner, contact us for integration.",
  footerAbout: "About Bank-your",
  footerPartners: "Partner Banks",
  footerPrivacy: "Privacy Policy",
  footerContact: "Contact",
  footerDisclaimer: "Offers and rates are informational only. Verify terms on official websites.",
  newsPageTitle: "Market News",
  servicesPageTitle: "Service Catalog",
  businessPageTitle: "Business Solutions",
  businessPageSubtitle: "Compare accounts, acquiring, and company setup services in your selected country.",
  contactEmail: "Email",
  contactPhone: "Phone",
  currentMarket: "Current market",
  allRightsReserved: "All rights reserved.",
  openMenu: "Open menu",
  openAssistant: "Open AI assistant",
  closeAssistant: "Close AI assistant",
  sendMessage: "Send message",
  selectCountry: "Select country",
  selectLanguage: "Select language",
  filtersTitle: "Filters",
  clearFilters: "Clear filters",
  sortBy: "Sort by",
  sortRateAsc: "Rate: low to high",
  sortRateDesc: "Rate: high to low",
  sortFeeAsc: "Fee: low to high",
  sortFeeDesc: "Fee: high to low",
  searchPlaceholder: "Search by product or bank",
  noSearchResults: "No products found for selected filters",
  categoryDebitCards: "Debit Cards",
  categoryCreditCards: "Credit Cards",
  categoryConsumerLoans: "Consumer Loans",
  categoryMortgages: "Mortgages",
  categoryDeposits: "Deposits",
  categoryInvestments: "Investments",
  categoryBusinessServices: "Business Services",
  categoryDocumentAssistance: "Document Assistance"
};

export const RU_TEXT: UiTextShape = {
  ...EN_TEXT,
  navServices: "Сервисы",
  navNews: "Новости",
  navBusiness: "Бизнес",
  navAbout: "О\u00A0нас",
  navContact: "Контакты",
  navCalculators: "Калькуляторы",
  navAcademy: "Обучение",
  navInsurance: "Страхование",
  navLoans: "Кредиты",
  navMortgage: "Ипотека",
  navCards: "Карты",
  navDeposits: "Вклады",
  navJournal: "Финансовый пульс",
  navDebitCards: "Дебетовые карты",
  navCreditCards: "Кредитные карты",
  country: "Страна",
  language: "Язык",
  heroTitle: "Ваш финансовый компас в",
  heroSubtitle: "Сравнивайте карты, кредиты и вклады для выбранного региона.",
  exploreServices: "Смотреть сервисы",
  talkToAssistant: "Поговорить с AI",
  saveMoneyTitle: "Помогаем сохранить деньги",
  saveMoneySubtitle: "Сравнивайте предложения банков и брокеров, следите за ставками и выбирайте лучшие условия.",
  allServices: "Все услуги",
  searchServices: "Поиск по услугам",
  popularProducts: "Популярные продукты",
  marketMonitoring: "Мониторинг рынка",
  ratesByCredits: "Ставки по кредитам",
  bestDeposits: "Выгодные вклады",
  ratesByMortgage: "Ставки по ипотеке",
  checkRate: "Узнать ставку",
  openDeposit: "Открыть вклад",
  checkedIn: "Проверили условия в",
  banksWord: "банках",
  servicesTools: "Сервисы и калькуляторы",
  calculatorCredit: "Кредитный калькулятор",
  calculatorDeposit: "Калькулятор вклада",
  calculatorMortgage: "Ипотечный калькулятор",
  calculatorDebitCard: "Калькулятор дебетовых карт",
  calculatorCreditCard: "Калькулятор кредитных карт",
  calculatorBusiness: "Калькулятор бизнес-услуг",
  calculatorDocuments: "Калькулятор документов",
  calculatorInvestments: "Калькулятор инвестиций",
  reviewsLabel: "Отзывы о банках и сервисах",
  financialPulseSection: "Финансовый пульс",
  viewAllJournal: "Все новости",
  chooseService: "Выберите услугу",
  servicesTitle: "Каталог услуг",
  servicesSubtitle: "Выберите категорию, сравните офферы и перейдите на официальный сайт провайдера.",
  viewOffers: "Смотреть офферы",
  moreDetails: "Подробнее",
  goToProvider: "Перейти на сайт провайдера",
  providerWebsite: "Сайт банка",
  providerCount: "банков в покрытии",
  offersCount: "предложений",
  serviceSummaryTitle: "Краткая сводка услуг",
  providersTitle: "Банки и провайдеры",
  providerCatalogNote: "Логотипы и услуги отображаются из текущего каталога источников по стране.",
  servicesCovered: "Доступные услуги",
  noOffers: "Пока нет доступных предложений по этой категории.",
  loadingOffers: "Загружаем актуальные предложения...",
  liveStatus: "Live-данные",
  fallbackStatus: "Резервные данные",
  mixedStatus: "Частично live",
  updatedAt: "Обновлено",
  financialPulse: "Финансовый пульс",
  pulseSubtitle: "Лента новостей обновляется каждые 30 секунд с автоматическим fallback.",
  readSource: "Источник",
  newsError: "Не удалось загрузить live-новости. Показаны резервные записи.",
  newsLoading: "Обновляем новости...",
  newsRefreshNote: "Лента обновляется каждые 30 секунд.",
  typing: "печатает",
  chatTitle: "AI-помощник Bank-your",
  chatPlaceholder: "Введите вопрос...",
  quickCard: "Помоги выбрать лучшую дебетовую карту",
  quickInvest: "Сравни вклады в",
  quickMortgage: "Объясни условия ипотеки",
  aboutTitle: "О платформе",
  aboutBody: "Bank-your помогает пользователям сравнивать финансовые продукты и переходить на сайты провайдеров.",
  contactTitle: "Контакты",
  contactSubtitle: "Если вы банк, брокер или финтех-партнер, свяжитесь с нами для подключения.",
  footerAbout: "О Bank-your",
  footerPartners: "Банки-партнеры",
  footerPrivacy: "Политика конфиденциальности",
  footerContact: "Контакты",
  footerDisclaimer: "Предложения и ставки носят информационный характер. Проверяйте условия на официальных сайтах.",
  newsPageTitle: "Новости рынка",
  servicesPageTitle: "Каталог услуг",
  businessPageTitle: "Решения для бизнеса",
  businessPageSubtitle: "Сравните счета, эквайринг и сервисы запуска компании в выбранной стране.",
  contactEmail: "Email",
  contactPhone: "Телефон",
  currentMarket: "Текущий рынок",
  allRightsReserved: "Все права защищены.",
  openMenu: "Открыть меню",
  openAssistant: "Открыть AI-помощника",
  closeAssistant: "Закрыть AI-помощника",
  sendMessage: "Отправить сообщение",
  selectCountry: "Выберите страну",
  selectLanguage: "Выберите язык",
  filtersTitle: "Фильтры",
  clearFilters: "Сбросить фильтры",
  sortBy: "Сортировка",
  sortRateAsc: "Ставка: по возрастанию",
  sortRateDesc: "Ставка: по убыванию",
  sortFeeAsc: "Комиссия: по возрастанию",
  sortFeeDesc: "Комиссия: по убыванию",
  searchPlaceholder: "Поиск по продукту или банку",
  noSearchResults: "По выбранным фильтрам ничего не найдено",
  categoryDebitCards: "Дебетовые карты",
  categoryCreditCards: "Кредитные карты",
  categoryConsumerLoans: "Потребительские кредиты",
  categoryMortgages: "Ипотека",
  categoryDeposits: "Вклады",
  categoryInvestments: "Инвестиции",
  categoryBusinessServices: "Услуги для бизнеса",
  categoryDocumentAssistance: "Помощь с документами"
};

function withOverrides(base: UiTextShape, overrides: Partial<UiTextShape>): UiTextShape {
  return {
    ...base,
    ...overrides
  };
}

export const UI_TEXT: Record<LanguageCode, UiTextShape> = {
  ru: RU_TEXT,
  en: EN_TEXT,
  hy: withOverrides(EN_TEXT, {
    language: "Լեզու",
    navServices: "Ծառայություններ",
    navNews: "Նորություններ",
    navBusiness: "Բիզնես",
    navAbout: "Մեր մասին",
    navContact: "Կապ",
    navCalculators: "Հաշվիչներ",
    chooseService: "Ընտրեք ծառայություն",
    servicesPageTitle: "Ծառայությունների կատալոգ",
    financialPulse: "Ֆինանսական պուլս",
    categoryDebitCards: "Դեբետային քարտեր",
    categoryCreditCards: "Վարկային քարտեր",
    categoryConsumerLoans: "Սպառողական վարկեր",
    categoryMortgages: "Հիփոթեք",
    categoryDeposits: "Ավանդներ",
    categoryInvestments: "Ներդրումներ",
    categoryBusinessServices: "Բիզնես ծառայություններ",
    categoryDocumentAssistance: "Փաստաթղթային աջակցություն"
  }),
  be: withOverrides(EN_TEXT, {
    language: "Мова",
    navServices: "Сэрвісы",
    navNews: "Навіны",
    navBusiness: "Бізнес",
    navAbout: "Пра нас",
    navContact: "Кантакты",
    navCalculators: "Калькулятары",
    chooseService: "Выберыце паслугу",
    servicesPageTitle: "Каталог паслуг",
    financialPulse: "Фінансавы пульс",
    categoryDebitCards: "Дэбетавыя карты",
    categoryCreditCards: "Крэдытныя карты",
    categoryConsumerLoans: "Спажывецкія крэдыты",
    categoryMortgages: "Іпатэка",
    categoryDeposits: "Уклады",
    categoryInvestments: "Інвестыцыі",
    categoryBusinessServices: "Паслугі для бізнесу",
    categoryDocumentAssistance: "Дапамога з дакументамі"
  }),
  kk: withOverrides(EN_TEXT, {
    language: "Тіл",
    navServices: "Қызметтер",
    navNews: "Жаңалықтар",
    navBusiness: "Бизнес",
    navAbout: "Біз туралы",
    navContact: "Байланыс",
    navCalculators: "Калькуляторлар",
    chooseService: "Қызметті таңдаңыз",
    servicesPageTitle: "Қызметтер каталогы",
    financialPulse: "Қаржы пульсі",
    categoryDebitCards: "Дебеттік карталар",
    categoryCreditCards: "Кредиттік карталар",
    categoryConsumerLoans: "Тұтынушылық несиелер",
    categoryMortgages: "Ипотека",
    categoryDeposits: "Депозиттер",
    categoryInvestments: "Инвестициялар",
    categoryBusinessServices: "Бизнес қызметтері",
    categoryDocumentAssistance: "Құжаттарға көмек"
  }),
  ka: withOverrides(EN_TEXT, {
    language: "ენა",
    navServices: "სერვისები",
    navNews: "სიახლეები",
    navBusiness: "ბიზნესი",
    navAbout: "ჩვენ შესახებ",
    navContact: "კონტაქტი",
    navCalculators: "კალკულატორები",
    chooseService: "აირჩიეთ სერვისი",
    servicesPageTitle: "სერვისების კატალოგი",
    financialPulse: "ფინანსური პულსი",
    categoryDebitCards: "სადებეტო ბარათები",
    categoryCreditCards: "საკრედიტო ბარათები",
    categoryConsumerLoans: "სამომხმარებლო სესხები",
    categoryMortgages: "იპოთეკა",
    categoryDeposits: "ანაბრები",
    categoryInvestments: "ინვესტიციები",
    categoryBusinessServices: "ბიზნეს სერვისები",
    categoryDocumentAssistance: "დოკუმენტების მხარდაჭერა"
  }),
  az: withOverrides(EN_TEXT, {
    language: "Dil",
    navServices: "Xidmətlər",
    navNews: "Xəbərlər",
    navBusiness: "Biznes",
    navAbout: "Haqqımızda",
    navContact: "Əlaqə",
    navCalculators: "Kalkulyatorlar",
    chooseService: "Xidməti seçin",
    servicesPageTitle: "Xidmət kataloqu",
    financialPulse: "Maliyyə nəbzi",
    categoryDebitCards: "Debet kartları",
    categoryCreditCards: "Kredit kartları",
    categoryConsumerLoans: "İstehlak kreditləri",
    categoryMortgages: "İpoteka",
    categoryDeposits: "Əmanətlər",
    categoryInvestments: "İnvestisiyalar",
    categoryBusinessServices: "Biznes xidmətləri",
    categoryDocumentAssistance: "Sənəd yardımı"
  }),
  ar: withOverrides(EN_TEXT, {
    language: "اللغة",
    navServices: "الخدمات",
    navNews: "الأخبار",
    navBusiness: "الأعمال",
    navAbout: "من نحن",
    navContact: "اتصال",
    navCalculators: "الحاسبات",
    chooseService: "اختر الخدمة",
    servicesPageTitle: "كتالوج الخدمات",
    financialPulse: "النبض المالي",
    categoryDebitCards: "بطاقات الخصم",
    categoryCreditCards: "بطاقات الائتمان",
    categoryConsumerLoans: "القروض الاستهلاكية",
    categoryMortgages: "الرهن العقاري",
    categoryDeposits: "الودائع",
    categoryInvestments: "الاستثمارات",
    categoryBusinessServices: "خدمات الأعمال",
    categoryDocumentAssistance: "مساعدة المستندات"
  }),
  tr: withOverrides(EN_TEXT, {
    language: "Dil",
    navServices: "Hizmetler",
    navNews: "Haberler",
    navBusiness: "İş",
    navAbout: "Hakkında",
    navContact: "İletişim",
    navCalculators: "Hesaplayıcılar",
    chooseService: "Hizmet seçin",
    servicesPageTitle: "Hizmet kataloğu",
    financialPulse: "Finans Nabzı",
    categoryDebitCards: "Banka Kartları",
    categoryCreditCards: "Kredi Kartları",
    categoryConsumerLoans: "Tüketici Kredileri",
    categoryMortgages: "Konut Kredileri",
    categoryDeposits: "Mevduatlar",
    categoryInvestments: "Yatırımlar",
    categoryBusinessServices: "İşletme Hizmetleri",
    categoryDocumentAssistance: "Belge Desteği"
  })
};

export const LANGUAGE_OPTIONS: Array<{ value: LanguageCode; label: string }> = [
  { value: "ru", label: RU_TEXT.langRu },
  { value: "en", label: EN_TEXT.langEn },
  { value: "hy", label: EN_TEXT.langHy },
  { value: "be", label: EN_TEXT.langBe },
  { value: "kk", label: EN_TEXT.langKk },
  { value: "ka", label: EN_TEXT.langKa },
  { value: "az", label: EN_TEXT.langAz },
  { value: "ar", label: EN_TEXT.langAr },
  { value: "tr", label: EN_TEXT.langTr }
];

export const COUNTRY_LABELS: Record<LanguageCode, Record<Country, string>> = {
  ru: {
    armenia: "Армения",
    belarus: "Беларусь",
    kazakhstan: "Казахстан",
    georgia: "Грузия",
    russia: "Россия",
    azerbaijan: "Азербайджан",
    uae: "ОАЭ"
  },
  en: {
    armenia: "Armenia",
    belarus: "Belarus",
    kazakhstan: "Kazakhstan",
    georgia: "Georgia",
    russia: "Russia",
    azerbaijan: "Azerbaijan",
    uae: "UAE"
  },
  hy: {
    armenia: "Հայաստան",
    belarus: "Բելառուս",
    kazakhstan: "Ղազախստան",
    georgia: "Վրաստան",
    russia: "Ռուսաստան",
    azerbaijan: "Ադրբեջան",
    uae: "ԱՄԷ"
  },
  be: {
    armenia: "Арменія",
    belarus: "Беларусь",
    kazakhstan: "Казахстан",
    georgia: "Грузія",
    russia: "Расія",
    azerbaijan: "Азербайджан",
    uae: "ААЭ"
  },
  kk: {
    armenia: "Армения",
    belarus: "Беларусь",
    kazakhstan: "Қазақстан",
    georgia: "Грузия",
    russia: "Ресей",
    azerbaijan: "Әзірбайжан",
    uae: "БАӘ"
  },
  ka: {
    armenia: "სომხეთი",
    belarus: "ბელარუსი",
    kazakhstan: "ყაზახეთი",
    georgia: "საქართველო",
    russia: "რუსეთი",
    azerbaijan: "აზერბაიჯანი",
    uae: "არაბთა გაერთიანებული საამიროები"
  },
  az: {
    armenia: "Ermənistan",
    belarus: "Belarus",
    kazakhstan: "Qazaxıstan",
    georgia: "Gürcüstan",
    russia: "Rusiya",
    azerbaijan: "Azərbaycan",
    uae: "BƏƏ"
  },
  ar: {
    armenia: "أرمينيا",
    belarus: "بيلاروس",
    kazakhstan: "كازاخستان",
    georgia: "جورجيا",
    russia: "روسيا",
    azerbaijan: "أذربيجان",
    uae: "الإمارات"
  },
  tr: {
    armenia: "Ermenistan",
    belarus: "Belarus",
    kazakhstan: "Kazakistan",
    georgia: "Gürcistan",
    russia: "Rusya",
    azerbaijan: "Azerbaycan",
    uae: "BAE"
  }
};

const CATEGORY_TITLE_BY_KEY: Record<LanguageCode, Record<ProductCategory, string>> = {
  ru: {
    debit_cards: RU_TEXT.categoryDebitCards,
    credit_cards: RU_TEXT.categoryCreditCards,
    consumer_loans: RU_TEXT.categoryConsumerLoans,
    mortgages: RU_TEXT.categoryMortgages,
    deposits: RU_TEXT.categoryDeposits,
    investments: RU_TEXT.categoryDeposits,
    business_services: RU_TEXT.categoryBusinessServices,
    document_assistance: RU_TEXT.categoryDocumentAssistance
  },
  en: {
    debit_cards: EN_TEXT.categoryDebitCards,
    credit_cards: EN_TEXT.categoryCreditCards,
    consumer_loans: EN_TEXT.categoryConsumerLoans,
    mortgages: EN_TEXT.categoryMortgages,
    deposits: EN_TEXT.categoryDeposits,
    investments: EN_TEXT.categoryDeposits,
    business_services: EN_TEXT.categoryBusinessServices,
    document_assistance: EN_TEXT.categoryDocumentAssistance
  },
  hy: {
    debit_cards: UI_TEXT.hy.categoryDebitCards,
    credit_cards: UI_TEXT.hy.categoryCreditCards,
    consumer_loans: UI_TEXT.hy.categoryConsumerLoans,
    mortgages: UI_TEXT.hy.categoryMortgages,
    deposits: UI_TEXT.hy.categoryDeposits,
    investments: UI_TEXT.hy.categoryDeposits,
    business_services: UI_TEXT.hy.categoryBusinessServices,
    document_assistance: UI_TEXT.hy.categoryDocumentAssistance
  },
  be: {
    debit_cards: UI_TEXT.be.categoryDebitCards,
    credit_cards: UI_TEXT.be.categoryCreditCards,
    consumer_loans: UI_TEXT.be.categoryConsumerLoans,
    mortgages: UI_TEXT.be.categoryMortgages,
    deposits: UI_TEXT.be.categoryDeposits,
    investments: UI_TEXT.be.categoryDeposits,
    business_services: UI_TEXT.be.categoryBusinessServices,
    document_assistance: UI_TEXT.be.categoryDocumentAssistance
  },
  kk: {
    debit_cards: UI_TEXT.kk.categoryDebitCards,
    credit_cards: UI_TEXT.kk.categoryCreditCards,
    consumer_loans: UI_TEXT.kk.categoryConsumerLoans,
    mortgages: UI_TEXT.kk.categoryMortgages,
    deposits: UI_TEXT.kk.categoryDeposits,
    investments: UI_TEXT.kk.categoryDeposits,
    business_services: UI_TEXT.kk.categoryBusinessServices,
    document_assistance: UI_TEXT.kk.categoryDocumentAssistance
  },
  ka: {
    debit_cards: UI_TEXT.ka.categoryDebitCards,
    credit_cards: UI_TEXT.ka.categoryCreditCards,
    consumer_loans: UI_TEXT.ka.categoryConsumerLoans,
    mortgages: UI_TEXT.ka.categoryMortgages,
    deposits: UI_TEXT.ka.categoryDeposits,
    investments: UI_TEXT.ka.categoryDeposits,
    business_services: UI_TEXT.ka.categoryBusinessServices,
    document_assistance: UI_TEXT.ka.categoryDocumentAssistance
  },
  az: {
    debit_cards: UI_TEXT.az.categoryDebitCards,
    credit_cards: UI_TEXT.az.categoryCreditCards,
    consumer_loans: UI_TEXT.az.categoryConsumerLoans,
    mortgages: UI_TEXT.az.categoryMortgages,
    deposits: UI_TEXT.az.categoryDeposits,
    investments: UI_TEXT.az.categoryDeposits,
    business_services: UI_TEXT.az.categoryBusinessServices,
    document_assistance: UI_TEXT.az.categoryDocumentAssistance
  },
  ar: {
    debit_cards: UI_TEXT.ar.categoryDebitCards,
    credit_cards: UI_TEXT.ar.categoryCreditCards,
    consumer_loans: UI_TEXT.ar.categoryConsumerLoans,
    mortgages: UI_TEXT.ar.categoryMortgages,
    deposits: UI_TEXT.ar.categoryDeposits,
    investments: UI_TEXT.ar.categoryDeposits,
    business_services: UI_TEXT.ar.categoryBusinessServices,
    document_assistance: UI_TEXT.ar.categoryDocumentAssistance
  },
  tr: {
    debit_cards: UI_TEXT.tr.categoryDebitCards,
    credit_cards: UI_TEXT.tr.categoryCreditCards,
    consumer_loans: UI_TEXT.tr.categoryConsumerLoans,
    mortgages: UI_TEXT.tr.categoryMortgages,
    deposits: UI_TEXT.tr.categoryDeposits,
    investments: UI_TEXT.tr.categoryDeposits,
    business_services: UI_TEXT.tr.categoryBusinessServices,
    document_assistance: UI_TEXT.tr.categoryDocumentAssistance
  }
};

export function getCountryLabel(country: Country, locale: Locale): string {
  return COUNTRY_LABELS[locale]?.[country] ?? COUNTRY_LABELS.en[country];
}

export function getCategoryLabel(category: ProductCategory, locale: Locale): string {
  return CATEGORY_TITLE_BY_KEY[locale]?.[category] ?? CATEGORY_TITLE_BY_KEY.en[category];
}
