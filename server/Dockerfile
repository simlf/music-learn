# Multi-stage build for the standalone answer-persistence API (D-01).
#
# better-sqlite3 is a native module: the build stage installs a C/C++
# toolchain to compile it and TypeScript, then the runtime stage carries
# only the compiled output and pruned node_modules, running as a non-root
# user (T-08-SC mitigation).

# Pin by tag, not `node:latest` (supply-chain hardening, T-08-SC).
FROM node:22-bookworm-slim AS build

# better-sqlite3 needs a native build toolchain at npm install time.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# Non-root runtime user (T-08-SC mitigation).
RUN groupadd --system app && useradd --system --gid app --home-dir /app app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown -R app:app /app /data

USER app

EXPOSE 8080

CMD ["node", "dist/main.js"]
