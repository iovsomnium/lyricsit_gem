#!/bin/bash
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  CrossRhyme - Project Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Create Next.js ──
echo -e "\n${GREEN}▶ Creating Next.js project...${NC}"
pnpm create next-app@latest crossrhyme \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm \
  --turbopack

cd crossrhyme

# ── 2. Dependencies (검증된 패키지만) ──
echo -e "\n${GREEN}▶ Installing dependencies...${NC}"
pnpm add @google/generative-ai zustand lucide-react clsx tailwind-merge framer-motion

# ── 3. Directories ──
echo -e "\n${GREEN}▶ Creating directories...${NC}"
mkdir -p src/app/api/{rhyme,generate}
mkdir -p src/components/{ui,rhyme,lyrics}
mkdir -p src/lib/{gemini,phonetics,rhyme-engine,utils}
mkdir -p src/hooks src/types scripts

# ── 4. .env.local ──
cat > .env.local << 'EOF'
GEMINI_API_KEY=your_gemini_api_key_here
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=asia-northeast3
EOF
cp .env.local .env.example

# ── 5. next.config.ts (standalone for Docker) ──
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
EOF

# ── 6. Dockerfile (Cloud Run optimized) ──
cat > Dockerfile << 'EOF'
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
EOF

cat > .dockerignore << 'EOF'
node_modules
.next
.git
.env.local
EOF

# ── 7. Cloud Run deploy script ──
cat > scripts/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-northeast3}"
IMAGE="gcr.io/${PROJECT_ID}/crossrhyme"

gcloud config set project "$PROJECT_ID"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
gcloud builds submit --tag "$IMAGE" --timeout=1200
gcloud run deploy crossrhyme \
  --image "$IMAGE" --region "$REGION" --platform managed \
  --allow-unauthenticated --port 8080 --memory 512Mi \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}"

echo "Deployed: $(gcloud run services describe crossrhyme --region $REGION --format='value(status.url)')"
DEPLOY
chmod +x scripts/deploy.sh

# ── 8. .gitignore 추가 ──
echo -e "\n.env.local\n.env*.local\n.DS_Store" >> .gitignore

# ── Done ──
echo ""
echo -e "${GREEN}✔ CrossRhyme setup complete!${NC}"
echo ""
echo -e "  ${YELLOW}cd crossrhyme${NC}"
echo -e "  ${YELLOW}vi .env.local${NC}    ← Gemini API 키 입력"
echo -e "  ${YELLOW}pnpm dev${NC}         ← 개발 서버 시작"
echo ""
