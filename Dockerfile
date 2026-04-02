FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN YOUTUBE_DL_SKIP_PYTHON_CHECK=1 YOUTUBE_DL_SKIP_DOWNLOAD=1 npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates tini fontconfig build-essential curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN YOUTUBE_DL_SKIP_PYTHON_CHECK=1 YOUTUBE_DL_SKIP_DOWNLOAD=1 npm ci --omit=dev && npm cache clean --force

# Download yt-dlp binary (skipped by YOUTUBE_DL_SKIP_DOWNLOAD above)
RUN mkdir -p node_modules/youtube-dl-exec/bin \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o node_modules/youtube-dl-exec/bin/yt-dlp \
    && chmod +x node_modules/youtube-dl-exec/bin/yt-dlp

COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets
COPY --from=build /app/public ./public

# Final check of installed node_modules size
# RUN du -sh node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
