# HoneyShield v2 — Backend
FROM node:22-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user for security
RUN mkdir -p /app/logs && \
    addgroup -g 1001 -S honeyshield && \
    adduser -S honeyshield -u 1001 && \
    chown -R honeyshield:honeyshield /app
USER honeyshield

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start server
CMD ["node", "server.js"]
