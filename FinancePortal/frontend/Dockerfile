FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_BACKEND_URL=http://localhost:4000
ARG VITE_HONEYPOT_URL=http://localhost:5173
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_HONEYPOT_URL=$VITE_HONEYPOT_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
