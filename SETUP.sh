#!/bin/bash

# Quick Start Guide for Bank-Your AI Data Collection System

set -e

echo "🚀 Bank-Your System Setup"
echo "========================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment
echo -e "${BLUE}📋 Checking environment...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️ .env.local not found. Creating...${NC}"
    cat > .env.local << 'EOF'
# AI Assistant Configuration
LLM_PROVIDER=gigachat
LLM_BASE_URL=https://gigachat.devices.sberbank.ru/api/v1
LLM_API_KEY=your-gigachat-api-key-here
LLM_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_INSECURE_TLS=true

# Database (if using local DB)
# DATABASE_URL=postgresql://user:password@localhost:5432/bankyour

# Redis (if using local Redis)
# REDIS_URL=redis://localhost:6379

# API Security
DATA_REFRESH_SECRET=your-secret-key-here
EOF
    echo -e "${YELLOW}Created .env.local - Update with your credentials${NC}"
fi

if [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📝 Available commands:"
echo ""
echo -e "  ${BLUE}npm run dev${NC}         Start development server (http://localhost:3000)"
echo -e "  ${BLUE}npm run build${NC}       Build for production"
echo -e "  ${BLUE}npm run worker${NC}      Start data collection worker (requires DB & Redis)"
echo ""
echo "🌐 API Endpoints (after starting server):"
echo ""
echo -e "  ${BLUE}POST /api/assistant${NC}      AI Assistant (ask financial questions)"
echo -e "  ${BLUE}GET /api/fx/rates${NC}        Exchange rates"
echo -e "  ${BLUE}GET /api/news${NC}            Financial news"
echo -e "  ${BLUE}GET /api/data-refresh${NC}    Trigger data collection"
echo ""
echo "📚 Documentation:"
echo ""
echo "  Read AI_DATA_COLLECTION_SYSTEM.md for full documentation"
echo ""
echo "🚀 Quick Start:"
echo ""
echo "  1. Update .env.local with your API keys"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo "  4. Optional: npm run worker (in another terminal)"
echo ""
echo -e "${GREEN}Happy banking! 🏦${NC}"
