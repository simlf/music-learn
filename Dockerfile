# Multi-stage build for the SvelteKit static frontend.
# Stage 1 builds the static site; stage 2 serves it with nginx and
# reverse-proxies /api to the api container (same-origin, no CORS).

FROM node:22-bookworm-slim@sha256:be979e5523c76fa4d5ca4ebd3099078f220aa47ec39c48ad5b5df9314debd6eb AS build

WORKDIR /app

# API base is baked at build time (src/lib/api/client.ts reads
# import.meta.env.VITE_API_BASE_URL). Same-origin /api by default.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.31-alpine@sha256:7fc0fb4af7bf006aeb31aea88069976060f8f0a0a86b667126742cc17f4e31ae AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
