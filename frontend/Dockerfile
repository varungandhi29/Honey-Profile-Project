# HoneyShield v2 — Frontend Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build with production backend URL
ARG VITE_BACKEND_URL=http://localhost:3001
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Production stage — serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config for React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
