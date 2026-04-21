import { ServiceType } from "@/lib/types";

export interface ServiceCategory {
  key: ServiceType;
  anchor: string;
  title: {
    ru: string;
    en: string;
  };
  description: {
    ru: string;
    en: string;
  };
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: "cards",
    anchor: "cards",
    title: {
      ru: "Кредитные и дебетовые карты",
      en: "Credit & Debit Cards"
    },
    description: {
      ru: "Кэшбэк, travel-бонусы, безопасные онлайн-платежи и контроль ежедневных трат.",
      en: "Cashback, travel perks, secure online payments, and day-to-day spending control."
    }
  },
  {
    key: "loans",
    anchor: "loans",
    title: {
      ru: "Кредиты и ипотека",
      en: "Loans & Mortgages"
    },
    description: {
      ru: "Сравнивайте ставки, сроки и переплату для крупных финансовых решений.",
      en: "Compare rates, terms, and overpayment scenarios for major life purchases."
    }
  },
  {
    key: "deposits",
    anchor: "deposits",
    title: {
      ru: "Вклады и накопления",
      en: "Deposits & Savings"
    },
    description: {
      ru: "Консервативные накопительные продукты и депозитные решения по выбранной стране.",
      en: "Conservative savings products and deposit options by selected country."
    }
  },
  {
    key: "business",
    anchor: "business",
    title: {
      ru: "Услуги для бизнеса",
      en: "Business Services"
    },
    description: {
      ru: "Регистрация компании, расчетные счета и эквайринг для локального рынка.",
      en: "Company setup, settlement accounts, and acquiring for local operations."
    }
  },
  {
    key: "documents",
    anchor: "documents",
    title: {
      ru: "Помощь с документами",
      en: "Document Assistance"
    },
    description: {
      ru: "Разберитесь в документах для счетов, кредитов и регистрации юрлица.",
      en: "Understand paperwork requirements for accounts, loans, and legal entities."
    }
  }
];
