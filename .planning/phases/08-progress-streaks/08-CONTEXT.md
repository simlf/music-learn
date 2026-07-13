# Phase 8: Progress & Streaks - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Interactive discuss — user locked the Backend shape & API area; offline sync, streak rules, and weakness-stats definition delegated to Claude's discretion.

<domain>
## Phase Boundary

The user's drill answer history persists across sessions and devices via a backend on the user's Oracle server (SQLite storage), the app surfaces per-chord/per-scale accuracy stats highlighting the weakest items, and shows a daily practice streak counter (PROG-01, PROG-02, PROG-03).

This is the FIRST phase with any server-side code. The frontend has been fully static (adapter-static) through Phases 1-3.

In scope: a small backend API + SQLite storage, wiring the Phase 3 drill loop to record answers, a Progress page (visuals locked by 08-UI-SPEC.md), masthead streak chip, per-item accuracy stats, daily streak.
Explicitly NOT in scope: spaced repetition / scheduling (v1.x, PROJECT decision — v1 persists raw answer history only), accounts/multi-user, HTTPS/deployment to the Oracle server (Phase 9), scales content (Phase 6 — data model must ACCOMMODATE `kind: 'scale'` items but no scale stats can exist until Phase 6 ships).

</domain>

<decisions>
## Implementation Decisions

### Backend shape & API (discussed and locked)
- **D-01 (architecture):** Separate standalone API service (small Node service, e.g. Fastify/Hono + better-sqlite3 — exact framework is planner/research discretion) running as its own docker compose service. The SvelteKit app STAYS adapter-static. SQLite file is volume-mounted. Deployment target is plain docker compose on the user's Oracle server (no Oracle-specific tooling). Do NOT switch the app to adapter-node.
- **D-02 (API surface / where stats live):** Server stores raw answer events (one row per graded answer: item identifier, kind chord|scale, correct/incorrect, timestamp) and computes aggregates server-side. Client consumes computed endpoints (e.g. GET stats → per-item accuracy + weakest items; GET streak → current streak). Raw history is preserved as the substrate for future v1.x spaced repetition — never store aggregates only.
- **D-03 (auth):** Single static shared-secret bearer token. Set as an env var on the server, entered once per device on the client and kept in localStorage, sent on every API request. No accounts, no sessions. This protects the internet-facing API in Phase 9 from junk writes without retrofit.
- **D-04 (send timing):** Client POSTs each answer as it is graded, fire-and-forget — the drill UI NEVER blocks or waits on the network. Failure/queue/retry policy is Claude's discretion (see below), but pacing of the drill loop is untouchable.

### Claude's Discretion
User explicitly left these to Claude (chose not to discuss; resolve during research/planning with sensible defaults):
- **Offline & sync behavior:** what happens when the API is unreachable (queue locally and replay vs drop with a quiet indicator). Keep it simple; the drill loop must keep working with the backend down. Note Phase 02 P02 already fixed localStorage in vitest for exactly this kind of persistence work.
- **Streak rules:** what counts as a practice day (suggest: ≥1 graded answer), day boundary = browser local calendar date per 08-UI-SPEC.md flag (single user, single timezone; do not over-engineer timezones), hard reset vs grace on missed day.
- **Weakness stats definition:** accuracy formula, minimum-attempts floor before an item can be "weakest", recency weighting or not, granularity (exact symbol like `Cm7` per the drill matrix is the natural unit).
- Exact backend framework, endpoint naming, DB schema, dev workflow (local compose vs plain node).
- Per 08-UI-SPEC.md open question: Phase 5 session-scoping has NOT landed (phases execute in order but 4-7 are not built at discussion time) — verify at planning time; if DRILL-04 scoping is absent, PracticeItemRow rows are inert per the UI-SPEC fallback.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/phases/08-progress-streaks/08-UI-SPEC.md` — LOCKED visual/interaction/copy contract for this phase: StreakBadge, PracticeItemRow, AccuracyTable, page states, copy pools, masthead extension, both OPEN QUESTION flags. Read before planning.
- `.planning/ROADMAP.md` — Phase 8 goal + 3 success criteria; depends on Phase 3.
- `.planning/REQUIREMENTS.md` — PROG-01, PROG-02, PROG-03.

### Prior decisions that constrain this phase
- `.planning/phases/03-on-screen-drill-loop/03-CONTEXT.md` — drill-loop decisions D-01..D-13; D-10 defined in-session score as in-memory only, this phase adds the persistent layer.
- `.planning/phases/01-print-shop-foundation-theory-core/01-UI-SPEC.md` — locked token/visual contract.
- `.planning/phases/02-chord-lookup-companion/02-UI-SPEC.md` — masthead/nav pattern, 44px touch targets, copy register.

### Code integration points
- `src/routes/drills/+page.svelte` — `recordGrade(correct)` helper (shared by construction checkAnswer and identification selectChoice) is the single hook point for recording answers to the backend.
- `src/lib/theory/randomChord.ts` — `ROOTS`/`QUALITY_SUFFIXES` matrix defines the universe of chord items stats will aggregate over.
- `src/routes/+layout.svelte` — masthead to extend with the streak chip per 08-UI-SPEC.md.
- `src/lib/lookup/recentLookups.ts` — existing localStorage persistence pattern to imitate for the client-side token/queue storage.
- `src/app.css` — Print Shop token contract (extend additively, per established convention).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `recordGrade(correct)` in the drills page: one function already funnels every graded answer; POST hook goes here.
- `Button.svelte`, `NoteLabel.svelte`, mono status register styles: reused per 08-UI-SPEC.md; new components are StreakBadge, PracticeItemRow, AccuracyTable.
- vitest-setup.ts localStorage fix (Phase 02 P02): unblocks testing any client-side persistence added this phase.

### Established Patterns
- Exact-pinning vetted direct deps (tone pinned 15.1.22); apply same to any new backend deps.
- Additive app.css token extension per phase.
- Copy: shop voice, no em dashes, rotation pools via pickHint/pickVariant pattern.
- All theory/drill logic pure and unit-tested in `src/lib/**`; keep stats/streak computation pure and testable on the server side too.

### Integration Points
- New top-level backend code (e.g. `server/` or `api/` directory) + docker-compose.yml — none exists yet; this phase creates the repo's backend footprint.
- Client API module in `src/lib/` (fetch wrapper with bearer token) consumed by drills page and new Progress page.
- New route `src/routes/progress/+page.svelte` per 08-UI-SPEC.md.

</code_context>

<specifics>
## Specific Ideas

- Backend deploys via plain docker compose on the user's Oracle server; no Oracle-specific tooling or research needed (user's standing note).
- Drill flow pacing is sacred: no network wait ever inserted between answer, feedback, and Next.

</specifics>

<deferred>
## Deferred Ideas

- Spaced repetition / FSRS scheduling over the raw answer history — v1.x (existing PROJECT decision, reconfirmed: raw events are stored now to enable it later).
- PracticeItemRow deep-link into a scoped drill session — depends on Phase 5 DRILL-04; wiring decision deferred to planning per 08-UI-SPEC.md.

</deferred>

---

*Phase: 08-progress-streaks*
*Context gathered: 2026-07-13*
