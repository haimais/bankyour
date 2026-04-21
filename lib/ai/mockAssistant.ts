import { Country, Locale, ServiceType } from "@/lib/types";

const DISCLAIMER =
  "Важно: эта рекомендация носит общий информационный характер и не является индивидуальной финансовой консультацией. Перед оформлением продукта внимательно изучите условия на официальном сайте банка или брокера.";

const COUNTRY_NAME: Record<Country, string> = {
  armenia: "Армении",
  belarus: "Беларуси",
  kazakhstan: "Казахстане",
  georgia: "Грузии",
  russia: "России",
  azerbaijan: "Азербайджане",
  uae: "ОАЭ"
};

interface AssistantContext {
  country: Country;
  serviceType?: ServiceType;
  userMessage: string;
  locale?: Locale;
}

function includesAny(input: string, words: string[]) {
  return words.some((word) => input.includes(word));
}

export function generateMockAssistantReply({
  country,
  serviceType,
  userMessage,
  locale = "ru"
}: AssistantContext): string {
  const normalized = userMessage.toLowerCase();
  const isRu = locale === "ru";
  const disclaimer = isRu
    ? DISCLAIMER
    : "Important: this recommendation is general information and not individual financial advice. Check final terms on the official bank or broker website.";

  if (
    includesAny(normalized, [
      "cvv",
      "паспорт",
      "номер карты",
      "one-time code",
      "otp",
      "sms код",
      "код из смс"
    ])
  ) {
    return isRu
      ? "Пожалуйста, не отправляйте в чат конфиденциальные данные: паспорт, полный номер карты, CVV/CVC или одноразовые коды. Для безопасности удалите такие данные и отправьте вопрос без личной информации."
      : "Do not share sensitive data in chat: passport details, full card number, CVV/CVC, or one-time codes.";
  }

  if (
    includesAny(normalized, [
      "что выбрать",
      "посовет",
      "лучший",
      "какой",
      "recommend",
      "choose"
    ])
  ) {
    return isRu
      ? [
          `Чтобы подобрать вариант для ${COUNTRY_NAME[country]}, уточню 4 коротких вопроса:`,
          "1) Какой у вас приоритет: экономия на комиссиях, кэшбэк или надежность?",
          "2) Горизонт цели: до 1 года, 1-3 года или больше 3 лет?",
          "3) Уровень риска: низкий, умеренный или высокий?",
          "4) В какой валюте удобно держать основной баланс?",
          "",
          "После ответов дам 2-4 варианта с плюсами и минусами и подскажу, где это открыть на сайте Bank-your.",
          disclaimer
        ].join("\n")
      : [
          `To choose the right option for ${COUNTRY_NAME[country]}, I need 4 quick details:`,
          "1) Priority: lower fees, cashback, or reliability?",
          "2) Goal horizon: under 1 year, 1-3 years, or 3+ years?",
          "3) Risk level: low, moderate, or high?",
          "4) Preferred currency for your main balance?",
          "",
          "After that, I will suggest 2-4 options with pros/cons and where to open them on Bank-your.",
          disclaimer
        ].join("\n");
  }

  if (
    includesAny(normalized, [
      "карта",
      "дебет",
      "кредит",
      "cashback",
      "card"
    ]) || serviceType === "cards"
  ) {
    return isRu
      ? [
          "Для карт смотрите 5 ключевых параметров:",
          "• стоимость обслуживания (годовая/ежемесячная)",
          "• кэшбэк и ограничения по категориям",
          "• лимиты на переводы и снятие наличных",
          "• комиссии за онлайн-покупки и конвертацию",
          "• безопасность: 3D Secure, пуш-уведомления, виртуальная карта",
          "",
          `Откройте раздел «Credit & Debit Cards» для рынка в ${COUNTRY_NAME[country]} и сравните карточки по кнопке Go to provider website.`,
          disclaimer
        ].join("\n")
      : [
          "For cards, compare 5 key parameters:",
          "• maintenance fee (monthly/yearly)",
          "• cashback and category caps",
          "• transfer and cash withdrawal limits",
          "• online purchase and FX conversion commissions",
          "• security options: 3D Secure, push alerts, virtual cards",
          "",
          `Open “Credit & Debit Cards” for ${COUNTRY_NAME[country]} and compare offers before going to provider website.`,
          disclaimer
        ].join("\n");
  }

  if (
    includesAny(normalized, ["ипотек", "кредит", "loan", "mortgage"]) ||
    serviceType === "loans"
  ) {
    return isRu
      ? [
          "По займам и ипотеке рекомендую сравнить:",
          "• ставку (примерную) и полную стоимость кредита",
          "• срок и итоговую переплату",
          "• минимальный первоначальный взнос",
          "• комиссии/штрафы и возможность досрочного погашения",
          "",
          "На Bank-your откройте раздел Loans & Mortgages, затем перейдите в карточку оффера и нажмите Go to provider website для точных условий.",
          disclaimer
        ].join("\n")
      : [
          "For loans and mortgages, compare:",
          "• approximate rate and full cost of credit",
          "• term and total overpayment",
          "• minimum down payment",
          "• commissions, penalties, and early repayment terms",
          "",
          "In Bank-your, open Loans & Mortgages and use Go to provider website for final terms.",
          disclaimer
        ].join("\n");
  }

  if (
    includesAny(normalized, ["вклад", "депозит", "инвест", "etf", "deposit"]) ||
    serviceType === "deposits"
  ) {
    return isRu
      ? [
          "Для вкладов и инвестиций полезно сравнивать:",
          "• ожидаемую доходность (как ориентир, не гарантия)",
          "• срок размещения и ликвидность",
          "• минимальную сумму входа",
          "• риски: рыночный, валютный, процентный",
          "",
          `В разделе Deposits & Investments для ${COUNTRY_NAME[country]} можно быстро сопоставить консервативные и более доходные варианты.`,
          disclaimer
        ].join("\n")
      : [
          "For deposits and investments, compare:",
          "• expected yield (reference only, not guaranteed)",
          "• term and liquidity",
          "• minimum entry amount",
          "• risks: market, currency, and rate risk",
          "",
          `In Deposits & Investments for ${COUNTRY_NAME[country]}, compare conservative and higher-yield options.`,
          disclaimer
        ].join("\n");
  }

  if (
    includesAny(normalized, ["бизнес", "компани", "acquiring", "merchant"]) ||
    serviceType === "business"
  ) {
    return isRu
      ? [
          "Для бизнеса начните с трех шагов:",
          "1) Выберите тип услуги: расчетный счет, эквайринг или регистрация компании.",
          "2) Сравните тариф обслуживания, комиссии и срок подключения.",
          "3) Проверьте список документов перед подачей заявки.",
          "",
          "В Bank-your это находится в блоке Business Services, далее используйте кнопку Go to provider website.",
          disclaimer
        ].join("\n")
      : [
          "For business services, start with 3 steps:",
          "1) Pick the service type: account, acquiring, or company setup.",
          "2) Compare maintenance fee, commissions, and onboarding timeline.",
          "3) Check required documents before submission.",
          "",
          "In Bank-your, open Business Services and use Go to provider website.",
          disclaimer
        ].join("\n");
  }

  if (
    includesAny(normalized, ["документ", "справк", "paper", "document"]) ||
    serviceType === "documents"
  ) {
    return isRu
      ? [
          "Обычно для финансовых заявок нужны:",
          "• документ, удостоверяющий личность",
          "• подтверждение дохода/оборота",
          "• документы по залогу или регистрации бизнеса (если требуется)",
          "",
          "В блоке Document Assistance есть готовые варианты помощи по подготовке пакета.",
          disclaimer
        ].join("\n")
      : [
          "Typical documents for financial applications:",
          "• identity document",
          "• income/turnover confirmation",
          "• collateral or business registration documents (if required)",
          "",
          "Open Document Assistance for preparation support options.",
          disclaimer
        ].join("\n");
  }

  return isRu
    ? [
        `Я могу помочь по рынку ${COUNTRY_NAME[country]}: карты, кредиты, вклады/инвестиции, бизнес-услуги и документы.`,
        "Если вы не знаете, с чего начать, откройте Services и выберите нужную категорию, затем сравните офферы и перейдите на сайт провайдера для оформления.",
        disclaimer
      ].join("\n")
    : [
        `I can help with ${COUNTRY_NAME[country]} market: cards, loans, deposits/investments, business services, and documents.`,
        "If you are not sure where to start, open Services, choose a category, compare offers, and continue on provider website.",
        disclaimer
      ].join("\n");
}
