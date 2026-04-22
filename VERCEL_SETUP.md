# Vercel Environment Variables Guide

## Required Environment Variables for Bank-Your

### AI/LLM Configuration
```
LLM_PROVIDER=gigachat
LLM_BASE_URL=https://gigachat.devices.sberbank.ru/api/v1
LLM_API_KEY=your-gigachat-api-key
LLM_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_INSECURE_TLS=true
```

### Database Configuration
```
DATABASE_URL=postgresql://user:password@your-database-host:5432/bankyour
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=bankyour
```

### Redis Configuration
```
REDIS_URL=redis://your-redis-host:6379
```

### Data Refresh Security
```
DATA_REFRESH_SECRET=your-secret-key-for-triggering-updates
REFRESH_INTERVAL_MS=3600000  # 1 hour
```

### Application URLs
```
NEXT_PUBLIC_API_BASE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## Setup Steps for Vercel

1. **Connect Repository**
   - Go to https://vercel.com
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository (haimais/bankyour)

2. **Configure Environment Variables**
   - In Vercel Dashboard, go to Settings → Environment Variables
   - Add all variables from above
   - Make sure to add them for all environments (Production, Preview, Development)

3. **Database Setup (PostgreSQL)**
   - Use Vercel Postgres (recommended): https://vercel.com/storage/postgres
   - Or use external provider (AWS RDS, DigitalOcean, etc.)
   - Get connection string and set `DATABASE_URL`

4. **Redis Setup**
   - Use Upstash: https://upstash.com (free tier available)
   - Or use AWS ElastiCache, DigitalOcean, etc.
   - Get connection URL and set `REDIS_URL`

5. **Deploy**
   - Push to main branch: `git push origin main`
   - Vercel will automatically build and deploy
   - Monitor deployment in Vercel Dashboard

## Vercel Deployment Commands

```bash
# Open Vercel Dashboard
vercel

# Deploy manually
vercel --prod

# View logs
vercel logs

# Set environment variables from CLI
vercel env add LLM_API_KEY
```

## Post-Deployment

1. **Test API Endpoints**
   ```bash
   curl https://your-app.vercel.app/api/assistant -X POST
   curl https://your-app.vercel.app/api/fx/rates
   curl https://your-app.vercel.app/api/news
   ```

2. **Setup Background Worker** (for data collection)
   - Option A: Deploy worker to separate Vercel Function
   - Option B: Use cron job service (EasyCron, AWS Lambda)
   - Command: `npm run worker`

3. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor database connections
   - Track API response times

## Important Notes

- **Max Function Timeout**: Vercel Free = 10s, Pro = 60s
- **Data Refresh**: Consider using external cron service for `npm run worker`
- **Database**: Free PostgreSQL tier very limited, recommend Pro tier
- **Secrets**: All API keys stored securely in Vercel
- **CORS**: Already configured in API routes

## Common Issues

### "DATABASE_URL is not configured"
→ Add `DATABASE_URL` to Vercel Environment Variables

### "LLM_API_KEY is not configured"
→ Add `LLM_API_KEY` to Vercel Environment Variables

### "Database connection timeout"
→ Check DATABASE_URL is correct and accessible from Vercel

### "Redis connection failed"
→ Ensure REDIS_URL is set and Redis service is running

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/learn/basics/deploying-nextjs-app
- Bank-Your GitHub: https://github.com/haimais/bankyour
