FROM node:24-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src

RUN corepack enable && \
    corepack prepare pnpm@10.31.0 --activate && \
    pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json
COPY --chown=hono:nodejs migrations /app/migrations

USER hono
EXPOSE 5678

CMD ["node", "/app/dist/index.js"]
