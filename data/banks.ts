import { Country, ServiceType } from "@/lib/types";

export interface BankCatalogEntry {
  id: string;
  name: string;
  website: string;
  serviceUrls: Partial<Record<ServiceType, string>>;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getLogoUrl(website: string): string {
  try {
    const parsed = new URL(website);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    const domain = getDomain(website);
    if (!domain) {
      return "";
    }
    return `https://${domain}/favicon.ico`;
  }
}

export function getProxyLogoUrl(website: string): string {
  if (!website) {
    return "";
  }

  return `/api/logo?url=${encodeURIComponent(website)}`;
}

export const BANKS_BY_COUNTRY: Record<Country, BankCatalogEntry[]> = {
  armenia: [
    {
      id: "am-ameriabank",
      name: "Ameriabank",
      website: "https://www.ameriabank.am",
      serviceUrls: {
        cards: "https://www.ameriabank.am/en/retail/cards",
        loans: "https://www.ameriabank.am/en/retail/loans",
        deposits: "https://www.ameriabank.am/en/retail/deposits",
        business: "https://www.ameriabank.am/en/business"
      }
    },
    {
      id: "am-acba",
      name: "ACBA Bank",
      website: "https://www.acba.am",
      serviceUrls: {
        cards: "https://www.acba.am/en/individual/cards",
        loans: "https://www.acba.am/en/individual/loans",
        deposits: "https://www.acba.am/en/individual/deposits",
        business: "https://www.acba.am/en/business"
      }
    },
    {
      id: "am-ardshinbank",
      name: "Ardshinbank",
      website: "https://www.ardshinbank.am",
      serviceUrls: {
        cards: "https://www.ardshinbank.am/en/individuals/cards",
        loans: "https://www.ardshinbank.am/en/individuals/loans",
        deposits: "https://www.ardshinbank.am/en/individuals/deposits",
        business: "https://www.ardshinbank.am/en/business"
      }
    },
    {
      id: "am-ineco",
      name: "Inecobank",
      website: "https://www.inecobank.am",
      serviceUrls: {
        cards: "https://www.inecobank.am/en/for-individuals/cards/",
        loans: "https://www.inecobank.am/en/for-individuals/loans/",
        deposits: "https://www.inecobank.am/en/for-individuals/deposits/",
        business: "https://www.inecobank.am/en/business/"
      }
    },
    {
      id: "am-evoca",
      name: "Evoca Bank",
      website: "https://www.evoca.am",
      serviceUrls: {
        cards: "https://www.evoca.am/en/cards",
        loans: "https://www.evoca.am/en/loans",
        deposits: "https://www.evoca.am/en/deposits",
        business: "https://www.evoca.am/en/business"
      }
    }
  ],
  belarus: [
    {
      id: "by-belarusbank",
      name: "Belarusbank",
      website: "https://belarusbank.by",
      serviceUrls: {
        cards: "https://belarusbank.by/en/fizicheskim-licam/193",
        loans: "https://belarusbank.by/en/fizicheskim-licam/credits",
        deposits: "https://belarusbank.by/en/fizicheskim-licam/deposits",
        business: "https://belarusbank.by/en/malomu-i-srednemu-biznesu"
      }
    },
    {
      id: "by-belagroprom",
      name: "Belagroprombank",
      website: "https://www.belapb.by",
      serviceUrls: {
        cards: "https://www.belapb.by/eng/fizicheskim-licam/cards/",
        loans: "https://www.belapb.by/eng/fizicheskim-licam/credits/",
        deposits: "https://www.belapb.by/eng/fizicheskim-licam/deposits/",
        business: "https://www.belapb.by/eng/korporativnym-klientam/"
      }
    },
    {
      id: "by-belinvest",
      name: "Belinvestbank",
      website: "https://www.belinvestbank.by",
      serviceUrls: {
        cards: "https://www.belinvestbank.by/individual/cards",
        loans: "https://www.belinvestbank.by/individual/credits",
        deposits: "https://www.belinvestbank.by/individual/deposits",
        business: "https://www.belinvestbank.by/corporate"
      }
    },
    {
      id: "by-prior",
      name: "Priorbank",
      website: "https://www.priorbank.by",
      serviceUrls: {
        cards: "https://www.priorbank.by/cards",
        loans: "https://www.priorbank.by/credits",
        deposits: "https://www.priorbank.by/deposits",
        business: "https://www.priorbank.by/business"
      }
    },
    {
      id: "by-bsb",
      name: "BSB Bank",
      website: "https://www.bsb.by",
      serviceUrls: {
        cards: "https://www.bsb.by/en/private/cards/",
        loans: "https://www.bsb.by/en/private/credits/",
        deposits: "https://www.bsb.by/en/private/deposits/",
        business: "https://www.bsb.by/en/business/"
      }
    }
  ],
  kazakhstan: [
    {
      id: "kz-halyk",
      name: "Halyk Bank",
      website: "https://halykbank.kz",
      serviceUrls: {
        cards: "https://halykbank.kz/en/cards",
        loans: "https://halykbank.kz/en/loans",
        deposits: "https://halykbank.kz/en/deposits",
        business: "https://halykbank.kz/en/business"
      }
    },
    {
      id: "kz-kaspi",
      name: "Kaspi Bank",
      website: "https://kaspi.kz",
      serviceUrls: {
        cards: "https://kaspi.kz/shop/c/kaspi-gold/",
        loans: "https://kaspi.kz/shop/c/credit/",
        business: "https://kaspi.kz/business/"
      }
    },
    {
      id: "kz-bcc",
      name: "Bank CenterCredit",
      website: "https://www.bcc.kz",
      serviceUrls: {
        cards: "https://www.bcc.kz/en/private-clients/payment-cards/",
        loans: "https://www.bcc.kz/en/private-clients/credits/",
        deposits: "https://www.bcc.kz/en/personal/deposits/",
        business: "https://www.bcc.kz/en/business/"
      }
    },
    {
      id: "kz-freedom",
      name: "Freedom Bank",
      website: "https://bankffin.kz",
      serviceUrls: {
        cards: "https://bankffin.kz/en/cards",
        loans: "https://bankffin.kz/en/credits",
        deposits: "https://bankffin.kz/en/deposits",
        business: "https://bankffin.kz/en/business"
      }
    },
    {
      id: "kz-jusan",
      name: "Jusan Bank",
      website: "https://jusan.kz",
      serviceUrls: {
        cards: "https://jusan.kz/en/cards",
        loans: "https://jusan.kz/en/loans",
        deposits: "https://jusan.kz/en/deposits",
        business: "https://jusan.kz/en/business"
      }
    }
  ],
  georgia: [
    {
      id: "ge-bog",
      name: "Bank of Georgia",
      website: "https://bankofgeorgia.ge",
      serviceUrls: {
        cards: "https://bankofgeorgia.ge/en/personal/cards",
        loans: "https://bankofgeorgia.ge/en/personal/loans",
        deposits: "https://bankofgeorgia.ge/en/personal/deposits",
        business: "https://bankofgeorgia.ge/en/business"
      }
    },
    {
      id: "ge-tbc",
      name: "TBC Bank",
      website: "https://tbcbank.ge",
      serviceUrls: {
        cards: "https://www.tbcbank.ge/web/en/web/guest/cards",
        loans: "https://www.tbcbank.ge/web/en/web/guest/loans",
        deposits: "https://www.tbcbank.ge/web/en/web/guest/deposits",
        business: "https://www.tbcbank.ge/web/en/web/guest/business"
      }
    },
    {
      id: "ge-liberty",
      name: "Liberty Bank",
      website: "https://libertybank.ge",
      serviceUrls: {
        cards: "https://libertybank.ge/en/retail/cards",
        loans: "https://libertybank.ge/en/retail/loans",
        deposits: "https://libertybank.ge/en/retail/deposits",
        business: "https://libertybank.ge/en/business"
      }
    },
    {
      id: "ge-credo",
      name: "Credo Bank",
      website: "https://credobank.ge",
      serviceUrls: {
        cards: "https://credobank.ge/en/for-individuals/cards/",
        loans: "https://credobank.ge/en/for-individuals/loans/",
        deposits: "https://credobank.ge/en/for-individuals/deposits/",
        business: "https://credobank.ge/en/business/"
      }
    },
    {
      id: "ge-basis",
      name: "Basisbank",
      website: "https://basisbank.ge",
      serviceUrls: {
        cards: "https://basisbank.ge/en/retail/cards",
        loans: "https://basisbank.ge/en/retail/loans",
        deposits: "https://basisbank.ge/en/retail/deposits",
        business: "https://basisbank.ge/en/business"
      }
    }
  ],
  russia: [
    {
      id: "ru-sber",
      name: "Sber",
      website: "https://www.sberbank.ru",
      serviceUrls: {
        cards: "https://www.sberbank.ru/ru/person/bank_cards/debit",
        loans: "https://www.sberbank.ru/ru/person/credits",
        deposits: "https://www.sberbank.ru/ru/person/contributions",
        business: "https://www.sberbank.ru/ru/s_m_business"
      }
    },
    {
      id: "ru-vtb",
      name: "VTB",
      website: "https://www.vtb.ru",
      serviceUrls: {
        cards: "https://www.vtb.ru/personal/karty/debetovye/",
        loans: "https://www.vtb.ru/personal/kredit/",
        deposits: "https://www.vtb.ru/personal/vklady-i-scheta/",
        business: "https://www.vtb.ru/malyj-biznes/"
      }
    },
    {
      id: "ru-alfa",
      name: "Alfa-Bank",
      website: "https://alfabank.ru",
      serviceUrls: {
        cards: "https://alfabank.ru/everyday/debit-cards/",
        loans: "https://alfabank.ru/get-money/credit/",
        deposits: "https://alfabank.ru/make-money/deposits/",
        business: "https://alfabank.ru/sme/"
      }
    },
    {
      id: "ru-gpb",
      name: "Gazprombank",
      website: "https://www.gazprombank.ru",
      serviceUrls: {
        cards: "https://www.gazprombank.ru/personal/cards/",
        loans: "https://www.gazprombank.ru/personal/credits/",
        deposits: "https://www.gazprombank.ru/personal/page/deposits/",
        business: "https://www.gazprombank.ru/business/"
      }
    },
    {
      id: "ru-tbank",
      name: "T-Bank",
      website: "https://www.tbank.ru",
      serviceUrls: {
        cards: "https://www.tbank.ru/cards/debit-cards/",
        loans: "https://www.tbank.ru/loans/cash-loan/",
        deposits: "https://www.tbank.ru/invest/",
        business: "https://www.tbank.ru/business/"
      }
    },
    {
      id: "ru-sovcom",
      name: "Sovcombank",
      website: "https://sovcombank.ru",
      serviceUrls: {
        cards: "https://sovcombank.ru/cards",
        loans: "https://sovcombank.ru/credits",
        deposits: "https://sovcombank.ru/deposits",
        business: "https://sovcombank.ru/business"
      }
    }
  ],
  azerbaijan: [
    {
      id: "az-kapital",
      name: "Kapital Bank",
      website: "https://www.kapitalbank.az",
      serviceUrls: {
        cards: "https://www.kapitalbank.az/en/cards",
        loans: "https://www.kapitalbank.az/en/credits",
        deposits: "https://www.kapitalbank.az/en/deposits",
        business: "https://www.kapitalbank.az/en/business-banking"
      }
    },
    {
      id: "az-abb",
      name: "ABB",
      website: "https://abb-bank.az",
      serviceUrls: {
        cards: "https://abb-bank.az/en/card",
        loans: "https://abb-bank.az/en/loan",
        deposits: "https://abb-bank.az/en/deposit",
        business: "https://abb-bank.az/en/corporate"
      }
    },
    {
      id: "az-pasha",
      name: "PASHA Bank",
      website: "https://www.pashabank.az",
      serviceUrls: {
        loans: "https://www.pashabank.az/en/sme/financing",
        deposits: "https://www.pashabank.az/en/sme/deposits",
        business: "https://www.pashabank.az/en/sme"
      }
    },
    {
      id: "az-unibank",
      name: "Unibank",
      website: "https://unibank.az",
      serviceUrls: {
        cards: "https://unibank.az/en/cards/",
        loans: "https://unibank.az/en/loans/",
        deposits: "https://unibank.az/en/deposits/",
        business: "https://unibank.az/en/business/"
      }
    },
    {
      id: "az-yelo",
      name: "Yelo Bank",
      website: "https://www.yelo.az",
      serviceUrls: {
        cards: "https://www.yelo.az/en/individuals/cards",
        loans: "https://www.yelo.az/en/individuals/credits",
        deposits: "https://www.yelo.az/en/individuals/deposits",
        business: "https://www.yelo.az/en/business"
      }
    }
  ],
  uae: [
    {
      id: "ae-emirates-nbd",
      name: "Emirates NBD",
      website: "https://www.emiratesnbd.com",
      serviceUrls: {
        cards: "https://www.emiratesnbd.com/en/cards/credit-cards",
        loans: "https://www.emiratesnbd.com/en/loans/personal-loan",
        deposits: "https://www.emiratesnbd.com/en/accounts/savings-accounts",
        business: "https://www.emiratesnbd.com/en/business-banking"
      }
    },
    {
      id: "ae-fab",
      name: "First Abu Dhabi Bank",
      website: "https://www.bankfab.com",
      serviceUrls: {
        cards: "https://www.bankfab.com/en-ae/personal/cards",
        loans: "https://www.bankfab.com/en-ae/personal/borrow",
        deposits: "https://www.bankfab.com/en-ae/personal/save",
        business: "https://www.bankfab.com/en-ae/business-banking"
      }
    },
    {
      id: "ae-adcb",
      name: "ADCB",
      website: "https://www.adcb.com",
      serviceUrls: {
        cards: "https://www.adcb.com/en/personal/cards",
        loans: "https://www.adcb.com/en/personal/loans",
        deposits: "https://www.adcb.com/en/personal/accounts",
        business: "https://www.adcb.com/en/business"
      }
    },
    {
      id: "ae-hsbc",
      name: "HSBC UAE",
      website: "https://www.hsbc.ae",
      serviceUrls: {
        cards: "https://www.hsbc.ae/credit-cards/",
        loans: "https://www.hsbc.ae/loans/",
        deposits: "https://www.hsbc.ae/savings-accounts/",
        business: "https://www.hsbc.ae/business-banking/"
      }
    },
    {
      id: "ae-adib",
      name: "ADIB",
      website: "https://www.adib.ae",
      serviceUrls: {
        cards: "https://www.adib.ae/en/personal/cards",
        loans: "https://www.adib.ae/en/personal/finance",
        deposits: "https://www.adib.ae/en/personal/accounts",
        business: "https://www.adib.ae/en/business"
      }
    }
  ]
};
