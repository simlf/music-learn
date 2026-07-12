---
phase: 02-chord-lookup-companion
plan: 02
subsystem: ui
tags: [svelte5, localstorage, recent-lookups, ergonomics, mobile, vitest]

# Dependency graph
requires:
  - phase: 02-chord-lookup-companion
    provides: "Plan 01's lookup page (/) and its showChord/showChordFromSymbol pattern, $lib/lookup/chordPresentation module"
provides:
  - "Recent-lookups persistence module ($lib/lookup/recentLookups.ts) — last 5 distinct symbols, most-recent-first, localStorage-backed, device-local"
  - "RecentChipRow.svelte — wrapping ghost-chip row, absent when empty, reusable by future phases needing a chip-list pattern"
  - "Lookup page ergonomics: recent-chip re-stamp, sharp/flat glyph helpers, autofocus, type-over-select"
  - "Fix to vitest-setup.ts making localStorage usable in all jsdom-environment tests project-wide"
affects: [02-03, phase-03-drills]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure localStorage persistence module (recentLookups.ts) following randomChord.ts's style: exported functions, JSDoc rationale, no Svelte/DOM framework coupling, try/catch around storage access"
    - "Ghost-chip list component pattern (RecentChipRow) that renders nothing when its data is empty, for future reuse by any chip-based UI"

key-files:
  created:
    - src/lib/lookup/recentLookups.ts
    - src/lib/lookup/recentLookups.test.ts
    - src/lib/components/RecentChipRow.svelte
  modified:
    - src/routes/+page.svelte
    - src/lib/components/components.test.ts
    - tests/lookup.e2e.test.ts
    - src/lib/components/Button.svelte
    - vitest-setup.ts

key-decisions:
  - "Node 22+'s built-in globalThis.localStorage stub silently shadows jsdom's working implementation inside vitest's jsdom environment (vitest's populateGlobal only copies window keys not already present on global, and localStorage already exists via Node's global). Fixed once in vitest-setup.ts by reaching into jsdom's internal window (window.jsdom.window) to restore the real implementation, benefiting every test file in the project rather than working around it per-test."
  - "Button.svelte's shared .ps-button rule gained min-height/min-width: 44px rather than passing a class prop through Button's ...rest spread — Svelte overwrites (not merges) a static class attribute when spread props include their own class key, so per-call class overrides would have silently dropped the ps-button/ps-button--ghost styling entirely."
  - "Glyph insertion uses inputEl.selectionStart/selectionEnd captured before the state update, with queueMicrotask to restore focus/caret after Svelte re-renders the input value — avoids caret jumping to the end of the string on every helper tap."

requirements-completed: [LOOK-01]

coverage:
  - id: D1
    description: "After looking up chords, a row of the last 5 distinct symbols appears; tapping one re-stamps that chord without retyping."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#shows a recent-chip row after stamping, and re-stamps on chip click"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#does not render a recent-chip row before the first successful lookup"
        status: pass
      - kind: unit
        ref: "src/lib/lookup/recentLookups.test.ts (7 tests: empty store, single add, most-recent-first, dedupe-to-front, cap-at-5, corrupt-value, malformed-JSON)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The input has sharp/flat helper buttons that insert the glyph at the caret, autofocuses on load, and re-selects its content after a stamp."
    requirement: "LOOK-01"
    verification:
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#clicking the sharp helper inserts the glyph into the input value"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#clicking the flat helper inserts the glyph into the input value"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#autofocuses the input on initial mount"
        status: pass
      - kind: e2e
        ref: "tests/lookup.e2e.test.ts#re-selects the input content after a successful stamp for type-over entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recent lookups persist across page reloads via localStorage and stay device-local."
    requirement: "LOOK-01"
    verification:
      - kind: unit
        ref: "src/lib/lookup/recentLookups.test.ts (localStorage persistence, cap at 5, dedupe)"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev; look up 6 distinct chords in the browser, reload the page, confirm the same 5 chips (most-recent-first) reappear"
        status: pending
    human_judgment: true
    rationale: "Actual cross-reload persistence in a real browser tab is not exercised by the jsdom-based e2e suite (each test renders a fresh component instance in the same jsdom localStorage backing, which proves the read/write contract but not an actual page navigation/reload cycle). Deferred to the phase's end-of-phase manual verification pass per config's human_verify_mode: end-of-phase."
  - id: D4
    description: "RecentChipRow renders up to 5 wrapping ghost chips (never scrolls) and is entirely absent when there is no history."
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts > RecentChipRow (3 tests: chips render with aria-labels, empty renders nothing, onselect fires with symbol)"
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-07-13
status: complete
---

# Phase 2 Plan 2: Recent Lookups, Helper Buttons, and Focus Ergonomics Summary

**Mid-song ergonomics layered onto the lookup page: a persisted last-5-distinct recent-chips row (tap to re-stamp), sharp/flat glyph helper buttons that insert at the caret, and autofocus plus type-over-select input behavior, so a player working through a real song never has to retype a repeated chord or fight a phone keyboard for an accidental.**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-07-13
- **Tasks:** 3
- **Files modified:** 8 (3 new: module + test + component; 5 modified: page, page e2e, shared component test, Button.svelte, vitest-setup.ts)

## Accomplishments

- `$lib/lookup/recentLookups.ts`: pure, tested localStorage persistence module. Last 5 distinct symbols, most-recent-first, dedupe-to-front, safe on corrupt/malformed storage (try/catch, string-array validation)
- `RecentChipRow.svelte`: wrapping ghost-chip row, absent when empty, per-chip `aria-label="Look up {symbol} again"`, wired to `onselect` for re-stamping
- Lookup page now calls `addRecentLookup` on every recognized stamp and renders the chip row directly below the input row
- Sharp/flat ghost helper buttons splice the glyph at the input's current caret position rather than always appending, and restore caret/focus afterward
- Input autofocuses on page mount and re-selects its full value after every successful stamp, so the next chord types over the old one without a manual clear
- Extended `tests/lookup.e2e.test.ts` with 6 new tests covering all five behaviors from the plan; all 4 Plan 01 assertions still pass unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: Recent-lookups localStorage module (with tests)** - `184b664` (feat)
2. **Task 2: RecentChipRow component** - `f93d175` (feat)
3. **Task 3: Wire recents, helpers, and focus behavior into the lookup page** - `95c595e` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/lib/lookup/recentLookups.ts` - Pure `getRecentLookups`/`addRecentLookup` persistence module, localStorage key `music-learn:recent-lookups`, cap `MAX_RECENT = 5`
- `src/lib/lookup/recentLookups.test.ts` - 7 co-located Vitest tests (empty store, single add, ordering, dedupe, cap, corrupt value, malformed JSON)
- `src/lib/components/RecentChipRow.svelte` - Ghost-chip row component, `recent`/`onselect` props, `flex-wrap` (never scrolls), absent when empty
- `src/lib/components/components.test.ts` - Added a `RecentChipRow` describe block (3 tests) alongside the existing `PianoKeyboard` tests
- `src/routes/+page.svelte` - Wires `getRecentLookups`/`addRecentLookup`/`RecentChipRow`, adds sharp/flat helper buttons with caret-aware glyph insertion, autofocus via a Svelte action, and post-stamp focus+select
- `tests/lookup.e2e.test.ts` - Added `beforeEach(() => localStorage.clear())` plus 6 new tests (recents appear/re-stamp, empty-history hides row, sharp insertion, flat insertion, autofocus, type-over select)
- `src/lib/components/Button.svelte` - Added `min-height`/`min-width: 44px` to the shared `.ps-button` rule (see Deviations)
- `vitest-setup.ts` - Fixed a project-wide localStorage shadowing bug in the jsdom test environment (see Deviations)

## Decisions Made

- Recent-lookups module follows `randomChord.ts`'s pure-module style exactly: exported functions, JSDoc explaining device-local scope and the Phase 8 cross-device deferral, no Svelte imports, try/catch around all localStorage access so a disabled or quota-exceeded store degrades to a no-op rather than crashing the page.
- Glyph insertion reads `inputEl.selectionStart`/`selectionEnd` before splicing so helper taps insert at the caret (not always at the end), then uses `queueMicrotask` to restore focus and place the caret immediately after the inserted glyph once Svelte's reactive update has re-rendered the input's value.
- Kept `RecentChipRow`'s tests inside the existing shared `components.test.ts` file (matching the current one-file-per-directory convention observed for `PianoKeyboard`) rather than creating a separate `RecentChipRow.test.ts`, since the plan's verify step (`npx vitest run src/lib/components/`) runs the whole directory either way.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Node 22+'s built-in `localStorage` global shadowed jsdom's implementation in every test**
- **Found during:** Task 1, first test run of `recentLookups.test.ts`
- **Issue:** `localStorage.clear is not a function` on the very first test. Root-caused by tracing vitest's jsdom environment source (`populateGlobal`/`getWindowKeys` in `node_modules/vitest/dist/chunks/index.DC7d2Pf8.js`): vitest only copies a `window` key onto the test's `globalThis` if that key does not already exist on `global`. Node 22+ ships its own built-in `globalThis.localStorage` (an inert stub unless `--localstorage-file` is passed), so `'localStorage' in global` was already true, and vitest silently skipped copying over jsdom's real, working `localStorage`. Even reading `window.localStorage` from inside a test resolved through the same filtered proxy back to Node's stub.
- **Fix:** In `vitest-setup.ts`, reach into jsdom's internal window (exposed by vitest's jsdom environment as `globalThis.jsdom.window`) to get the actual working `localStorage` implementation, and force `globalThis.localStorage` to it via `Object.defineProperty` before any test runs. This is a one-time, project-wide fix rather than a per-test workaround.
- **Files modified:** `vitest-setup.ts`
- **Commit:** `184b664`

**2. [Rule 1 - Bug] Passing a `class` prop through `Button`'s `...rest` spread silently dropped all of Button's own styling**
- **Found during:** Task 3, initial implementation of the sharp/flat helper buttons (attempted `class="min-h-11 min-w-11"` on the `Button` usage to guarantee the 44px touch target)
- **Issue:** Verified via a throwaway render probe that a `class` prop passed to `Button` and spread via `{...rest}` after Button's own static `class="ps-button ps-button--{variant}"` attribute overwrites rather than merges in this Svelte compiler version — the resulting button element had only `min-h-11 min-w-11` in its class list, with `ps-button`/`ps-button--ghost` (and all their vermilion/ghost/border styling) silently gone.
- **Fix:** Removed the `class` prop from the helper-button call sites and instead added `min-height: 44px; min-width: 44px;` directly to the shared `.ps-button` CSS rule in `Button.svelte`, which the UI-SPEC had already flagged as a possible needed check ("confirm ghost buttons at single-glyph content still clear the 44px minimum touch target"). This benefits every ghost-variant single-glyph usage (helper buttons here, recent chips from Task 2) without needing per-call class overrides anywhere.
- **Files modified:** `src/lib/components/Button.svelte`, `src/routes/+page.svelte`
- **Commit:** `95c595e`

## Issues Encountered

None beyond the two auto-fixed items above (both resolved within the fix-attempt budget, no deferred issues).

## User Setup Required

None. No external service configuration required; all changes are client-side code and tests.

## Next Phase Readiness

- LOOK-01's mid-song ergonomics (recent chips, glyph helpers, focus flow) are live on the lookup page, building directly on Plan 01's `showChord`/`showChordFromSymbol` pattern without modifying it.
- `$lib/lookup/recentLookups.ts` and `RecentChipRow.svelte` are both generically reusable (no lookup-page-specific coupling) if Phase 3 drills ever want a "recent items" pattern.
- The `vitest-setup.ts` localStorage fix is a project-wide infrastructure improvement; any future module using `localStorage`/`sessionStorage` in tests (e.g. Phase 8's persistence work) will work correctly without rediscovering this issue.
- Manual cross-reload verification of localStorage persistence (D3) is deferred to the phase's end-of-phase human verification pass, consistent with `human_verify_mode: end-of-phase` in `.planning/config.json` — not a blocker for Plan 03.
- No blockers identified for Plan 03 (did-you-mean suggestion).

---
*Phase: 02-chord-lookup-companion*
*Completed: 2026-07-13*

## Self-Check: PASSED

All created files found on disk (`src/lib/lookup/recentLookups.ts`, `src/lib/lookup/recentLookups.test.ts`, `src/lib/components/RecentChipRow.svelte`, this summary); all task commits (184b664, f93d175, 95c595e) verified present in git log.
