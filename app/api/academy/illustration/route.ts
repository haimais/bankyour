import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function slugToPalette(slug: string) {
  const hash = crypto.createHash("sha1").update(slug).digest();
  const hue = hash[0] % 360;
  const accentHue = (hue + 42 + (hash[1] % 50)) % 360;
  return {
    primary: `hsla(${hue}, 84%, 56%, 0.9)`,
    secondary: `hsla(${accentHue}, 80%, 62%, 0.78)`,
    stroke: `hsla(${(hue + 12) % 360}, 90%, 28%, 0.55)`
  };
}

function shortLabel(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function sanitizeSlug(value: string) {
  return value.replace(/[^a-z0-9-_]/gi, "").slice(0, 48) || "lesson";
}

export async function GET(request: NextRequest) {
  const slug = sanitizeSlug(request.nextUrl.searchParams.get("slug") ?? "lesson");
  const palette = slugToPalette(slug);
  const label = shortLabel(slug);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.primary}" />
      <stop offset="100%" stop-color="${palette.secondary}" />
    </linearGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
    </pattern>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1280" height="720" fill="transparent"/>
  <rect x="36" y="36" width="1208" height="648" rx="46" fill="url(#g1)"/>
  <rect x="36" y="36" width="1208" height="648" rx="46" fill="url(#grid)"/>

  <circle cx="260" cy="230" r="120" fill="rgba(255,255,255,0.26)" filter="url(#blur)" />
  <circle cx="960" cy="490" r="160" fill="rgba(255,255,255,0.2)" filter="url(#blur)" />

  <g transform="translate(148 168)">
    <rect x="0" y="0" width="500" height="250" rx="28" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)"/>
    <text x="36" y="70" fill="white" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${slug
      .replace(/-/g, " ")
      .slice(0, 34)}</text>
    <text x="36" y="122" fill="rgba(255,255,255,0.95)" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="700">${label}</text>
    <rect x="36" y="162" width="210" height="16" rx="8" fill="rgba(255,255,255,0.6)"/>
    <rect x="36" y="192" width="320" height="12" rx="6" fill="rgba(255,255,255,0.46)"/>
  </g>

  <g transform="translate(720 148)">
    <rect x="0" y="0" width="400" height="424" rx="32" fill="rgba(15,23,42,0.22)" stroke="rgba(255,255,255,0.3)"/>
    <rect x="34" y="40" width="332" height="18" rx="9" fill="rgba(255,255,255,0.74)"/>
    <rect x="34" y="78" width="264" height="14" rx="7" fill="rgba(255,255,255,0.54)"/>
    <rect x="34" y="116" width="332" height="126" rx="18" fill="rgba(255,255,255,0.22)"/>
    <rect x="34" y="262" width="332" height="126" rx="18" fill="rgba(255,255,255,0.18)"/>
  </g>
</svg>`.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
