# Walking Skeleton — Music Learn (Jazz Piano Theory Companion)

**Phase:** 1
**Generated:** 2026-07-12

## Capability Proven End-to-End

> One sentence: the smallest user-visible capability that exercises the full stack.

A user opens the static app, types a jazz chord symbol on `/showcase`, and sees its
enharmonically-correct spelled notes rendered on a colored keyboard with dual letter/solfège
naming — served by the SvelteKit `adapter-static` build with no server runtime.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | SvelteKit 2.69.x / Svelte 5.56.x (runes) | Light, mostly-client single-user app; compiler reactivity ships far less JS than React/Next; runes give clean drill/session state without a state library. Locked in `.claude/CLAUDE.md`. |
| Language | TypeScript ^6.0 (NOT 7.x) | TS 7.0 has no stable programmatic API and breaks svelte-check/language-server as of 2026-07; pin to 6.x until SvelteKit's TS 7 support is non-experimental. Locked in `.claude/CLAUDE.md`. |
| Build / hosting | Vite (via kit) + `@sveltejs/adapter-static` | Produces a fully static build deployable anywhere for free; no serverless/backend needed in v1. Full HTTPS deploy to the Oracle server is Phase 9. |
| Theory engine | `tonal@6.4.3`, wrapped in `src/lib/theory/*` as a pure module | Purpose-built chord/scale spelling with a jazz alias dictionary and enharmonic correctness; never hand-roll regex chord parsing. Pure (no DOM/audio) so Phases 2-6 reuse it. |
| Styling | Tailwind CSS 4.3.x (CSS-first `@theme`) | Utility CSS with CSS-custom-property design tokens; the Print Shop palette + interval color language live as `@theme` tokens (`--color-root/-third/-fifth/-seventh` etc.), `border-radius: 0` global. |
| Testing | Vitest 4.1.x + @testing-library/svelte (jsdom) | Unit-test the pure theory engine against a reference chord chart; component/e2e tests for the showcase render. |
| Data layer | NONE in Phase 1 | Per `01-CONTEXT.md` phase boundary: no persistence, no backend this phase. Persistence (Dexie/IndexedDB) and the Oracle SQLite backend arrive in Phases 8-9. Do not invent persistence to satisfy the skeleton template — N/A here. |
| Auth | NONE (ever) | Single-user personal tool; multi-user accounts are explicitly Out of Scope in REQUIREMENTS.md. |
| Audio | `tone@15.1.22` plain synth only (added in Plan 04) | Simple `Tone.Synth` "hear it" playback (D-11); `@tonejs/piano` sampled sound deferred (Deferred Ideas). |
| Deployment target | `adapter-static` output; Phase 1 exercises the stack via `npm run dev` / `npm run build` | Live HTTPS deploy to the user's Oracle server is Phase 9 (HTTPS required for Web MIDI). |
| Directory layout | `src/lib/theory/*` (pure engine), `src/lib/components/*` (Print Shop components), `src/lib/audio/*` (Tone.js), `src/lib/copy/*` (voice/copy), `src/routes/showcase` (route) | Feature/responsibility folders; the theory engine is import-isolated from DOM/audio so every later phase consumes it cleanly. |

## Stack Touched in Phase 1

- [x] Project scaffold (SvelteKit + Vite + Tailwind 4 + Vitest, lint/type-check via svelte-check)
- [x] Routing — real `/showcase` route (prerendered via adapter-static)
- [ ] Database — **N/A for Phase 1** (no persistence/backend per phase boundary; deferred to Phases 8-9)
- [x] UI — interactive chord input wired to the pure theory engine, rendered on Print Shop components
- [x] Deployment — documented local full-stack run (`npm run dev`) and static build (`npm run build`)

## Out of Scope (Deferred to Later Slices)

> Explicitly not in the skeleton — prevents later phases from re-litigating Phase 1's minimalism.

- Persistence of any kind (drill history, streaks) — Phase 8 (Dexie now, Oracle SQLite backend Phase 8-9)
- Backend / server runtime — Phase 9
- MIDI input (Web MIDI / webmidi) — Phase 4
- Clickable/interactive keyboard input — Phase 3 (Phase 1 keyboard is display-only)
- Drills (construction/identification), feedback, interleaving, fading scaffolds — Phases 3, 5
- Chord lookup UX polish (fuzzy "did you mean") — Phase 2+
- Scales and fingerings — Phase 6
- Theory lessons — Phase 7
- Sampled realistic piano (`@tonejs/piano`) — deferred (possible ear-training later)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its
architectural decisions:

- Phase 2: Chord Lookup Companion — type a symbol, see notes on the colored keyboard next to the piano.
- Phase 3: On-Screen Drill Loop — construction & identification drills with elaborative feedback on a now-clickable keyboard.
- Phase 4: MIDI Play-to-Answer — answer the same drills by playing the connected digital piano (Web MIDI, Chromium).
- Phase 5: Smart Drill Design — interleaved sessions, scoped practice, fading label scaffolds.
- Phase 6: Major Scales — drill/reference all 12 major scales with fingerings, expanding from G major.
- Phase 7: Theory Lessons — short shape-first lessons using the interval color language.
- Phase 8: Progress & Streaks — cross-device answer history, weakness-aware stats, daily streak (backend + SQLite).
- Phase 9: Deploy to the Piano — live on the Oracle server over HTTPS, responsive on laptop and phone.
