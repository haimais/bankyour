import { NewsItem } from "@/lib/types";

const now = Date.now();

const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();

export const NEWS_MOCK: NewsItem[] = [
  {
    id: "news-1",
    title: "Central Bank of Russia reviews key rate path",
    summary:
      "Officials signaled a data-driven approach to inflation stabilization and household lending dynamics.",
    tag: "Banking",
    country: "Russia",
    publishedAt: minutesAgo(12),
    url: "https://news-example.com/article-1"
  },
  {
    id: "news-2",
    title: "Kazakhstan banks expand mobile onboarding",
    summary:
      "Major lenders introduced fully digital account opening flows with stronger anti-fraud checks.",
    tag: "Fintech",
    country: "Kazakhstan",
    publishedAt: minutesAgo(25),
    url: "https://news-example.com/article-2"
  },
  {
    id: "news-3",
    title: "UAE brokerages launch lower-cost ETF plans",
    summary:
      "New investment bundles target first-time investors with periodic contribution options.",
    tag: "Stocks",
    country: "UAE",
    publishedAt: minutesAgo(34),
    url: "https://news-example.com/article-3"
  },
  {
    id: "news-4",
    title: "Armenia payment rails improve transfer speeds",
    summary:
      "Domestic transfer settlements became faster for retail and SME banking clients.",
    tag: "Banking",
    country: "Armenia",
    publishedAt: minutesAgo(41),
    url: "https://news-example.com/article-4"
  },
  {
    id: "news-5",
    title: "Belarus fintech firms pilot new SME tools",
    summary:
      "Accounting and payment integrations are reducing operational load for small businesses.",
    tag: "Fintech",
    country: "Belarus",
    publishedAt: minutesAgo(55),
    url: "https://news-example.com/article-5"
  },
  {
    id: "news-6",
    title: "Georgia FX market sees narrower spreads",
    summary:
      "Retail forex providers reported tighter spreads amid improved liquidity conditions.",
    tag: "Forex",
    country: "Georgia",
    publishedAt: minutesAgo(68),
    url: "https://news-example.com/article-6"
  },
  {
    id: "news-7",
    title: "Azerbaijan banks increase green finance quotas",
    summary:
      "New lending quotas support energy efficiency projects for households and businesses.",
    tag: "Banking",
    country: "Azerbaijan",
    publishedAt: minutesAgo(84),
    url: "https://news-example.com/article-7"
  },
  {
    id: "news-8",
    title: "Regional crypto activity remains mixed",
    summary:
      "Market observers highlight risk controls and custody practices as key focus areas.",
    tag: "Crypto",
    country: "Regional",
    publishedAt: minutesAgo(95),
    url: "https://news-example.com/article-8"
  },
  {
    id: "news-9",
    title: "Cross-border settlements become faster in CIS corridor",
    summary:
      "Banks are testing shared standards for faster invoice matching and reconciliation.",
    tag: "Banking",
    country: "Regional",
    publishedAt: minutesAgo(107),
    url: "https://news-example.com/article-9"
  },
  {
    id: "news-10",
    title: "Broker APIs gain traction with retail apps",
    summary:
      "More personal finance apps now support portfolio sync and transaction categorization.",
    tag: "Stocks",
    country: "Regional",
    publishedAt: minutesAgo(123),
    url: "https://news-example.com/article-10"
  },
  {
    id: "news-11",
    title: "UAE banks update mortgage pre-approval flows",
    summary:
      "Customers can now compare provisional mortgage scenarios in fewer application steps.",
    tag: "Banking",
    country: "UAE",
    publishedAt: minutesAgo(137),
    url: "https://news-example.com/article-11"
  },
  {
    id: "news-12",
    title: "Russia digital investment accounts post steady inflows",
    summary:
      "Retail investors continued gradual allocations to bond-heavy model portfolios.",
    tag: "Stocks",
    country: "Russia",
    publishedAt: minutesAgo(149),
    url: "https://news-example.com/article-12"
  },
  {
    id: "news-13",
    title: "Kazakhstan card issuers tighten anti-fraud controls",
    summary:
      "Banks rolled out additional transaction monitoring for subscription and e-commerce payments.",
    tag: "Fintech",
    country: "Kazakhstan",
    publishedAt: minutesAgo(162),
    url: "https://news-example.com/article-13"
  },
  {
    id: "news-14",
    title: "Georgia investment platforms add bond screeners",
    summary:
      "Retail tools now expose maturity, duration, and coupon filters for easier comparisons.",
    tag: "Stocks",
    country: "Georgia",
    publishedAt: minutesAgo(177),
    url: "https://news-example.com/article-14"
  }
];
