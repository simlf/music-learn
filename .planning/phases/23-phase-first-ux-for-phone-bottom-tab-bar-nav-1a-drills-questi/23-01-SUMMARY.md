---
phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi
plan: 01
subsystem: ui
tags: [svelte, i18n, bottom-sheet, matchMedia, drills, vitest]

# Dependency graph
requires:
  - phase: 20-french-translation
    provides: i18n messages system (t(), setLocale, parity/coverage gates)
  - phase: 15-playable-keyboard-everywhere
    provides: keyboard-inline-not-docked decision (no fixed/sticky keyboard)
provides:
  - Shared BottomSheet.svelte primitive (backdrop/Close/Escape dismiss, safe-area aware)
  - Drills phone-portrait compact strip replacing LevelPicker card + mode row + SongFilterToggle bar
  - Phone-only grid reflow (drop hint area, grow keyboard/Check) with no per-question scroll
  - chrome.sheet.close, drills.strip.ariaOpen, drills.strip.ariaClose i18n keys (en+fr)
affects: [23-04-more-sheet, phase-first-ux-for-phone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synchronous matchMedia-gated reactive flag (isPhone), mirroring the existing hintDismissed init pattern, so SSR/jsdom default to desktop deterministically"
    - "Generic dependency-free BottomSheet.svelte primitive reused across phone-first UX surfaces (this plan + future 1A More sheet)"

key-files:
  created:
    - src/lib/components/BottomSheet.svelte
    - src/lib/components/bottomSheet.test.ts
    - src/routes/drillsPhoneStrip.test.ts
  modified:
    - src/routes/drills/+page.svelte
    - src/lib/i18n/messages/drills.ts
    - src/lib/i18n/messages/chrome.ts

key-decisions:
  - "isPhone read synchronously via guarded window.matchMedia at component init (not onMount-only), keeping every pre-existing drills test suite locked to the desktop branch since jsdom has no matchMedia"
  - "Strip and sheet use {#if isPhone}/{:else} exclusive branching (never dual-rendered) so existing tests querying singular testids stay valid"
  - "Compact score line reuses locale-neutral glyphs (/, ✓) instead of the verbose drills.score.* i18n keys, avoiding a redundant key set"

patterns-established:
  - "Pattern: shared BottomSheet.svelte primitive for phone-first sheet UX (backdrop role=button + keydown, Escape via svelte:window, z-index 100/101 reserved above future tab bar)"

requirements-completed: [UX-1B]

coverage:
  - id: D1
    description: "BottomSheet.svelte primitive: renders nothing when closed; dismisses via backdrop tap, Close button, or Escape; safe-area-aware; reduced-motion guarded"
    requirement: "UX-1B"
    verification:
      - kind: unit
        ref: "src/lib/components/bottomSheet.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Drills phone compact strip replaces LevelPicker card/mode row/SongFilterToggle bar on phone; desktop branch byte-identical"
    requirement: "UX-1B"
    verification:
      - kind: unit
        ref: "src/routes/drillsPhoneStrip.test.ts#Drills phone compact strip (Phase 23 1B, Task 3)"
        status: pass
      - kind: unit
        ref: "src/routes/drillsSongFilter.test.ts (desktop branch, unmodified)"
        status: pass
      - kind: unit
        ref: "src/routes/drillsChordReplay.test.ts (desktop branch, unmodified)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sheet opens on strip tap holding LevelPicker + mode tabs + SongFilterToggle (discrete=false) + rotate hint, aria-expanded flips, closes via Close control or backdrop"
    requirement: "UX-1B"
    verification:
      - kind: unit
        ref: "src/routes/drillsPhoneStrip.test.ts#opens the sheet on strip tap with LevelPicker, mode tabs, SongFilterToggle (discrete=false), and rotate hint"
        status: pass
      - kind: unit
        ref: "src/routes/drillsPhoneStrip.test.ts#closes the sheet via the Close control and returns aria-expanded to false"
        status: pass
      - kind: unit
        ref: "src/routes/drillsPhoneStrip.test.ts#closes the sheet via the backdrop"
        status: pass
    human_judgment: false
  - id: D4
    description: "New i18n keys (chrome.sheet.close, drills.strip.ariaOpen/ariaClose) pass parity + no-raw-key-leak gates; FR aria-label renders correctly"
    requirement: "UX-1B"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts"
        status: pass
      - kind: unit
        ref: "src/routes/drillsPhoneStrip.test.ts#renders the French aria-label on the strip open button under fr, with the ChordGlyph immune to translation"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phone-only grid reflow: no per-question scroll, ~180px keyboard, ~52px Check, keyboard never fixed/sticky; sheet slide-in and exact perceived spacing"
    verification: []
    human_judgment: true
    rationale: "Preview harness cannot hydrate this app (null-origin SSR); exact perceived spacing, slide transition feel, and the no-scroll-per-question experience require an on-device eyeball per the phase's stated visual-verification limitation."

# Metrics
duration: 11min
completed: 2026-07-19
status: complete
---

# Phase 23 Plan 01: Drills question-first reflow (1B) Summary

**Phone-portrait Drills collapses the LevelPicker card, mode tabs, and SongFilterToggle bar into one tappable compact strip that opens a shared BottomSheet, removing the scroll-per-question friction while leaving desktop byte-identical.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-19T19:20:34+02:00 (Task 1 commit)
- **Completed:** 2026-07-19T21:31:36+02:00 (Task 3 commit)
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified across the plan)

## Accomplishments
- Built `BottomSheet.svelte`, a generic dependency-free bottom-sheet primitive (backdrop/Close/Escape dismiss, safe-area-aware, reduced-motion guarded) shared by this plan and reserved for the future 1A More sheet.
- Collapsed the Drills phone-portrait chrome (LevelPicker card + mode-tabs/score row + SongFilterToggle bar) into a single compact strip (`data-testid="drill-strip"`) that opens the sheet with all four pieces (LevelPicker, mode tabs, SongFilterToggle with `discrete={false}`, rotate hint) unmodified — desktop (>=640px) renders byte-identical to before.
- Added a phone-only grid reflow dropping the `hint` grid area and growing the keyboard/Check button, keeping the keyboard fully inline (never fixed/sticky) per the locked keyboard-inline decision.
- Added `drillsPhoneStrip.test.ts` (5 tests) proving strip visibility, sheet open/close via both Close button and backdrop, `aria-expanded` flip, and the French aria-label with ChordGlyph immunity — full root suite (1297 tests) green, `npm run check` 0 errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: BottomSheet.svelte shared primitive + chrome.sheet.close key** - `ecc30bf` (feat)
2. **Task 2: Drills phone compact strip + grid reflow (isPhone-gated)** - `04cb894` (feat)
3. **Task 3: Phone-mode tests for the strip + sheet** - `8a28746` (test)

**Plan metadata:** (this commit)

_Note: This plan is a continuation — Tasks 1 and 2 were committed by a prior executor run that was cut off by an API error before writing SUMMARY.md; this executor verified those commits on disk, then completed Task 3 and this summary._

## Files Created/Modified
- `src/lib/components/BottomSheet.svelte` - Generic phone-only bottom-sheet primitive (backdrop tap / Close button / Escape dismiss, `role="dialog"`, safe-area padding, reduced-motion-guarded slide-in)
- `src/lib/components/bottomSheet.test.ts` - Unit tests for the BottomSheet primitive (open/closed rendering, dismiss paths)
- `src/lib/i18n/messages/chrome.ts` - Added `chrome.sheet.close` (en/fr)
- `src/routes/drills/+page.svelte` - `isPhone` reactive flag (synchronous matchMedia init + onMount live listener), phone-only compact strip + `sheetOpen` state driving `BottomSheet`, phone-only `@media (max-width: 639.98px)` grid reflow
- `src/lib/i18n/messages/drills.ts` - Added `drills.strip.ariaOpen`/`drills.strip.ariaClose` (en/fr)
- `src/routes/drillsPhoneStrip.test.ts` - Phone-mode tests: strip visibility, sheet open/close (Close control + backdrop), aria-expanded flip, FR aria-label + ChordGlyph immunity

## Decisions Made
- `isPhone` is read synchronously at component init via a guarded `window.matchMedia` call (mirroring the existing `hintDismissed` synchronous-init pattern), so SSR/prerender and jsdom (no `matchMedia`) both resolve deterministically to the desktop branch — this is what keeps `drillsSongFilter.test.ts` and `drillsChordReplay.test.ts` green untouched without any test modification.
- Strip/sheet content is `{#if isPhone}/{:else}` exclusive (never dual-rendered), matching the plan's explicit requirement that existing tests querying singular `data-testid`s not see duplicate matches.
- The phone strip's compact score line uses locale-neutral glyphs (`/`, `✓`) rather than introducing new verbose i18n keys mirroring `drills.score.of/right/streak` — those glyphs and numerals carry no translatable text, so no new score-specific key was needed for this line.

## Deviations from Plan

None - Task 3 executed exactly as written. (Tasks 1-2 were completed by the prior executor session; their commits were verified on disk against the plan's acceptance criteria as part of this continuation and found to match the plan without deviation.)

## Issues Encountered
- The prior executor session was cut off by an API error after committing Tasks 1 and 2 but before Task 3/SUMMARY. This continuation verified both prior commits exist and match plan intent (via `git show --stat` and reading the resulting `+page.svelte` markup) before proceeding, per the continuation protocol — no rework was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `BottomSheet.svelte` is ready for direct reuse by plan 23-04 (1A More sheet) with no changes needed — it is deliberately generic and drills-agnostic.
- VISUAL (device) follow-up still open per the plan's stated preview-harness limitation: on-device eyeball of sheet slide-in feel, exact ~180px keyboard / ~52px Check sizing, safe-area clearance on an installed PWA, and the no-scroll-per-question experience on a real phone.

---
*Phase: 23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi*
*Completed: 2026-07-19*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (ecc30bf, 04cb894, 8a28746) verified present in git log.
