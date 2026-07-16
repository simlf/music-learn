# Multi-stage build for the SvelteKit static frontend.
# Stage 1 builds the static site; stage 2 serves it with nginx and
# reverse-proxies /api to the api container (same-origin, no CORS).

FROM node:22-bookworm-slim AS build

WORKDIR /app

# API base is baked at build time (src/lib/api/client.ts reads
# import.meta.env.VITE_API_BASE_URL). Same-origin /api by default.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
