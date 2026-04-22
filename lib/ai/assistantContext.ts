import { Country, ProductItem, Offer } from "@/lib/types";

/**
 * Build AI context from current products and offers
 */
export function buildAiContext(params: {
  country: Country;
  products?: ProductItem[];
  offers?: Offer[];
  selectedProductId?: string;
}): string {
  const { country, products = [], offers = [], selectedProductId } = params;

  const lines: string[] = [];

  lines.push("=== CURRENT CONTEXT ===");
  lines.push(`Country: ${country}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);

  if (selectedProductId && products.length > 0) {
    const product = products.find((p) => p.id === selectedProductId);
    if (product) {
      lines.push("\n=== SELECTED PRODUCT ===");
      lines.push(`Name: ${product.name}`);
      lines.push(`Category: ${product.category}`);
      lines.push(`Bank: ${product.bankName}`);
      lines.push(`Description: ${product.description}`);

      if (product.params && product.params.length > 0) {
        lines.push("\nProduct Parameters:");
        product.params.forEach((p) => {
          lines.push(`  - ${p.label}: ${p.value}`);
        });
      }

      if (product.url) {
        lines.push(`URL: ${product.url}`);
      }
    }
  }

  if (offers.length > 0) {
    lines.push("\n=== AVAILABLE OFFERS ===");
    offers.slice(0, 5).forEach((offer) => {
      lines.push(`\n- ${offer.name}`);
      lines.push(`  Provider: ${offer.providerName}`);
      lines.push(`  Service: ${offer.serviceType}`);
      if (offer.description) {
        lines.push(`  Description: ${offer.description}`);
      }
    });
  }

  if (products.length > 0) {
    const categoriesSet = new Set<string>();
    products.forEach((p) => categoriesSet.add(p.category));
    const categories = Array.from(categoriesSet);
    lines.push(`\n=== AVAILABLE CATEGORIES ===`);
    lines.push(categories.join(", "));
  }

  return lines.join("\n");
}

/**
 * Extract relevant products for AI response
 */
export function extractRelevantProducts(
  products: ProductItem[],
  query: string,
  limit: number = 5
): ProductItem[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  const scored = products.map((product) => {
    let score = 0;

    const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();

    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });

    // Category bonus
    if (
      (queryLower.includes("card") && product.category.includes("card")) ||
      (queryLower.includes("loan") && product.category.includes("loan")) ||
      (queryLower.includes("deposit") && product.category.includes("deposit"))
    ) {
      score += 2;
    }

    return { product, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.product);
}

/**
 * Generate disclaimer for financial advice
 */
export function getFinancialAdviceDisclaimer(locale: string = "ru"): string {
  if (locale === "ru") {
    return "\n\n⚠️ **Важно**: Эта рекомендация носит общий информационный характер и не является индивидуальной финансовой консультацией. Перед оформлением продукта внимательно изучите условия на официальном сайте банка и проконсультируйтесь с финансовым советником.";
  }

  return "\n\n⚠️ **Important**: This recommendation is general information only and does not constitute personal financial advice. Before applying for any product, carefully review the terms on the bank's official website and consult with a financial advisor.";
}

/**
 * Prepare summary of financial products for AI
 */
export function prepareBankProductsSummary(products: ProductItem[]): string {
  const groupedByCategory: Record<string, ProductItem[]> = {};

  products.forEach((product) => {
    if (!groupedByCategory[product.category]) {
      groupedByCategory[product.category] = [];
    }
    groupedByCategory[product.category].push(product);
  });

  const lines: string[] = ["=== AVAILABLE BANK PRODUCTS ===\n"];

  Object.entries(groupedByCategory).forEach(([category, items]) => {
    lines.push(`**${category}** (${items.length} products):`);
    items.slice(0, 3).forEach((item) => {
      lines.push(`  • ${item.bankName}: ${item.name}`);
    });
    lines.push("");
  });

  return lines.join("\n");
}
