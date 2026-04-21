import { COUNTRY_OPTIONS, COUNTRIES_BY_VALUE, formatMoney } from "@/data/countries";
import { getLogoUrl } from "@/data/banks";
import { Country, CountryOffers, Offer, OffersByCountry } from "@/lib/types";

type BaseOffer = Omit<Offer, "providerName" | "providerLogoUrl" | "serviceType">;

function cardOffers(country: Country): BaseOffer[] {
  const countryMeta = COUNTRIES_BY_VALUE[country];

  return [
    {
      id: `${country}-card-1`,
      name: `${countryMeta.label} Cashback Everyday`,
      description:
        "Debit card focused on groceries, subscriptions, and transport with transparent monthly limits.",
      details:
        "Good fit for daily spending and online payments. Usually includes free app notifications and optional virtual card issuance for safer subscriptions.",
      params: [
        { label: "Cashback", value: "5% in selected categories" },
        { label: "Annual fee", value: `${formatMoney(country, 0)} / year` },
        { label: "Currency", value: countryMeta.currencyCode },
        { label: "Monthly limit", value: formatMoney(country, 500000) }
      ],
      url: "https://bank-example.ru/cashback"
    },
    {
      id: `${country}-card-2`,
      name: `${countryMeta.label} Travel Premium`,
      description:
        "Card with travel rewards, lounge access options, and elevated purchase protection.",
      details:
        "Suitable for frequent travelers who can justify annual fees with miles, insurance coverage, and airport benefits.",
      params: [
        { label: "Cashback", value: "3% + travel points" },
        { label: "Annual fee", value: `${formatMoney(country, 1999)} / year` },
        { label: "Currency", value: countryMeta.currencyCode },
        { label: "Credit limit", value: formatMoney(country, 1500000) }
      ],
      url: "https://bank-example.com/travel"
    },
    {
      id: `${country}-card-3`,
      name: `${countryMeta.label} Smart Youth`,
      description:
        "Low-cost card for students and early-career professionals with spending analytics.",
      details:
        "Best for users who value no-fee maintenance and easy budgeting. Usually offers a simple onboarding process.",
      params: [
        { label: "Cashback", value: "2% on online services" },
        { label: "Annual fee", value: `${formatMoney(country, 0)} / year` },
        { label: "Currency", value: countryMeta.currencyCode },
        { label: "ATM withdrawals", value: "Free up to 3 times/month" }
      ],
      url: "https://bank-example.ru/youth"
    }
  ];
}

function loanOffers(country: Country): BaseOffer[] {
  return [
    {
      id: `${country}-loan-1`,
      name: "Flex Personal Loan",
      description:
        "Unsecured consumer loan with predictable monthly payments and early repayment options.",
      details:
        "Commonly used for repairs, medical expenses, or major purchases. Final rates vary by income proof and credit history.",
      params: [
        { label: "Rate", value: "11.5% - 18.0%" },
        { label: "Term", value: "12-60 months" },
        { label: "Minimum amount", value: formatMoney(country, 100000) },
        { label: "Decision speed", value: "Same day for pre-approved users" }
      ],
      url: "https://bank-example.ru/personal-loan"
    },
    {
      id: `${country}-loan-2`,
      name: "Home Start Mortgage",
      description:
        "Mortgage offer for primary housing with fixed or mixed-rate scenarios.",
      details:
        "Useful for buyers comparing payment stability against long-term cost. Insurance and down payment requirements differ by provider.",
      params: [
        { label: "Rate", value: "8.9% - 13.5%" },
        { label: "Term", value: "5-30 years" },
        { label: "Minimum amount", value: formatMoney(country, 2500000) },
        { label: "Down payment", value: "From 15%" }
      ],
      url: "https://bank-example.com/mortgage"
    },
    {
      id: `${country}-loan-3`,
      name: "Auto Drive Loan",
      description:
        "Loan program for new and used car purchases with flexible collateral options.",
      details:
        "Can be combined with dealer campaigns. Total cost depends on insurance bundles, initial contribution, and vehicle class.",
      params: [
        { label: "Rate", value: "10.5% - 16.0%" },
        { label: "Term", value: "12-84 months" },
        { label: "Minimum amount", value: formatMoney(country, 800000) },
        { label: "Initial payment", value: "From 10%" }
      ],
      url: "https://bank-example.com/auto-loan"
    }
  ];
}

function depositOffers(country: Country): BaseOffer[] {
  return [
    {
      id: `${country}-deposit-1`,
      name: "Stable Income Deposit",
      description:
        "Term deposit with monthly interest payout and low risk profile.",
      details:
        "Designed for conservative savers who prefer predictable returns. Early withdrawal usually lowers the final yield.",
      params: [
        { label: "Yield", value: "7.0% - 10.5% annual" },
        { label: "Term", value: "6-24 months" },
        { label: "Minimum amount", value: formatMoney(country, 100000) },
        { label: "Payout", value: "Monthly or at maturity" }
      ],
      url: "https://bank-example.ru/deposit"
    },
    {
      id: `${country}-deposit-2`,
      name: "Balanced ETF Portfolio",
      description:
        "Broker package of bonds and broad-market ETFs for medium-term goals.",
      details:
        "Expected returns are not guaranteed. Appropriate for users ready for moderate volatility and a 2-5 year horizon.",
      params: [
        { label: "Expected yield", value: "8% - 14% annual" },
        { label: "Horizon", value: "2-5 years" },
        { label: "Minimum amount", value: formatMoney(country, 250000) },
        { label: "Risk level", value: "Low to medium" }
      ],
      url: "https://broker-example.com/portfolio"
    },
    {
      id: `${country}-deposit-3`,
      name: "FX Liquidity Savings",
      description:
        "Foreign-currency savings account for diversified reserves and flexible access.",
      details:
        "Useful when users need liquidity in major currencies. Rates may be lower than local-currency term deposits.",
      params: [
        { label: "Yield", value: "2.5% - 5.0% annual" },
        { label: "Term", value: "No fixed lock-up" },
        { label: "Minimum amount", value: formatMoney(country, 50000) },
        { label: "Available currencies", value: "USD / EUR / local" }
      ],
      url: "https://bank-example.com/fx-savings"
    }
  ];
}

function businessOffers(country: Country): BaseOffer[] {
  return [
    {
      id: `${country}-business-1`,
      name: "Business Current Account",
      description:
        "Settlement account package with online banking, payroll tools, and API payments.",
      details:
        "Best for SMEs that need frequent domestic transfers and role-based access for finance teams.",
      params: [
        { label: "Setup fee", value: formatMoney(country, 0) },
        { label: "Monthly fee", value: formatMoney(country, 3500) },
        { label: "Payments included", value: "Up to 50 per month" },
        { label: "Onboarding", value: "1-3 business days" }
      ],
      url: "https://bank-example.ru/business-account"
    },
    {
      id: `${country}-business-2`,
      name: "Merchant Acquiring Pro",
      description:
        "Card payment acceptance for online and offline sales channels.",
      details:
        "Supports QR, POS, and gateway acquiring. Final commission depends on turnover and business category.",
      params: [
        { label: "Acquiring fee", value: "1.3% - 2.2%" },
        { label: "Connection", value: `${formatMoney(country, 0)} - ${formatMoney(country, 15000)}` },
        { label: "Settlement period", value: "T+1 to T+2" },
        { label: "Channels", value: "POS / E-commerce / QR" }
      ],
      url: "https://bank-example.com/acquiring"
    },
    {
      id: `${country}-business-3`,
      name: "Company Launch Assistance",
      description:
        "Service for legal entity registration with templates and filing support.",
      details:
        "Includes checklist for founders, standard charter templates, and high-level tax regime guidance.",
      params: [
        { label: "Service fee", value: `${formatMoney(country, 12000)} from` },
        { label: "Timeline", value: "3-10 business days" },
        { label: "Includes", value: "Draft forms + filing support" },
        { label: "Suitable for", value: "New SME founders" }
      ],
      url: "https://bank-example.ru/company-open"
    }
  ];
}

function documentOffers(country: Country): BaseOffer[] {
  return [
    {
      id: `${country}-docs-1`,
      name: "Loan Documents Checklist",
      description:
        "Preparation help for income proof, identity documents, and collateral files.",
      details:
        "Reduces back-and-forth with banks by validating file completeness before submission.",
      params: [
        { label: "Service fee", value: `${formatMoney(country, 5000)} from` },
        { label: "Turnaround", value: "24-48 hours" },
        { label: "Scope", value: "Consumer + mortgage applications" },
        { label: "Format", value: "Digital and paper" }
      ],
      url: "https://bank-example.com/docs-loan"
    },
    {
      id: `${country}-docs-2`,
      name: "Business Compliance Pack",
      description:
        "Template package for KYC, account opening, and counterparty checks.",
      details:
        "Helps founders prepare standard legal and beneficiary documents used by banks and payment providers.",
      params: [
        { label: "Service fee", value: `${formatMoney(country, 15000)} from` },
        { label: "Turnaround", value: "2-5 business days" },
        { label: "Includes", value: "KYC and onboarding forms" },
        { label: "Support", value: "Email + call consultation" }
      ],
      url: "https://broker-example.com/business-docs"
    },
    {
      id: `${country}-docs-3`,
      name: "Verified Translation Support",
      description:
        "Certified translation coordination for cross-border banking requirements.",
      details:
        "Useful for expats and international founders who need notarized or certified copies in specific languages.",
      params: [
        { label: "Service fee", value: `${formatMoney(country, 8000)} from` },
        { label: "Turnaround", value: "1-4 business days" },
        { label: "Use cases", value: "Accounts, licenses, investor docs" },
        { label: "Delivery", value: "Digital + courier" }
      ],
      url: "https://bank-example.ru/translation"
    }
  ];
}

function buildCountryOffers(country: Country): CountryOffers {
  const countryMeta = COUNTRIES_BY_VALUE[country];
  const fallbackProvider = `${countryMeta.label} Finance Network`;
  const fallbackLogo = getLogoUrl("https://bank-example.com");

  function enrich(offers: BaseOffer[], serviceType: keyof CountryOffers): Offer[] {
    return offers.map((offer) => ({
      ...offer,
      providerName: fallbackProvider,
      providerLogoUrl: fallbackLogo,
      serviceType
    }));
  }

  return {
    cards: enrich(cardOffers(country), "cards"),
    loans: enrich(loanOffers(country), "loans"),
    deposits: enrich(depositOffers(country), "deposits"),
    business: enrich(businessOffers(country), "business"),
    documents: enrich(documentOffers(country), "documents")
  };
}

export const OFFERS_BY_COUNTRY: OffersByCountry = COUNTRY_OPTIONS.reduce(
  (acc, country) => {
    acc[country.value] = buildCountryOffers(country.value);
    return acc;
  },
  {} as OffersByCountry
);
