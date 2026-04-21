# Bank-your V9.3 (Yandex-first News + Visual Reboot + Expo Go Auto-Link)

Fintech aggregator with country-aware catalog, Financial Pulse, internal AI assistant, smart search, calculators, Business Hub, expanded Academy, and Expo iPhone app.

## Stack
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons

## Implemented V8 modules
- Multi-page UX (`/`, `/services`, `/search`, `/news`, `/pulse/[id]`, `/business`, `/about`, `/contact`, `/calculators/*`)
- Academy UX (`/academy`, `/academy/module/[slug]`, `/academy/lesson/[slug]`) with quizzes and illustrations
- Expanded Academy content model: 20 modules and 60 lessons (RU canonical, translated per locale)
- 7 user-facing product categories:
  - `debit_cards`, `credit_cards`, `consumer_loans`, `mortgages`, `deposits`, `business_services`, `document_assistance`
- Legacy `investments` links are automatically mapped to `deposits` in user flows.
- Snapshot-based catalog API:
  - `GET /api/catalog`
  - `GET /api/catalog/bank-groups`
  - `GET /api/catalog/banks/:bankId/products`
  - `GET /api/banks`
  - `GET /api/search`
  - `GET /api/coverage` (all countries coverage report)
- Financial Pulse (Yandex + trusted feeds, no Google RSS dependency):
  - `GET /api/pulse`
  - `GET /api/pulse/:id` (full article extraction + translation + summary + key points)
  - `GET /api/news/providers/health`
  - Inline popup widget on `/news` with summary + key points + full text blocks
- Search widget API:
  - `GET /api/search/widget`
- FX monitor APIs:
  - `GET /api/fx`
  - `GET /api/fx/history`
- Business Hub:
  - `GET /api/business/articles`
  - `GET /api/business/articles/:slug`
  - `GET /api/business/banks`
  - `POST /api/business/chat`
- Academy API:
  - `GET /api/academy`
  - `GET /api/academy/module/:slug`
  - `GET /api/academy/lesson/:slug`
  - `POST /api/academy/quiz/:lessonSlug/grade`
- Calculators API:
  - `POST /api/calculators/:type`
- Sources/admin/health:
  - `POST /api/admin/sources/sravni/session`
  - `POST /api/admin/refresh` (manual refresh cycle)
  - `GET /api/health/sources`
- UI translation:
  - `GET /api/i18n?lang=<code>` (cached full UI dictionary translation for non-`ru/en`)
- Global country + language support:
  - Countries: Armenia, Belarus, Kazakhstan, Georgia, Russia, Azerbaijan, UAE
  - Languages: `ru, en, hy, be, kk, ka, az, ar, tr`
- Header search button with modal widget + unified results page
- Bank logo one-line strip on `/` and `/services`
- Liquid-glass + grid visual system and full dark theme tokens
- Light/Dark/System theme toggle with persistent preference
- Grouped bank view for card categories (bank accordion -> full product list)
- Bank logos via internal proxy endpoint (`/api/logo`) + fallback monogram
- Product comparison MVP (up to 4 products) on `/services`
- Local alerts watchlist MVP for product changes on `/services`
- Trust badges on product cards (source, quality flags, stale hint)
- Login button removed, “Journal” replaced with “Financial Pulse”
- Country/language persistence via cookie + localStorage
- Optional DB-backed snapshot persistence (Postgres) + distributed cycle lock (Redis)
- Worker process for orchestrated refresh cycle (`scripts/ingestion-worker.ts`)
- Mobile iPhone app scaffold (`mobile/`, Expo Router, same backend API contracts)

## Run locally

Node requirement: use Node.js `20.x` or `22.x` LTS.

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

Production:

```bash
npm run build
npm start
```

E2E smoke button map:

```bash
npm run test:e2e
```

Initialize DB schema:

```bash
npm run db:init
```

Run ingestion worker:

```bash
npm run worker
```

## Mobile app (Expo iPhone)

```bash
npm run mobile:install
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000 npm run mobile:start
```

Expo Go (without LAN IP):

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000 npm run mobile:expo-go
```

Publish clickable Expo Go link for the website:

```bash
npm run mobile:expo-go:publish
```

Then open `http://localhost:3000/mobile` and use:
- `Open in Expo Go` button
- QR code (same session)
- If link is unavailable/expired: click `Refresh link now` directly on `/mobile` (no terminal required).

Then run iOS simulator:

```bash
npm run mobile:ios
```

Type check mobile:

```bash
npm run mobile:typecheck
```

Troubleshooting:
- If you do not have LAN IP access:
  - Use iOS Simulator with `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000`.
- Or use Expo tunnel + backend HTTPS tunnel:
    1. `cloudflared tunnel --url http://127.0.0.1:3000`
    2. `EXPO_PUBLIC_API_BASE_URL=https://<your-cloudflare-url> npm run mobile:expo-go`
- If Expo tunnel cannot start (`failed to start tunnel`, `session closed`, `remote gone away`):
  - This is usually temporary ngrok tunnel instability.
  - `mobile:expo-go:publish` uses `lan-first` strategy by default, then falls back to tunnel.
- Optional strategy override:
  - `EXPO_PUBLISH_STRATEGY=lan-first|tunnel-first|lan-only|tunnel-only npm run mobile:expo-go:publish`
- If `/mobile` shows expired/unavailable status: run `npm run mobile:expo-go:publish` again.
- Keep web backend running in parallel: `npm run dev` (or `npm run start` after build).
- If Metro cache is stale: `cd mobile && npx expo start -c`.

## Environment variables (optional)

Create `.env.local`:

```bash
LLM_PROVIDER=gigachat
LLM_BASE_URL=https://gigachat.devices.sberbank.ru/api/v1
LLM_API_KEY=your_gigachat_authorization_key
LLM_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_SCOPE=GIGACHAT_API_PERS
# optional for local environments with untrusted cert chain
GIGACHAT_INSECURE_TLS=true
LIBRETRANSLATE_URL=http://localhost:5000/translate
BANKYOUR_ADMIN_TOKEN=your_admin_token
DATABASE_URL=postgres://user:pass@localhost:5432/bankyour
REDIS_URL=redis://localhost:6379
SNAPSHOT_REFRESH_MS=900000
```

Notes:
- `LLM_API_KEY` for GigaChat is used as `Authorization: Basic <key>` on OAuth endpoint.
- `GIGACHAT_INSECURE_TLS=true` should be used only for local/dev if your machine does not trust certificate chain.
- Without `LLM_API_KEY`, assistant works in fallback mode.
- Backward compatibility is supported: if `LLM_*` are absent, API will read `OPENAI_*`.
- Without `LIBRETRANSLATE_URL`, pulse article translation falls back to original text.
- If `BANKYOUR_ADMIN_TOKEN` is set, admin source endpoints require header `x-admin-token`.
- If `DATABASE_URL` is configured, catalog snapshots are persisted in Postgres and reused after restart.
- If `REDIS_URL` is configured, refresh cycles use distributed lock to prevent concurrent runs.

## Key endpoints

- `GET /api/catalog?country=russia&lang=ru&category=debit_cards&q=tbank&sort=rate_desc&page=1&pageSize=20`
- `GET /api/catalog/bank-groups?country=russia&lang=ru&category=debit_cards&page=1&pageSize=20`
- `GET /api/catalog/banks/<bankId>/products?country=russia&lang=ru&category=debit_cards`
- `GET /api/banks?country=russia&lang=ru&coverageStatus=full`
- `GET /api/search?country=russia&lang=ru&q=ипотека`
- `GET /api/search/widget?country=russia&lang=ru&q=ипотека`
- `GET /api/coverage`
- `GET /api/pulse?country=russia&lang=ru&page=1&pageSize=12`
- `GET /api/pulse/<id>?country=russia&lang=ru&url=<article-url>`
- `GET /api/news/providers/health`
- `GET /api/fx?country=russia&window=30`
- `GET /api/fx/history?country=russia&pair=USD/RUB&window=90`
- `GET /api/academy?lang=ru&level=basic`
- `GET /api/academy/module/<slug>?lang=ru`
- `GET /api/academy/lesson/<slug>?lang=ru`
- `POST /api/academy/quiz/<lessonSlug>/grade`
- `POST /api/calculators/mortgage`
- `POST /api/admin/refresh`
- `POST /api/admin/refresh/agentic`

## Current data mode

- Catalog updates in orchestrated cycles with snapshot publication every `SNAPSHOT_REFRESH_MS` (default 15 min).
- Sources include regulator registry parsing, Sravni (RU), bank-site parsing, and fallback generation.
- Product cards include only extracted structured values; synthetic per-bank fallback offers are not generated.
- Deposits/loans extraction is strict: no fabricated rates/terms are published when the source has no reliable numeric values.
- Snapshot state is file-backed by default (`.tmp/snapshot-state.json`) and DB-backed when `DATABASE_URL` is present.
- `/api/services` reads from current snapshot (no live crawling in end-user requests).
- Health API returns `cycleAgeSec`, `refreshIntervalMs`, and `lastSuccessfulCycle`.
