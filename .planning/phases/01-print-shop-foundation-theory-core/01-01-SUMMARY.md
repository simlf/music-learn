---
phase: 01-print-shop-foundation-theory-core
plan: 01
subsystem: infra
tags: [sveltekit, svelte5, tailwind4, tonal, vitest, adapter-static, walking-skeleton]

# Dependency graph
requires: []
provides:
  - "Scaffolded SvelteKit 2.69.2 / Svelte 5.56.4 static app with adapter-static"
  - "Pinned TypeScript ^6.0.3 (never 7.x)"
  - "Tailwind 4.3.2 CSS-first @theme block with Print Shop color tokens + interval color language"
  - "Vitest 4.1.10 configured for component/e2e tests (jsdom + browser resolve condition)"
  - "spellChord(symbol) pure function in src/lib/theory/chord.ts wrapping tonal@6.4.3"
  - "/showcase route: chord input -> Show chord -> rendered spelled note names"
  - "01-SKELETON.md verified to match the built scaffold (no divergence)"
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: [sveltekit, svelte, typescript, vite, tailwindcss, "@tailwindcss/vite", tonal, vitest, "@testing-library/svelte", "@testing-library/jest-dom", jsdom, "@sveltejs/adapter-static"]
  patterns:
    - "Pure theory engine under src/lib/theory/* with zero DOM/audio imports, reusable by every later phase"
    - "Tailwind 4 CSS-first @theme tokens for the full Print Shop palette + interval color semantic aliases"
    - "Vitest resolve.conditions: ['browser'] required for @testing-library/svelte component tests under SvelteKit"

key-files:
  created:
    - package.json
    - svelte.config.js
    - vite.config.ts
    - tsconfig.json
    - .npmrc
    - .gitignore
    - src/app.html
    - src/app.css
    - src/app.d.ts
    - src/routes/+layout.svelte
    - src/routes/+layout.ts
    - src/routes/+page.svelte
    - src/routes/showcase/+page.svelte
    - src/lib/theory/chord.ts
    - src/lib/theory/chord.test.ts
    - tests/showcase.e2e.test.ts
    - vitest-setup.ts
    - static/favicon.png
  modified: []

key-decisions:
  - "Vite pinned to ^8.1.4 (CLAUDE.md said '8.x bundled via SvelteKit' without an exact patch; 8.1.4 is the latest and satisfies all peer ranges for @sveltejs/kit@2.69.2, @sveltejs/vite-plugin-svelte@7.2.0, @tailwindcss/vite@4.3.2, and vitest@4.1.10)"
  - "spellChord converts tonal's ASCII accidentals (b/#) to proper glyphs (♭/♯) at the theory-engine boundary, per UI-SPEC's 'never #/b in display text' rule, keeping later phases free of this conversion concern"
  - "Added resolve.conditions: ['browser'] to vite.config.ts (test config) - without it Vitest/jsdom loaded Svelte's server-only mount() and threw lifecycle_function_unavailable on every component render"
  - "Added types: [\"@testing-library/jest-dom\"] to tsconfig.json so svelte-check recognizes toBeInTheDocument() on test files"

patterns-established:
  - "TDD RED/GREEN cycle for Phase 1 feature work: failing e2e + unit tests committed first, then minimal implementation"
  - "01-SKELETON.md is treated as a living architectural contract checked against the actual scaffold each plan, not rewritten wholesale"

requirements-completed: [THEORY-01, DESIGN-01]

coverage:
  - id: D1
    description: "SvelteKit static app boots and serves /showcase without console errors"
    requirement: "DESIGN-01"
    verification:
      - kind: integration
        ref: "manual dev-server fetch: http://localhost:5173/showcase returns 200 and contains 'Chord showcase'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typing Cm7 into the showcase input and submitting renders the spelled note names C, E♭, G, B♭"
    requirement: "THEORY-01"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#typing Cm7 and clicking Show chord renders the spelled notes C, E♭, G, B♭"
        status: pass
      - kind: unit
        ref: "src/lib/theory/chord.test.ts#spells Cm7 as the four notes C, E♭, G, B♭"
        status: pass
    human_judgment: false
  - id: D3
    description: "Production build via adapter-static emits a fully static /showcase page (no server runtime required)"
    requirement: "DESIGN-01"
    verification:
      - kind: integration
        ref: "npm run build; find build/showcase.html; grep 'Chord showcase' build/showcase.html"
        status: pass
    human_judgment: false
  - id: D4
    description: "01-SKELETON.md architectural contract matches the built scaffold (no divergence needing edits)"
    requirement: "DESIGN-01"
    verification:
      - kind: manual_procedural
        ref: "Row-by-row comparison of 01-SKELETON.md Architectural Decisions table against package.json/svelte.config.js/src layout"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-12
status: complete
---

# Phase 1 Plan 1: Walking Skeleton Summary

**SvelteKit 2.69.2/Svelte 5.56.4 static app with a pure `tonal`-backed `spellChord()` engine, rendering Cm7 -> C, E♭, G, B♭ on a real `/showcase` route, built via a RED-GREEN TDD cycle.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-12T22:33:00Z
- **Completed:** 2026-07-12T22:39:00Z
- **Tasks:** 3
- **Files modified:** 18 (17 created, 1 skeleton doc verified with no edits needed)

## Accomplishments

- Scaffolded a SvelteKit 2.69.2 / Svelte 5.56.4 static app (`adapter-static`, prerender enabled) with TypeScript pinned to `^6.0.3`, Tailwind 4.3.2 CSS-first `@theme` tokens for the full Print Shop palette + interval color language, and Vitest 4.1.10 wired for jsdom component testing.
- Wrote a RED end-to-end test (`tests/showcase.e2e.test.ts`) and RED unit tests (`src/lib/theory/chord.test.ts`) first, confirmed both failed on module resolution, then implemented the thinnest real slice: `spellChord()` wrapping `tonal`'s `Chord.get()`, and the `/showcase` page wiring input -> `spellChord` -> rendered note names. All 3 tests now pass (GREEN).
- Verified `01-SKELETON.md` (authored by the planner) matches the built scaffold row-by-row with zero divergence - no edits were needed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold SvelteKit static app with the pinned stack** - `00184a4` (feat)
2. **Task 2: RED end-to-end test + thinnest real showcase slice** - `e5be147` (test, RED) then `d2fd628` (feat, GREEN)
3. **Task 3: Verify 01-SKELETON.md architectural contract matches the built scaffold** - no commit (verification-only task, zero divergence found, file already correct)

_Task 2 is a TDD task: RED commit `e5be147` then GREEN commit `d2fd628`. No REFACTOR commit - the GREEN implementation was already minimal and needed no cleanup._

## Files Created/Modified

- `package.json` - SvelteKit 2.69.2, Svelte 5.56.4, TypeScript ^6.0.3, tonal 6.4.3, Vitest 4.1.10, Tailwind 4.3.2, adapter-static 3.0.10 (all versions verified against npm registry, matching CLAUDE.md pins exactly)
- `svelte.config.js` - `@sveltejs/adapter-static` configured with strict prerendering
- `vite.config.ts` - Tailwind + SvelteKit Vite plugins, Vitest jsdom config, `resolve.conditions: ['browser']`
- `tsconfig.json` - strict TS config extending `.svelte-kit/tsconfig.json`, `types: ["@testing-library/jest-dom"]`
- `.npmrc` - documents the TS 6.x pin rationale
- `.gitignore` - added (was missing from the repo entirely)
- `src/app.css` - Tailwind 4 `@theme` block: 9 Print Shop palette tokens + 4 interval color aliases + font stacks, global `border-radius: 0`
- `src/app.html`, `src/app.d.ts` - standard SvelteKit app shell
- `src/routes/+layout.svelte`, `src/routes/+layout.ts` - imports `app.css`, sets `prerender = true`
- `src/routes/+page.svelte` - root page redirects/links to `/showcase`
- `src/routes/showcase/+page.svelte` - chord input, `Show chord` button, result region; placeholder rewritten per D-05 (no em dash)
- `src/lib/theory/chord.ts` - `spellChord(symbol)` pure function, tonal-backed, glyph-converted accidentals
- `src/lib/theory/chord.test.ts`, `tests/showcase.e2e.test.ts` - unit + e2e tests (written RED-first)
- `vitest-setup.ts` - imports `@testing-library/jest-dom/vitest`
- `static/favicon.png` - minimal placeholder asset (see Deviations)

## Decisions Made

- Vite pinned to `^8.1.4` (latest 8.x) since CLAUDE.md specified "8.x bundled via SvelteKit" without an exact version; verified compatible with all peer dependency ranges.
- `spellChord` performs the ASCII-to-glyph accidental conversion (`b`->`♭`, `#`->`♯`) itself, keeping display-glyph correctness at the theory-engine boundary rather than pushing it into UI components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `resolve.conditions: ['browser']` to vite.config.ts**
- **Found during:** Task 2 (running the e2e test after implementing the showcase page)
- **Issue:** `@testing-library/svelte`'s `render()` call threw `Svelte error: lifecycle_function_unavailable - mount(...) is not available on the server`. Vitest/jsdom was resolving Svelte's server-only build instead of the client build.
- **Fix:** Added `resolve: { conditions: ['browser'] }` to the Vite config so the test environment picks Svelte's client entrypoint.
- **Files modified:** `vite.config.ts`
- **Verification:** `npx vitest run` passes all 3 tests after the fix.
- **Committed in:** `d2fd628` (Task 2 GREEN commit)

**2. [Rule 1 - Bug] Added `/// <reference types="vitest/config" />` to vite.config.ts**
- **Found during:** Task 1 (running `svelte-check` per the verify command)
- **Issue:** TypeScript rejected the `test: {...}` key in `defineConfig()` with "Object literal may only specify known properties" because Vite's base config type doesn't include Vitest's `test` extension without the triple-slash reference.
- **Fix:** Added the reference directive.
- **Files modified:** `vite.config.ts`
- **Verification:** `svelte-check` reports 0 errors.
- **Committed in:** `00184a4` (Task 1 commit)

**3. [Rule 1 - Bug] Added `types: ["@testing-library/jest-dom"]` to tsconfig.json**
- **Found during:** Task 2 (running `svelte-check` after writing the e2e test using `toBeInTheDocument()`)
- **Issue:** `svelte-check` reported 4 errors: "Property 'toBeInTheDocument' does not exist on type 'Assertion<HTMLElement>'" because the jest-dom matcher type augmentation wasn't in the type-checking graph for standalone test files.
- **Fix:** Added the explicit `types` compiler option referencing the `@testing-library/jest-dom` ambient types.
- **Files modified:** `tsconfig.json`
- **Verification:** `svelte-check` reports 0 errors; tests still pass.
- **Committed in:** `d2fd628` (Task 2 GREEN commit)

**4. [Rule 3 - Blocking] Added `static/favicon.png`**
- **Found during:** Task 2 (running `npm run build` to sanity-check the static output)
- **Issue:** `src/app.html` references `%sveltekit.assets%/favicon.png`, but no `static/` directory or favicon file existed. `adapter-static`'s strict prerendering crashed the build with `404 /favicon.png (linked from /)`.
- **Fix:** Added a minimal 1x1 transparent PNG at `static/favicon.png` so the prerender crawl resolves the link.
- **Files modified:** `static/favicon.png` (new)
- **Verification:** `npm run build` completes and writes `build/index.html` + `build/showcase.html`.
- **Committed in:** `d2fd628` (Task 2 GREEN commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bug fixes)
**Impact on plan:** All four were necessary to satisfy the plan's own verification commands (`svelte-check` 0 errors, `vitest run` passing, `npm run build` succeeding). No scope creep - no new features, no architectural changes.

## Issues Encountered

- `npm audit` reports 3 low-severity advisories, all transitively from `cookie <0.7.0` pulled in by `@sveltejs/kit@2.69.2` -> `@sveltejs/adapter-static@3.0.10`. No fix is available without downgrading `@sveltejs/kit` to a pre-release (`npm audit fix --force` would install `@sveltejs/kit@0.0.30`, a breaking regression). This is out of scope for this plan (pre-existing in the pinned dependency tree, not introduced by any task here) and low severity. Flagging for awareness; revisit when SvelteKit ships a patched `cookie` transitive dependency.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The walking skeleton is fully wired end-to-end: static SvelteKit app, `tonal`-backed pure theory engine, `/showcase` route, all committed with passing tests and a clean production build.
- `spellChord()` is intentionally minimal (wraps `tonal` directly, no alias normalization beyond what `tonal` provides, no dual solfège naming yet) - Plan 02 expands it into the full theory engine (THEORY-02 aliases, THEORY-03 enharmonic correctness, THEORY-04 solfège).
- The showcase page has hard-coded inline styling, not yet using the Print Shop components (`PianoKeyboard.svelte`, `ChordGlyph.svelte`, etc.) - Plan 03 builds those components and Plan 04 wires the full showcase experience per `01-UI-SPEC.md`.
- No blockers for Plan 02.

## Self-Check: PASSED

All 18 created files verified present on disk. All 4 commits (`00184a4`, `e5be147`, `d2fd628`, `afa54f5`) verified in git log. All plan-level `<verification>` commands re-run and passing: `npm install` clean, `svelte-check` 0 errors, `vitest run` 3/3 passing, `npm run build` produces `build/showcase.html`, no forbidden dependencies, TypeScript resolves to `6.0.3`.

---
*Phase: 01-print-shop-foundation-theory-core*
*Completed: 2026-07-12*
