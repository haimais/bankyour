import { Country } from "@/lib/types";

interface NewsSource {
  name: string;
  url: string;
  countries: Country[];
  rssFeeds?: string[];
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  country: Country;
  category: "finance" | "banking" | "forex" | "investment";
  publishedAt: string;
  imageUrl?: string;
}

const FINANCIAL_NEWS_SOURCES: NewsSource[] = [
  {
    name: "RBC Finance",
    url: "https://www.rbc.ru",
    countries: ["russia"],
    rssFeeds: ["https://rss.rbc.ru/finance/"]
  },
  {
    name: "Interfax",
    url: "https://www.interfax.ru",
    countries: ["russia"],
    rssFeeds: ["https://www.interfax.ru/rss.asp"]
  },
  {
    name: "TASS",
    url: "https://tass.ru",
    countries: ["russia", "belarus", "kazakhstan"],
    rssFeeds: ["https://tass.ru/rss/v2.xml"]
  },
  {
    name: "Armstat",
    url: "https://www.armstat.am",
    countries: ["armenia"]
  },
  {
    name: "Statistics Georgia",
    url: "https://www.geostat.ge",
    countries: ["georgia"]
  },
  {
    name: "FINMARKET",
    url: "https://www.finmarket.ru",
    countries: ["russia"],
    rssFeeds: ["https://www.finmarket.ru/rss/lenta.xml"]
  }
];

/**
 * Parse RSS feed and extract news items
 */
async function parseRssFeed(feedUrl: string, country: Country): Promise<NewsItem[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BankYourBot/1.0; +https://bank-your.com)"
      }
    });

    if (!response.ok) {
      return [];
    }

    const xmlText = await response.text();

    // Simple XML parsing for RSS
    const items: NewsItem[] = [];
    const itemRegex =
      /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = itemXml.match(/<description[^>]*>([^<]+)<\/description>/i);
      const linkMatch = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        items.push({
          id: `${country}-${Date.now()}-${Math.random()}`,
          title: titleMatch[1],
          description: descMatch?.[1] || "",
          url: linkMatch[1],
          source: "RSS Feed",
          country,
          category: "finance",
          publishedAt: pubDateMatch?.[1] || new Date().toISOString()
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Failed to parse RSS feed ${feedUrl}:`, error);
    return [];
  }
}

/**Fetch financial news from multiple sources
 */
export async function fetchFinancialNewsFromSources(
  country: Country
): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  const sources = FINANCIAL_NEWS_SOURCES.filter((s) => s.countries.includes(country));

  for (const source of sources) {
    if (source.rssFeeds && source.rssFeeds.length > 0) {
      for (const feed of source.rssFeeds) {
        const items = await parseRssFeed(feed, country);
        allNews.push(...items);
      }
    }
  }

  // Sort by date and remove duplicates
  return allNews
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.title === item.title)
    )
    .slice(0, 20); // Return top 20 news
}

/**
 * Get news highlights by category
 */
export function getNewsHighlights(news: NewsItem[], category: string): NewsItem[] {
  return news
    .filter((item) => item.category === category)
    .slice(0, 5);
}
