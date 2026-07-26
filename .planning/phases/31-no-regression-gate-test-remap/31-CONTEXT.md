# Phase 31: No-Regression Gate & Test Remap - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning
**Mode:** Autonomous — the milestone's closing gate. Most REG-02 coverage already shipped in Phases 26-30; this phase audits, fills gaps, and locks the final green gate.

<domain>
## Phase Boundary

Prove the v2.2 restructure ships green end-to-end: prior behavior intact (REG-01), the per-route tests are remapped to their absorbing hub, and new tests cover the merges — the Practice interleaved queue (incl. the single-type-due gate), the IntervalView (stacked vs formula per quality + accidental carry-through), and each redirect shim (REG-02). The full `npm run build && npm test && npm run check` must be green, and the milestone's requirement traceability confirmed.

No net-new product UI. This is an audit + coverage-completion + gate phase.

</domain>

<decisions>
## Implementation Decisions

### UI-SPEC
- SKIP UI-SPEC: this phase adds tests + a gate only; there is no net-new visual surface to specify (the ui-plan-gate reports frontend=true because tests touch .svelte, but no design contract is warranted). Note this skip explicitly.

### REG-02 coverage — mostly already present; audit then fill only gaps
Existing coverage from prior phases (do NOT duplicate; reference it):
- IntervalView per chord quality (maj7/m7/dom7/ø7/°7/triads/extensions) + accidental carry-through (E♭→Mi♭): `src/lib/lookup/chordPresentation.test.ts` + `src/lib/components/intervalView.test.ts` (Phase 26).
- Practice merged queue interleaving + single-type-due gate + song-filter steering + carded-vs-synthetic grade split: `src/lib/practice/practiceQueue.test.ts` + `tests/practice-hub-mix.e2e.test.ts` + `tests/practice-hub.e2e.test.ts` (Phase 27); seed handoff: `src/routes/practiceSeedHandoff.test.ts` (Phase 30).
- Learn hub (theory + Explore + interval reference; scale practice reachable from /practice): `src/routes/learn.test.ts` + `src/routes/practiceScalePractice.test.ts` (Phase 28).
- Progress hub (stats + recall map + songs, filter write): `tests/progress-hub.e2e.test.ts` (Phase 29).
- Redirect shims (all 8 old routes → correct hub): `src/routes/redirectShims.test.ts` (Phase 30).

Task: AUDIT this matrix against the REG-02 acceptance list. If any named REG-02 item lacks a test, add it. Known likely-thin spots to check and fill if missing:
- An explicit assertion that the interval FAMILY drill (interval recognition/construction) actually appears in the merged Practice mix (distinct from the IntervalView component).
- An explicit single-type-due assertion is present (Phase 27 has 3 — confirm one truly gates variety injection).

### New: a milestone capstone integration test (REG-01)
- Add ONE cross-hub integration/regression test (e.g. `tests/hub-consolidation.e2e.test.ts`) that asserts the consolidated topology end-to-end:
  1. The nav shows exactly the 4 hubs (Lookup/Practice/Learn/Progress) on desktop + phone, no More sheet.
  2. Each of the 8 old routes redirects (308) to its correct hub (may reuse/extend `redirectShims.test.ts` rather than duplicate — Claude's discretion).
  3. One representative end-to-end path per hub still works: Lookup decodes a chord and shows IntervalView; Practice starts a session and grades one question (chroma); Learn shows theory + Explore + the interval reference; Progress shows stats + the recall map + song management with a working filter write.
- Keep it focused; do NOT re-assert everything the per-phase tests already cover — this is the "hubs connect and the user's core flows survive" capstone, not a re-run of unit coverage.

### The final gate (REG-01 + REG-02)
- Run and require green: `npm run build` (prerender succeeds), full `npm test`, `npm run check` (svelte-check 0 errors). This is the milestone's shipping gate.
- Confirm REQUIREMENTS.md traceability: every v2.2 REQ-ID (HUB/IVW/PRAC/LEARN/PROG/REG) is delivered by its phase.

### Deferred cleanup (explicitly NOT this phase)
- The redirect shim route directories, unused `nav.*` i18n keys, and `BottomSheet.svelte` stay for now (one-release shim + follow-up cleanup, per Phase 30). Do NOT remove them here.

### Claude's Discretion
- Whether the capstone lives in one new file or extends existing tests.
- Exact representative chord/flow per hub.
- Whether to add a small coverage-matrix comment/doc mapping REG-02 items → their test files (nice-to-have, not required).

</decisions>

<code_context>
## Existing Code Insights

- The full suite is currently green (Phase 30 gate: `npm run build` + 106 files / 1459 tests + `npm run check` all passed).
- The 4 hubs: `/` (Lookup), `/practice`, `/learn`, `/progress`. 8 redirect shims: drills/build/voicings/progressions→/practice, scales/theory→/learn, recall/songs→/progress. showcase deleted.
- Test harness: vitest + @testing-library/svelte (jsdom). Preview/browser harness cannot hydrate this app (null-origin SvelteKit) — any purely-visual confirmation is a human_verification item, not an automated test.
- REG-02 coverage inventory above lists the existing test files per merge area.

## Integration points
- `tests/` (new capstone integration test), possibly small additions to existing test files.
- No production source changes expected unless the audit finds a genuine behavior gap (then fix + test).

</code_context>

<specifics>
## Specific Ideas

- Design testing strategy (source of REG-02): "Existing per-route test files remap to the hub that absorbs them. Merged Practice queue: interleaving tests incl. the single-type-due quality gate. IntervalView: unit tests stacked vs formula across each chord quality plus accidental carry-through. Redirect shims: a test per old route asserting redirect to the correct hub. Full suite + svelte-check must stay green."
- This phase closes the milestone — after it, the branch ships as a PR to main (user rule: always ship via PR).

</specifics>

<deferred>
## Deferred Ideas

- Removing shim route directories / unused nav keys / BottomSheet.svelte — follow-up cleanup milestone.
- On-device visual UAT for the hubs (Practice/Learn/Progress accent + phone layout) — tracked in phase 27/28/29 UAT files; user-owned, not this phase.
