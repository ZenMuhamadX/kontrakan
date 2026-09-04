# ─────────────────────────────────────────
# Stage 1: Builder — install deps & build
# ─────────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy manifest files dulu (cache layer lebih efisien)
COPY package.json bun.lock bunfig.toml ./

# Install semua dependencies
RUN bun install --frozen-lockfile

# Copy seluruh source code
COPY . .

# Build frontend → hasilkan folder dist/
RUN bun run build

# ─────────────────────────────────────────
# Stage 2: Runner — serve hasil build
# ─────────────────────────────────────────
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy hanya hasil build & server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server.ts ./src/server.ts

EXPOSE 4001

CMD ["bun", "run", "src/server.ts"]
