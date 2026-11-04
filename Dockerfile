# Multi-stage build for the SvelteKit static frontend.
# Stage 1 builds the static site; stage 2 serves it with nginx and
# reverse-proxies /api to the api container (same-origin, no CORS).

FROM node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS build

WORKDIR /app

# API base is baked at build time (src/lib/api/client.ts reads
# import.meta.env.VITE_API_BASE_URL). Same-origin /api by default.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.31-alpine@sha256:785835ea65db4bba6f021acc0f3be91b0fef76a53fe41f8588c6698d2aed0606 AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
