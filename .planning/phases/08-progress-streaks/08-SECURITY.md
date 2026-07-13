---
phase: 8
slug: progress-streaks
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-13
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → API (POST /answers) | Untrusted request body + bearer credential; internet-facing once deployed (Phase 9) | Answer events, bearer token |
| browser → GET /stats, GET /streak | Authenticated reads of the user's aggregated practice data | Bearer token, aggregate counts, `today` date parameter |
| API → SQLite | Validated event data written to the durable store | Answer rows |
| browser (static app) → api service | Cross-origin fetch carrying the bearer token stored in localStorage | Bearer token |
| docker image ← base image + npm registry | Supply-chain surface for the built container | Dependencies |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Spoofing | POST /answers auth | high | mitigate | Bearer preHandler with timingSafeEqual + equal-length guard, 401 without write (server/src/auth.ts) | closed |
| T-08-02 | Tampering | answers request body / SQL | medium | mitigate | Route JSON schema: kind enum, typed fields, YYYY-MM-DD pattern, additionalProperties false → 400 (server/src/routes/answers.ts); prepared INSERT (server/src/db.ts:68) | closed |
| T-08-03 | Denial of Service | request body size | medium | mitigate | Fastify bodyLimit: 4096 (server/src/index.ts:31) | closed |
| T-08-04 | Information disclosure | error responses | low | mitigate | Generic setErrorHandler, logger: false, no stack/DB path in responses (server/src/index.ts:32,52) | closed |
| T-08-05 | Tampering | CORS on api service | medium | mitigate | @fastify/cors bound to explicit CORS_ORIGIN, methods GET/POST, no wildcard (server/src/index.ts:43); live-verified during UAT | closed |
| T-08-06 | Information disclosure | bearer token at rest in localStorage | low | accept | See Accepted Risks Log R-08-01 | closed |
| T-08-07 | Tampering / DoS | offline answer queue in localStorage | low | mitigate | Defensive Array.isArray parse resets corrupt data to []; MAX_QUEUE_LENGTH 500 drop-oldest cap (src/lib/api/progress.ts:43,65,85) | closed |
| T-08-08 | Spoofing | GET /stats auth | high | mitigate | /stats registered inside the bearer preHandler plugin (server/src/index.ts:70-74); live-verified 401 without/with wrong token during UAT | closed |
| T-08-09 | Information disclosure | stats payload | low | accept | See Accepted Risks Log R-08-02 | closed |
| T-08-10 | Denial of Service | full-table scan per /stats | low | accept | See Accepted Risks Log R-08-03 | closed |
| T-08-11 | Spoofing | GET /streak auth | high | mitigate | /streak registered inside the bearer preHandler plugin (server/src/index.ts:70-74) | closed |
| T-08-12 | Tampering | `today` query parameter | medium | mitigate | Querystring schema restricts today to ^\d{4}-\d{2}-\d{2}$ → 400 (server/src/routes/streak.ts:17,24); never interpolated into SQL | closed |
| T-08-13 | Information disclosure | streak payload | low | accept | See Accepted Risks Log R-08-04 | closed |
| T-08-SC | Tampering (supply chain) | npm installs + docker base image | high | mitigate | Committed lockfiles (root + server); pinned node:22-bookworm-slim; non-root USER app (server/Dockerfile:9,25,38); package legitimacy checkpoint recorded in 08-01-SUMMARY.md | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-08-01 | T-08-06 | Bearer token in localStorage: single-user personal tool, no third-party scripts, Svelte auto-escapes output (no XSS surface) | plan-time disposition (08-02-PLAN.md) | 2026-07-13 |
| R-08-02 | T-08-09 | Stats aggregates expose only the single user's own practice counts; no other tenants | plan-time disposition (08-03-PLAN.md) | 2026-07-13 |
| R-08-03 | T-08-10 | Full-table scan bounded by single-user dataset size; revisit if volume grows | plan-time disposition (08-03-PLAN.md) | 2026-07-13 |
| R-08-04 | T-08-13 | Streak payload reveals only the single user's own streak count | plan-time disposition (08-04-PLAN.md) | 2026-07-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-13 | 14 | 14 | 0 | gsd-secure-phase (L1 grep-depth, short-circuit: plan-time register, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-13
