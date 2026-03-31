FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates tini fontconfig \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets

USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
