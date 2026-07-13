# Phase 8: Progress & Streaks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 08-progress-streaks
**Areas discussed:** Backend shape & API

---

## Area selection

Offered: Backend shape & API, Offline & sync behavior, Streak rules, Weakness stats definition.
Selected: Backend shape & API only. The other three delegated to Claude's discretion.

---

## Backend shape & API

### Q1 — How should the backend enter the stack?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate API service (Recommended) | Standalone Node service (Fastify/Hono + better-sqlite3) as its own docker compose service; frontend stays adapter-static; SQLite volume-mounted | ✓ |
| SvelteKit adapter-node | Switch whole app to adapter-node with +server.ts routes; one process but changes build/deploy story | |
| You decide | Claude picks during planning | |

**User's choice:** Separate API service

### Q2 — What should the API record and where are stats computed?

| Option | Description | Selected |
|--------|-------------|----------|
| Raw events, server computes (Recommended) | One row per answer; server aggregates stats/streak endpoints; raw history kept for future spaced repetition | ✓ |
| Raw events, client computes | Dumb event store; client derives stats; full-history fetch each load | |
| Server stores aggregates only | Counters only; loses raw log v1 decision requires | |

**User's choice:** Raw events, server computes

### Q3 — Auth for the internet-facing API?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared secret token (Recommended) | Static bearer token, env var server-side, per-device entry stored in localStorage | ✓ |
| No auth | Open API, restrict later at proxy | |
| Defer to Phase 9 | Ship open, protect in deploy phase | |

**User's choice:** Shared secret token

### Q4 — When does the client send answers?

| Option | Description | Selected |
|--------|-------------|----------|
| Per answer, fire-and-forget (Recommended) | POST each graded answer, never block drill flow | ✓ |
| Batch per session | Accumulate and flush on leave/interval; unreliable flush risk | |
| You decide | Claude picks during planning | |

**User's choice:** Per answer, fire-and-forget

**Continuation check:** User chose "Done, wrap up" after 4 questions.

## Claude's Discretion

- Offline & sync behavior (queue/replay vs drop with indicator)
- Streak rules (practice-day threshold, day boundary, grace policy)
- Weakness stats definition (formula, min-attempts floor, recency, granularity)
- Backend framework choice, endpoint naming, DB schema, dev workflow
- PracticeItemRow deep-link wiring (per 08-UI-SPEC.md open question)

## Deferred Ideas

- Spaced repetition over raw answer history — v1.x (pre-existing PROJECT decision)
- Drill-session deep-links from stats rows — depends on Phase 5 DRILL-04
