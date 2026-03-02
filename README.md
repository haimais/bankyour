# Bank-your Mobile (iPhone app)

Expo React Native client for the same Bank-your backend.

## What is implemented

- Tabs: `Home`, `Services`, `News`, `Business`, `Academy`, `Settings`
- Uses the same API contracts as web:
  - `/api/catalog`
  - `/api/pulse`, `/api/pulse/:id`
  - `/api/business/articles`, `/api/business/articles/:slug`, `/api/business/banks`
  - `/api/academy`
  - `/api/assistant`
- Country/language persistence via AsyncStorage
- News popup modal with summary + full text blocks

## Run locally

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Point mobile app to web backend:

```bash
export EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:3000"
```

3. Start Expo Go (tunnel mode, works without LAN IP):

```bash
npm run start:tunnel
```

4. If you want a clickable link on the web app page `/mobile`, run from the project root:

```bash
npm run mobile:expo-go:publish
```

4. Open in iOS simulator:

```bash
npm run ios
```

## Notes

- No LAN IP option:
  - iOS Simulator: keep `http://127.0.0.1:3000`.
  - Physical iPhone:
    1. Keep Expo in tunnel mode (`npm run start:tunnel`).
    2. Expose web backend with HTTPS tunnel (example: `cloudflared tunnel --url http://127.0.0.1:3000`).
    3. Set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS tunnel URL before starting Expo.
- If tunnel start fails with `session closed` or `remote gone away`, wait a bit and restart tunnel publish.
- Mobile and web share the same `country` and `locale` semantics.
