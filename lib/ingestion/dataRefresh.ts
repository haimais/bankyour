import { Country, ProductCategory } from "@/lib/types";
import { scrapeBanksData } from "@/lib/scraper/bankScraper";
import { fetchFinancialNewsFromSources } from "@/lib/news/newsSources";
import { BANKS_BY_COUNTRY, getProxyLogoUrl } from "@/data/banks";

interface ScrapingTask {
  bankId: string;
  bankName: string;
  logoUrl: string;
  serviceUrl: string;
  category: ProductCategory;
  country: Country;
}

interface DataRefreshReport {
  timestamp: string;
  country: Country;
  status: "success" | "partial" | "failed";
  products: {
    scraped: number;
    updated: number;
    errors: string[];
  };
  news: {
    fetched: number;
    errors: string[];
  };
  duration: number;
}

/**
 * Collect all products to scrape for a country
 */
function prepareScrapingTasks(
  country: Country
): ScrapingTask[] {
  const banks = BANKS_BY_COUNTRY[country] ?? [];
  const tasks: ScrapingTask[] = [];

  const categories: ProductCategory[] = [
    "debit_cards",
    "credit_cards",
    "consumer_loans",
    "mortgages",
    "deposits",
    "investments",
    "business_services",
    "document_assistance"
  ];

  for (const bank of banks) {
    for (const category of categories) {
      const serviceKey = (
        category.includes("card")
          ? "cards"
          : category.includes("loan") || category.includes("mortgage")
            ? "loans"
            : category.includes("deposit") || category.includes("investment")
              ? "deposits"
              : "business"
      ) as "cards" | "loans" | "deposits" | "business";

      const serviceUrl = bank.serviceUrls[serviceKey];
      if (serviceUrl) {
        tasks.push({
          bankId: bank.id,
          bankName: bank.name,
          logoUrl: getProxyLogoUrl(bank.website),
          serviceUrl,
          category,
          country
        });
      }
    }
  }

  return tasks;
}

/**
 * Refresh products for a single country
 */
async function refreshCountryProducts(country: Country): Promise<DataRefreshReport> {
  const startTime = Date.now();
  const report: DataRefreshReport = {
    timestamp: new Date().toISOString(),
    country,
    status: "success",
    products: { scraped: 0, updated: 0, errors: [] },
    news: { fetched: 0, errors: [] },
    duration: 0
  };

  try {
    console.log(`[refresh] Starting data collection for ${country}`);

    // Prepare scraping tasks
    const tasks = prepareScrapingTasks(country);
    console.log(`[refresh] Found ${tasks.length} scraping tasks for ${country}`);

    // Scrape products
    if (tasks.length > 0) {
      try {
        const scrapedData = await scrapeBanksData(tasks);
        report.products.scraped = scrapedData.length;

        // In production, save to database
        console.log(`[refresh] Successfully scraped ${scrapedData.length} data sources`);

        // Count total products
        let totalProducts = 0;
        for (const data of scrapedData) {
          totalProducts += data.products.length;
        }
        report.products.updated = totalProducts;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        report.products.errors.push(`Scraping failed: ${msg}`);
        report.status = report.products.scraped > 0 ? "partial" : "failed";
      }
    }

    // Fetch news
    try {
      const news = await fetchFinancialNewsFromSources(country);
      report.news.fetched = news.length;
      console.log(`[refresh] Fetched ${news.length} news items for ${country}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      report.news.errors.push(`News fetch failed: ${msg}`);
      if (report.products.scraped === 0) {
        report.status = "failed";
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[refresh] Fatal error for ${country}:`, msg);
    report.status = "failed";
    report.products.errors.push(`Fatal error: ${msg}`);
  }

  report.duration = Date.now() - startTime;
  return report;
}

/**
 * Refresh FX rates
 */
async function refreshFxRates(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[refresh] Refreshing FX rates...");

    // In production, this would:
    // 1. Fetch latest exchange rates from external API
    // 2. Update Redis cache
    // 3. Update PostgreSQL database
    // For now, we just log it
    console.log("[refresh] FX rates refresh completed");

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[refresh] FX rates refresh failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Main refresh cycle - runs all data collection
 */
export async function runRefreshCycle(): Promise<{
  status: "success" | "partial" | "failed";
  reports: DataRefreshReport[];
  fxRefresh: { success: boolean; error?: string };
  totalDuration: number;
}> {
  const cycleStartTime = Date.now();
  const countries: Country[] = [
    "armenia",
    "belarus",
    "kazakhstan",
    "georgia",
    "russia",
    "azerbaijan",
    "uae"
  ];

  console.log(
    `\n${"=".repeat(60)}\n[refresh] Starting data refresh cycle at ${new Date().toISOString()}\n${"=".repeat(60)}`
  );

  const reports: DataRefreshReport[] = [];

  // Refresh products for each country
  for (const country of countries) {
    const report = await refreshCountryProducts(country);
    reports.push(report);

    console.log(
      `[refresh] ${country}: status=${report.status}, products=${report.products.scraped}, news=${report.news.fetched}, duration=${report.duration}ms`
    );

    // Delay between countries
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Refresh FX rates
  const fxRefresh = await refreshFxRates();

  const totalDuration = Date.now() - cycleStartTime;
  const hasFailures = reports.some((r) => r.status === "failed");
  const overallStatus = hasFailures
    ? "failed"
    : reports.some((r) => r.status === "partial")
      ? "partial"
      : "success";

  console.log(
    `\n[refresh] Cycle completed: status=${overallStatus}, duration=${totalDuration}ms\n${"=".repeat(60)}\n`
  );

  return {
    status: overallStatus,
    reports,
    fxRefresh,
    totalDuration
  };
}

export async function logRefreshStatus(
  reports: DataRefreshReport[]
): Promise<void> {
  console.log("\n=== REFRESH STATUS REPORT ===\n");

  let totalProducts = 0;
  let totalNews = 0;
  let errorCount = 0;

  for (const report of reports) {
    console.log(`${report.country.toUpperCase()}: ${report.status}`);
    console.log(`  ├─ Products: ${report.products.updated} items (${report.products.scraped} sources)`);
    console.log(`  ├─ News: ${report.news.fetched} items`);
    console.log(`  └─ Duration: ${report.duration}ms`);

    if (report.products.errors.length > 0) {
      report.products.errors.forEach((err) => {
        console.log(`     ⚠️  ${err}`);
      });
      errorCount++;
    }

    totalProducts += report.products.updated;
    totalNews += report.news.fetched;
  }

  console.log("\n=== TOTALS ===");
  console.log(`Total Products Updated: ${totalProducts}`);
  console.log(`Total News Items: ${totalNews}`);
  console.log(`Failed Countries: ${errorCount}/${reports.length}`);
  console.log("");
}
