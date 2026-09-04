# ─────────────────────────────────────────
# Stage 1: Builder (Dependencies & Type Check)
# ─────────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install production and build dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Type check
RUN bun x tsc --noEmit

# ─────────────────────────────────────────
# Stage 2: Production Runner
# ─────────────────────────────────────────
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules & source code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

EXPOSE 3000

# Run API server with Bun
CMD ["bun", "run", "src/app.ts"]
