import { Country, ProductItem, ProductCategory } from "@/lib/types";

interface ScraperConfig {
  timeout?: number;
  retries?: number;
  userAgent?: string;
}

const DEFAULT_CONFIG: ScraperConfig = {
  timeout: 10000,
  retries: 2,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};

export interface BankProductSource {
  bankId: string;
  bankName: string;
  logoUrl: string;
  products: Partial<ProductItem>[];
  country: Country;
  scrapedAt: string;
  source: "bank_site";
}

/**
 * Fetches HTML from a URL with retry logic
 */
async function fetchWithRetry(
  url: string,
  config: ScraperConfig = DEFAULT_CONFIG
): Promise<string> {
  const timeout = config.timeout ?? 10000;
  const retries = config.retries ?? 2;
  const userAgent = config.userAgent ?? DEFAULT_CONFIG.userAgent;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent || DEFAULT_CONFIG.userAgent || ""
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to fetch URL after retries");
}

/**
 * Extract JSON-LD data from HTML
 */
function extractJsonLd<T = Record<string, unknown>>(html: string, type?: string): T[] {
  const results: T[] = [];

  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]) as T;
      if (!type || (json && typeof json === "object" && "type" in json)) {
        results.push(json);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return results;
}

/**
 * Extract product data from common HTML patterns
 */
function extractProductsFromHtml(
  html: string,
  bankId: string,
  bankName: string,
  category: ProductCategory
): Partial<ProductItem>[] {
  const products: Partial<ProductItem>[] = [];

  // Try to find product listings in common patterns
  const patterns = [
    /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<article[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/article>/gi,
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/li>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const productHtml = match[0];

      // Extract title
      const titleMatch = productHtml.match(
        /<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<title[^>]*>([^<]+)<\/title>/i
      );
      const name = titleMatch?.[1] || titleMatch?.[2] || "Unknown Product";

      // Extract description
      const descMatch = productHtml.match(
        /<(p|span|div)[^>]*class=".*?description.*?"[^>]*>([^<]+)<\/(p|span|div)>/i
      );
      const description = descMatch?.[2] || "";

      // Extract URL
      const urlMatch = productHtml.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
      const url = urlMatch?.[1] || "";

      products.push({
        id: `${bankId}-${category}-${products.length}`,
        bankId,
        bankName,
        category,
        name,
        description,
        url,
        source: "bank_site",
        params: []
      });
    }
  }

  return products;
}

/**
 * Scrape products from a bank website
 */
export async function scrapeBankProducts(
  bankId: string,
  bankName: string,
  bankLogoUrl: string,
  serviceUrl: string,
  category: ProductCategory,
  country: Country,
  config?: ScraperConfig
): Promise<BankProductSource | null> {
  try {
    const html = await fetchWithRetry(serviceUrl, config);

    // Try to extract from JSON-LD first
    let products = extractJsonLd<Partial<ProductItem>>(html, "Product");

    // If no JSON-LD products, try HTML patterns
    if (products.length === 0) {
      products = extractProductsFromHtml(html, bankId, bankName, category);
    }

    if (products.length === 0) {
      console.warn(`No products found for ${bankName} - ${category}`);
      return null;
    }

    // Enrich products with consistent data
    const enrichedProducts = products.map((p) => ({
      ...p,
      id: p.id || `${bankId}-${category}-${Math.random()}`,
      bankId,
      bankName,
      bankLogoUrl,
      category,
      source: "bank_site" as const,
      params: p.params || []
    }));

    return {
      bankId,
      bankName,
      logoUrl: bankLogoUrl,
      products: enrichedProducts,
      country,
      scrapedAt: new Date().toISOString(),
      source: "bank_site"
    };
  } catch (error) {
    console.error(`Failed to scrape ${bankName}:`, error);
    return null;
  }
}

/**
 * Batch scrape multiple banks
 */
export async function scrapeBanksData(
  banksToScrape: Array<{
    bankId: string;
    bankName: string;
    logoUrl: string;
    serviceUrl: string;
    category: ProductCategory;
    country: Country;
  }>,
  config?: ScraperConfig
): Promise<BankProductSource[]> {
  const results: BankProductSource[] = [];

  // Process in batches to avoid overwhelming servers
  const batchSize = 3;
  for (let i = 0; i < banksToScrape.length; i += batchSize) {
    const batch = banksToScrape.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((bank) =>
        scrapeBankProducts(
          bank.bankId,
          bank.bankName,
          bank.logoUrl,
          bank.serviceUrl,
          bank.category,
          bank.country,
          config
        )
      )
    );

    results.push(...batchResults.filter((r) => r !== null));

    // Add delay between batches to be respectful to servers
    if (i + batchSize < banksToScrape.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}
