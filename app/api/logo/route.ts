import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function fallbackSvg(letter = "B") {
  const safeLetter = letter.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "B";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#DBEAFE"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#1D4ED8" font-size="20" font-family="Arial">${safeLetter}</text></svg>`;
}

function sanitizeUrl(raw: string) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function fallbackImage(letter?: string) {
  return new NextResponse(fallbackSvg(letter), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function getMonogramFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./i, "");
    return hostname.slice(0, 1).toUpperCase() || "B";
  } catch {
    return "B";
  }
}

async function fetchImageCandidate(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      return null;
    }
    return response;
  } catch {
    return null;
  }
}

function pickHtmlLogoCandidate(html: string, baseUrl: URL): string | null {
  const patterns = [
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const href = match?.[1]?.trim();
    if (!href) {
      continue;
    }
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return fallbackImage("B");
  }

  const safeUrl = sanitizeUrl(urlParam);
  if (!safeUrl) {
    return fallbackImage("B");
  }

  let base: URL;
  try {
    base = new URL(safeUrl);
  } catch {
    return fallbackImage(getMonogramFromUrl(safeUrl));
  }

  const candidates = [
    new URL("/favicon.ico", base.origin).toString(),
    new URL("/favicon.png", base.origin).toString(),
    new URL("/apple-touch-icon.png", base.origin).toString()
  ];

  for (const candidate of candidates) {
    const response = await fetchImageCandidate(candidate);
    if (!response) {
      continue;
    }
    const bytes = await response.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/x-icon",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }

  try {
    const htmlResponse = await fetch(base.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "Bank-your/1.0 (+https://bank-your.local)"
      }
    });
    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const htmlCandidate = pickHtmlLogoCandidate(html, base);
      if (htmlCandidate) {
        const response = await fetchImageCandidate(htmlCandidate);
        if (response) {
          const bytes = await response.arrayBuffer();
          return new NextResponse(bytes, {
            status: 200,
            headers: {
              "Content-Type": response.headers.get("content-type") ?? "image/png",
              "Cache-Control": "public, max-age=3600"
            }
          });
        }
      }
    }
  } catch {
    return fallbackImage(getMonogramFromUrl(base.toString()));
  }

  return fallbackImage(getMonogramFromUrl(base.toString()));
}
