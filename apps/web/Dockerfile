# ===========================================
# Development Stage
# ===========================================
FROM node:25-alpine AS development

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Run development server
CMD ["npm", "run", "dev"]

# ===========================================
# Dependencies Stage
# ===========================================
FROM node:25-alpine AS deps

WORKDIR /app

# Install dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ===========================================
# Builder Stage
# ===========================================
FROM node:25-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# ===========================================
# Production Stage
# ===========================================
FROM node:25-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Run the application
CMD ["node", "server.js"]
