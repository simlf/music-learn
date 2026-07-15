---
phase: 15-playable-keyboard-everywhere
verified: 2026-07-15T22:44:35Z
status: passed
score: 3/3 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 15: Playable Keyboard Everywhere Verification Report

**Phase Goal:** Every page that shows a piano keyboard carries a docked, always-playable keyboard — tapping any key sounds immediately through the existing audio engine — so practice input is uniform across Lookup, Drills, Recall, Scales, and Theory.
**Verified:** 2026-07-15T22:44:35Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On every keyboard-bearing surface (Lookup, /drills, /recall, /scales Practice, /theory) a keyboard is present and tapping a key plays its pitch through the existing audio engine, honoring the persisted sound toggle | VERIFIED | Lookup (`src/routes/+page.svelte:63-77`) and Theory (`src/routes/theory/+page.svelte:76-98`) each register an inspectable `PianoKeyboard` snippet with `getDockRegistry()`; Scales Practice (`src/lib/components/ScaleKeyboardDrill.svelte:122-138`) hands its key-strip to the dock; Drills (`src/routes/drills/+page.svelte:341-345,673-727`) collapses all four former inline keyboard sites into one mode-aware `dockedKeyboard` snippet registered with the dock (short-landscape carve-out renders the same snippet inline instead, never dropped); Recall (`src/lib/components/RecallSession.svelte:223-227,560-580`) registers one mode-aware snippet for Modes A/B/formula, and the embedded `BuildSession` (`src/lib/components/BuildSession.svelte:461-490,532-548`) docks its constructable keyboard for Mode C. All tap paths route through `PianoKeyboard`'s `playNote`/`inspectWhiteKey`/`inspectBlackKey` (`src/lib/components/PianoKeyboard.svelte:227,237-242`), and `playNote` gates on `soundEnabled()` (`src/lib/audio/audio.ts:129,175,190,220`) — the same toggle every other audio call site already honors, inherited unchanged. Confirmed by full test suite (1006/1006 passing) including per-page dock tests (`lookupDock.test.ts`, `theoryDock.test.ts`, `scaleKeyboardDrill.test.ts`, `drillsDock.test.ts`, `recallSession.test.ts`, `buildSession.test.ts`) that assert `playNote` fires on a docked tap. |
| 2 | The keyboard is docked to the bottom of the viewport, thumb-reachable on a phone, with page content scrolling above it; a handle collapses/expands it and the collapsed state persists | VERIFIED | `KeyboardDock.svelte:97-111` fixes the dock (`position: fixed; bottom: 0`) with a `min-height: 44px` handle (`.keyboard-dock__handle`, lines 113-124) that toggles `collapsed` and calls `setDockedKeyboardCollapsed` (`dockCollapse.ts:35-42`, `localStorage` key `music-learn:docked-keyboard-collapsed`, defaults to expanded, never throws). `+layout.svelte:78-91` reserves `padding-bottom: var(--dock-height, 0px)` on the scrolling content wrapper, and `KeyboardDock.svelte:45-70` writes the live `--dock-height` custom property via a guarded `ResizeObserver`. `keyboardDock.test.ts` (6 tests) directly verifies: fixed positioning, handle label flip, DOM removal on collapse, persistence across a second mount, and absence of any sound-toggle control in the dock chrome (Scope Decision 5). `dockCollapse.test.ts` verifies the malformed/absent/unreadable-storage fallback to expanded. |
| 3 | Playing the docked keyboard for free exploration never corrupts the active drill/recall answer input on that page — exploration and answering stay distinguishable | VERIFIED | True by construction: the shared registry (`dockContext.svelte.ts:37-57`) holds exactly one `$state.raw` slot; `clear(token)` only nulls `current` when `token` matches the current owner (last-writer-wins guard), directly tested by `dockContext.svelte.test.ts` ("last-writer-wins: registering B over A then clearing A leaves B in place"). Each page/component registers exactly ONE mode-aware snippet — Drills' single `dockedKeyboard` branches on `question.kind/direction/answered/showConstructionReveal` so interactive and inspectable/reveal states are mutually exclusive on the same element (`drills/+page.svelte:673-727`); Recall's single `dockedKeyboard` branches on mode/answered/revealed (`RecallSession.svelte:560-580`) and explicitly cedes the slot to the embedded `BuildSession` for Mode C rather than competing for it (`RecallSession.svelte:223-227`, confirmed by test "on a formula-build (Mode C) card... RecallSession contributes no competing registration" and "advancing past a Mode C card... clears back to the next card's docked keyboard, with no stale registration in between"). No page renders two `PianoKeyboard`/key-strip elements simultaneously for the same fact. |

**Score:** 3/3 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/keyboard/dockCollapse.ts` | Device-local collapse persistence, defaults expanded, never throws | ✓ VERIFIED | Implements `readDockedKeyboardCollapsed`/`setDockedKeyboardCollapsed`; try/catch swallow on both read and write; `dockCollapse.test.ts` covers malformed/absent/quota-exceeded cases |
| `src/lib/keyboard/dockContext.svelte.ts` | Context registration seam, single-slot registry, token-guarded clear | ✓ VERIFIED | `createDockRegistry()`/`DOCK_CONTEXT_KEY`/`setDockRegistry`/`getDockRegistry`; `$state.raw` preserves reference identity; `dockContext.svelte.test.ts` covers register/clear/no-op/last-writer-wins/context round-trip |
| `src/lib/components/KeyboardDock.svelte` | Fixed dock chrome, handle, live height, no sound toggle | ✓ VERIFIED | Renders nothing when `registry.current` is null; fixed bottom positioning; guarded `ResizeObserver`; writes `--dock-height`; `keyboardDock.test.ts` (6 tests) passing |
| `src/routes/+layout.svelte` | Registry provision + dock mount + content clearance | ✓ VERIFIED | `createDockRegistry()`/`setDockRegistry()` called once; `<KeyboardDock/>` mounted after `{@render children()}`; `.dock-clearance` padding-bottom consumes `--dock-height` |
| Lookup (`src/routes/+page.svelte`) | Relocated inspectable keyboard, present pre-search | ✓ VERIFIED | `dockedKeyboard` snippet renders `notes={result?.notes ?? []}`; registers in `onMount`, clears in `onDestroy`; `lookupDock.test.ts` passing |
| Theory (`src/routes/theory/+page.svelte`) | New docked inspectable keyboard | ✓ VERIFIED | `dockedKeyboard` snippet added (previously no keyboard existed on this page); `theoryDock.test.ts` (5 tests) passing |
| `src/lib/components/ScaleKeyboardDrill.svelte` | Key-strip docks, register/prompt/complete stay inline | ✓ VERIFIED | `keyStrip` snippet is the only thing handed to the dock; register/prompt/complete markup rendered in the component's own output (confirmed by dedicated test asserting this split); Explore mode (`ScaleDegreeStrip`) correctly left untouched, out of scope |
| `src/routes/drills/+page.svelte` | Single mode-aware docked keyboard, short-landscape inline fallback | ✓ VERIFIED | One `dockedKeyboard` snippet covers all four former inline sites plus the identification-reveal keyboard; all four in-template call sites are gated behind `{#if isShortLandscape}`, so dock and inline paths are mutually exclusive |
| `src/lib/components/RecallSession.svelte` | Modes A/B/formula dock, Mode C ceded to BuildSession | ✓ VERIFIED | Single `dockedKeyboard` snippet; registration effect explicitly skips Mode C (`currentItem?.mode === 'formula-build'`) |
| `src/lib/components/BuildSession.svelte` | Constructable keyboard docks only when embedded | ✓ VERIFIED | `shouldDock = untrack(() => Boolean(embedFact)) && Boolean(dockRegistry)`; standalone `/build` (no `embedFact`) renders inline unchanged; completion display keyboard stays in flow |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `KeyboardDock.svelte` | `dockContext.svelte.ts` | `getDockRegistry().current` | WIRED | Reads `registry.current` reactively via `$derived` |
| `KeyboardDock.svelte` | `dockCollapse.ts` | `readDockedKeyboardCollapsed`/`setDockedKeyboardCollapsed` | WIRED | Read once at init, written on every handle toggle |
| `+layout.svelte` | `KeyboardDock.svelte` | Mounted after `children()`, registry provided via context | WIRED | Confirmed in `+layout.svelte:17-18,82` |
| Each page/component | `dockContext.svelte.ts` | `getDockRegistry().register(...)`/`.clear(token)` | WIRED | Confirmed across Lookup, Theory, ScaleKeyboardDrill, Drills, RecallSession, BuildSession |
| `PianoKeyboard`/key-strip taps | `$lib/audio/audio.ts` | `playNote(...)`, gated by `soundEnabled()` | WIRED | Inherited unchanged from pre-existing keyboard component; `soundEnabled()` gate present at every `playNote`/`playChord` call site |
| `KeyboardDock.svelte` | `+layout.svelte` content clearance | `--dock-height` custom property | WIRED | Written by KeyboardDock's `$effect`, consumed by `.dock-clearance` padding-bottom |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes (independently re-run, not trusted from SUMMARY) | `npx vitest run` | 72 files / 1006 tests passed | ✓ PASS |
| Production build succeeds | `npm run build` | Built successfully, static output written | ✓ PASS |
| Single named regression test (Mode C handoff ordering) | `npx vitest run -t "clears its registration once the session completes"` | 1 passed | ✓ PASS |
| Dock test enumeration proves coverage exists (not run wholesale per must-have) | `npx vitest list \| grep -i dock\|keyboard` | 40+ matching test names across all 5 surfaces | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| KBD-01 | 15-02, 15-03, 15-04, 15-05, 15-06, 15-07 | Every keyboard-bearing page shows a keyboard whose keys sound on tap, honoring the sound toggle | ✓ SATISFIED | See Truth 1 evidence above; all 5 surfaces confirmed wired |
| KBD-02 | 15-01, 15-02 | Docked to viewport bottom, thumb-reachable, handle collapse/expand persists | ✓ SATISFIED | See Truth 2 evidence above |
| KBD-03 | 15-05, 15-06, 15-07 | Free exploration never corrupts active answer input | ✓ SATISFIED | See Truth 3 evidence above; single-slot registry + token guard + mode-aware snippets |

No orphaned requirements found — REQUIREMENTS.md maps only KBD-01/02/03 to Phase 15, and all three appear in at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

No debt markers (TBD/FIXME/XXX/TODO/HACK) in any file touched by this phase. No em dashes in new UI copy. No stub returns or hardcoded-empty props found in the dock or page-registration code paths.

The independent code review (`15-REVIEW.md`, 2026-07-15) found 0 blockers and 3 warnings, which this verification confirms by direct reading and does not treat as phase-goal blockers per the review's own severity classification and the launching agent's guidance:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `KeyboardDock.svelte` / `dockCollapse.ts` | Collapsing the dock removes the sole answer-input surface on construction/build/scale-drill pages, and the choice persists across reload with no auto-expand/interactive-aware override | ⚠️ Warning (WR-01) | UX trap, recoverable via the always-visible labeled handle; not covered by any e2e test; does not violate the literal Success Criteria (docked keyboard exists, handle works, state persists) |
| `src/routes/theory/+page.svelte:57-61,87-89` | `hearResolution`'s `setTimeout` is not cleared in `onDestroy`; `ensureAudioReady()` called without `void`, inconsistent with every other call site | ⚠️ Warning (WR-02) | Pre-existing Theory feature unrelated to the new dock keyboard; can play a stray chord after fast navigation within 800ms |
| `BuildSession.svelte:179-196,449-490` | Possible `scrollRootIntoView` race when embedded (Mode C) — `containerEl` may not yet be bound when the post-construction `tick()` continuation fires | ⚠️ Warning (WR-03, moderate confidence) | Cosmetic (root key may not auto-scroll into view on first Mode C render); does not affect tap-to-sound or grading |

Two info-level findings (IN-01: formula-mode text-recall cards show an unrelated empty dock keyboard; IN-02: ScaleKeyboardDrill re-registers a fresh config object on every correct tap, correctness-neutral churn) were also confirmed present but are non-functional.

### Human Verification Required

None. All three phase truths were verifiable directly from code plus passing automated tests (full suite independently re-run: 1006/1006 passing; build independently re-run: success). The KBD-03 "never corrupts" invariant is enforced by a token-guarded single-slot registry with a dedicated unit test (`dockContext.svelte.test.ts`'s last-writer-wins case) plus per-surface ordering tests (e.g. RecallSession's Mode C handoff test), so it did not require routing to human verification as a behavior-dependent truth.

### Gaps Summary

No gaps. All three ROADMAP Success Criteria are met with direct code evidence, tested behavior, and independently-reproduced passing test/build runs. The three code-review warnings (WR-01/02/03) are real quality concerns worth a follow-up fix but do not block this phase's goal — the docked, always-playable, uniform-input-surface architecture is in place and functioning on all five named surfaces (Lookup, Drills, Recall, Scales Practice, Theory).

---

_Verified: 2026-07-15T22:44:35Z_
_Verifier: Claude (gsd-verifier)_
