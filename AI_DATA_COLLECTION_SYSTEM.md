# Bank-Your AI Data Collection & Assistant System

Полная система автоматистического сбора данных, работающего ИИ помощника, обновления курсов валют в реальном времени и сбора финансовых новостей.

## 🚀 Компоненты системы

### 1. **ИИ Помощник** (AI Assistant)
- ✅ Использует GigaChat или OpenAI API
- ✅ Отвечает на вопросы о финансовых продуктах
- ✅ Контекстная помощь с банками и предложениями
- ✅ Fallback режим если основной провайдер недоступен
- ✅ Автоматический перевод на локальные языки

**API**: `POST /api/assistant`
```json
{
  "message": "Какую карту выбрать в России?",
  "country": "russia",
  "serviceType": "cards",
  "locale": "ru",
  "products": [],
  "includeContext": true
}
```

### 2. **Сбор данных с банков** (Bank Scraper)
- ✅ Автоматический парсинг веб-сайтов банков
- ✅ Извлечение структурированных данных (карты, кредиты, вклады)
- ✅ Поддержка 7 стран (Россия, Беларусь, Казахстан, Армения, Грузия, Азербайджан, ОАЭ)
- ✅ Распределённый сбор с batch-обработкой
- ✅ Обработка ошибок и retry-логика

**Файлы**: 
- `lib/scraper/bankScraper.ts` - основная логика парсинга
- Использует встроенные банк-конфиги из `data/banks.ts`

### 3. **Обновление курсов валют** (Real-time FX)
- ✅ Настоящее время обновление курсов валют
- ✅ Конвертация между 8 валютами
- ✅ Модульная архитектура для подключения разных API
- ✅ Fallback на mock-данные

**API Endpoints**:
- `GET /api/fx/rates?base=USD` - получить курсы
- `GET /api/fx/rates?command=convert&amount=100&from=USD&to=RUB`
- `GET /api/fx/rates?command=country&country=russia`

**Файлы**:
- `lib/fx/realTimeExchangeRates.ts` - логика курсов валют
- `app/api/fx/enhanced-route.ts` - расширенный API

### 4. **Сбор финансовых новостей** (Financial News)
- ✅ Сбор новостей с RSS-ленты финансовых сайтов
- ✅ Парсинг питающихся источников (RBC, Interfax, TASS и др)
- ✅ По странам и категориям
- ✅ Премощный фильтр по ключевым словам

**API**: `GET /api/news?country=russia&locale=ru&limit=20`

**Файлы**:
- `lib/news/newsSources.ts` - источники и парсинг
- `app/api/news/enhanced-route.ts` - расширенный API

### 5. **Основной Worker для обновления данных**
- ✅ Автоматический цикл обновления
- ✅ Покупнание/распределённая блокировка
- ✅ Параллельная обработка всех стран
- ✅ Логирование и отчёты

**Команда**: `npm run worker`

**Файлы**:
- `scripts/ingestion-worker.ts` - основной рабочий процесс
- `lib/ingestion/dataRefresh.ts` - логика обновления

## ⚙️ Настройка окружения

### 1. ИИ провайдер (GigaChat или OpenAI)

**Для GigaChat** (уже настроено):
```bash
LLM_PROVIDER=gigachat
LLM_API_KEY=... # Ваш GigaChat API ключ
LLM_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
```

**Для OpenAI**:
```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

### 2. База данных (PostgreSQL)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/bankyour
```

### 3. Redis (для распределённых блокировок)
```bash
REDIS_URL=redis://localhost:6379
```

### 4. Опционально: Защита API
```bash
DATA_REFRESH_SECRET=your-secret-key
```

## 🎯 Использование

### Запуск worker'а для автоматического сбора

```bash
# Запустить ингестион worker (обновляет каждый час)
npm run worker

# Worker будет:
# 1. Собирать данные с веб-сайтов банков
# 2. Обновлять курсы валют
# 3. Собирать финансовые новости
# 4. Сохранять всё в БД
```

### Вручную триггер обновление данных

```bash
# Получить свежие данные (требует DATA_REFRESH_SECRET)
curl -H "Authorization: Bearer $DATA_REFRESH_SECRET" \
  http://localhost:3000/api/data-refresh

# Или POST с force флагом
curl -X POST \
  -H "Authorization: Bearer $DATA_REFRESH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  http://localhost:3000/api/data-refresh
```

### ИИ помощник API

```bash
# Общий вопрос
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Какая лучшая дебетовая карта?",
    "country": "russia",
    "locale": "ru"
  }'

# С контекстом продуктов
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Что такое кешбек?",
    "country": "russia",
    "serviceType": "cards",
    "locale": "ru",
    "includeContext": true
  }'
```

### Курсы валют API

```bash
# Получить курсы USD
curl http://localhost:3000/api/fx/rates?base=USD

# Конвертировать валюту
curl http://localhost:3000/api/fx/rates?command=convert&amount=100&from=USD&to=RUB

# Курсы для страны
curl http://localhost:3000/api/fx/rates?command=country&country=russia
```

### Новости API

```bash
# Финансовые новости для России
curl http://localhost:3000/api/news?country=russia&locale=ru&limit=20

# Новости для другой страны
curl http://localhost:3000/api/news?country=kazakhstan&locale=kk
```

## 📊 Архитектура данных

```
┌─────────────────────────────────────────┐
│         Внешние источники               │
├──────────┬──────────────┬───────────────┤
│  Веб-    │   Финансовые │   Обменные    │
│ сайты    │    новости   │    курсы      │
│ банков   │  (RSS-ленты) │    (API-ы)    │
└──────────┴──────────────┴───────────────┘
           │         │              │
           └─────────┼──────────────┘
                     │
        ┌────────────▼─────────────┐
        │   Data Refresh Cycle     │
        │   (ingestion-worker)     │
        ├──────────────────────────┤
        │ • Scraping banks         │
        │ • Parsing news RSS       │
        │ • Fetching FX rates      │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │   PostgreSQL Database    │
        ├──────────────────────────┤
        │ • Products (Банковские   │
        │  карты, кредиты, вклады) │
        │ • News (Финансовые       │
        │   новости)               │
        │ • Rates (Курсы валют)    │
        └──────────────────────────┘
                     │
        ┌────────────┴─────────────────────┐
        │                                  │
    ┌───▼────┐  ┌──────────┐  ┌───────────▼───┐
    │ API    │  │   AI     │  │  Web Interface│
    │Assistant│  │ Assistant│  │  (Components) │
    └────────┘  └──────────┘  └───────────────┘
```

## 🔄 Жизненный цикл данных

1. **Сбор** → Worker собирает данные каждый час
2. **Обработка** → Данные парсятся и нормализуются
3. **Хранение** → Сохраняются в PostgreSQL
4. **Кеширование** → Redis кеширует часто используемые данные
5. **Доступ** → API предоставляет данные фронтенду
6. **Обогащение** → ИИ обогащает ответы контекстом

## ⚡ Производительность

- **Batch-обработка**: 3 банка за раз, с 2-секундной задержкой между батчами
- **Timeout**: 10 секунд на каждый запрос
- **Retry**: 2 повтора при ошибке
- **Параллелизм**: До 7 странам обрабатываются последовательно с 1-секундной задержкой

## 🚨 Обработка ошибок

- ✅ Retry-логика при сетевых ошибках
- ✅ Fallback на mock-данные для FX
- ✅ Fallback на локальный ИИ помощник если Live API недоступен
- ✅ Распределённая блокировка для предотвращения дублирования
- ✅ Логирование всех ошибок

## 📝 Примеры ответов

### ИИ помощник
```
"Здравствуйте! Для дебетовой карты рекомендую:
1. Cashback Everyday - 5% в выборные категории, без годового платежа
2. Smart Youth - 2% на интернет-сервисы, отличная для молодёжи
...
⚠️ Важно: это рекомендация носит общий информационный характер..."
```

### Курсы валют
```json
{
  "base": "USD",
  "rates": {
    "USD": 1,
    "RUB": 95.3,
    "AMD": 401.5,
    "EUR": 0.92,
    ...
  },
  "timestamp": "2024-04-21T12:34:56Z"
}
```

### Новости
```json
{
  "country": "russia",
  "items": [
    {
      "title": "Банк России повысил ключевую ставку",
      "description": "Решение принято на заседании совета директоров...",
      "url": "https://www.cbr.ru/...",
      "source": "RBC Finance",
      "publishedAt": "2024-04-21T10:00:00Z"
    },
    ...
  ]
}
```

## 📚 Файловая структура новых компонентов

```
lib/
├── scraper/
│   └── bankScraper.ts           # Парсинг веб-сайтов банков
├── news/
│   └── newsSources.ts           # Сбор финансовых новостей
├── fx/
│   └── realTimeExchangeRates.ts # Обновление курсов валют
├── ai/
│   ├── assistantContext.ts      # Контекст для ИИ
│   ├── systemPrompt.ts          # Системная инструкция
│   └── llmConfig.ts             # Конфиг LLM
└── ingestion/
    └── dataRefresh.ts           # Основной цикл обновления

app/api/
├── assistant/
│   ├── route.ts                 # Текущий API
│   └── enhanced-route.ts        # Новый расширенный API
├── fx/
│   ├── route.ts                 # Текущий API
│   └── enhanced-route.ts        # Новый расширенный API
├── news/
│   ├── route.ts                 # Текущий API
│   └── enhanced-route.ts        # Новый расширенный API
└── data-refresh/
    └── route.ts                 # Новый API для обновления

scripts/
└── ingestion-worker.ts          # Обновлённый worker
```

## 🔐 Безопасность

- ✅ Защита API с помощью Bearer tokens
- ✅ User-Agent в запросах (не создаётся впечатление бота)
- ✅ Распределенные блокировки предотвращают race conditions
- ✅ Timeout'ы предотвращают зависания
- ✅ Ограничение запросов к серверам банков (batch-обработка)

## 🎓 Примеры использования в компонентах

### Использование ИИ помощника в компоненте

```typescript
// В компоненте ChatBot.tsx
const response = await fetch("/api/assistant", {
  method: "POST",
  body: JSON.stringify({
    message: userMessage,
    country: selectedCountry,
    serviceType: "cards",
    locale: currentLocale,
    products: availableProducts,
    includeContext: true
  })
});
```

### Использование курсов валют

```typescript
// На странице FX Monitor
const rates = await fetch("/api/fx/rates?base=USD").then(r => r.json());
const converted = await fetch(
  `/api/fx/rates?command=convert&amount=100&from=USD&to=RUB`
).then(r => r.json());
```

### Использование новостей

```typescript
// На странице новостей
const news = await fetch(
  `/api/news?country=russia&locale=ru&limit=10`
).then(r => r.json());
```

## 🔧 Отладка

Включить детальное логирование:

```bash
# Запустить worker с debug логами
DEBUG=bankyour:* npm run worker

# Или directly
NODE_DEBUG=* npm run worker
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте конфиги в `.env.local`
2. Убедитесь что БД и Redis запущены
3. Проверьте логи worker'а
4. Проверьте сетевое соединение для API провайдеров

---

**Создано**: 2024
**Версия**: 1.0
