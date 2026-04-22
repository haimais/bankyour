import { Country, CurrencyCode } from "@/lib/types";

interface ExchangeRateProvider {
  name: string;
  fetchRates: (baseCurrency: CurrencyCode) => Promise<Record<CurrencyCode, number>>;
}

// Mock provider for real-time FX updates
const mockFetchRates = async (
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number>> => {
  // In production, this would call:
  // - Free Forex API
  // - ECB API
  // - OpenExchangeRates
  // - Custom bank APIs

  const mockRates: Record<string, Record<CurrencyCode, number>> = {
    USD: {
      USD: 1,
      AMD: 401.5,
      BYN: 3.25,
      KZT: 495.2,
      GEL: 2.78,
      RUB: 95.3,
      AZN: 1.7,
      AED: 3.67
    },
    RUB: {
      USD: 0.0105,
      AMD: 4.21,
      BYN: 0.034,
      KZT: 5.19,
      GEL: 0.029,
      RUB: 1,
      AZN: 0.0178,
      AED: 0.0385
    }
  };

  return mockRates[baseCurrency] || mockRates.USD;
};

export const FX_PROVIDERS: Record<string, ExchangeRateProvider> = {
  mock: {
    name: "Mock Provider",
    fetchRates: mockFetchRates
  }
};

/**
 * Fetch real-time exchange rates
 */
export async function getRealTimeExchangeRates(
  baseCurrency: CurrencyCode = "USD",
  provider: string = "mock"
): Promise<Record<CurrencyCode, number>> {
  const fxProvider = FX_PROVIDERS[provider];

  if (!fxProvider) {
    console.warn(`Unknown FX provider: ${provider}, using mock`);
    return mockFetchRates(baseCurrency);
  }

  try {
    return await fxProvider.fetchRates(baseCurrency);
  } catch (error) {
    console.error(`FX provider error (${provider}):`, error);
    // Fallback to mock
    return mockFetchRates(baseCurrency);
  }
}

/**
 * Get rates for specific country
 */
export async function getCountryExchangeRates(
  country: Country
): Promise<Record<string, Record<CurrencyCode, number>>> {
  const countryToCurrency: Record<Country, CurrencyCode> = {
    armenia: "AMD",
    belarus: "BYN",
    kazakhstan: "KZT",
    georgia: "GEL",
    russia: "RUB",
    azerbaijan: "AZN",
    uae: "AED"
  };

  const baseCurrency = countryToCurrency[country] || "RUB";
  const rates = await getRealTimeExchangeRates(baseCurrency);

  return {
    base: rates,
    usd: await getRealTimeExchangeRates("USD")
  };
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<CurrencyCode, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  return (amount / fromRate) * toRate;
}

/**
 * Format exchange rate display
 */
export function formatExchangeRate(
  rate: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  precision: number = 2
): string {
  return `1 ${fromCurrency} = ${rate.toFixed(precision)} ${toCurrency}`;
}
