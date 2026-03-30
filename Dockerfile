FROM node:22-bookworm-slim AS deps
WORKDIR /app

ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

COPY package*.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-pip ffmpeg \
	&& python3 -m pip install --no-cache-dir yt-dlp \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]