---
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
verified: 2026-07-20T17:45:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 13/13 must-haves verified (structural/behavioral evidence); 5 truths present-but-visually-unverified
  gaps_closed:
    - "HV-24-01-01 — Review action dock no-scroll guarantee on a real 390px phone (all 4 review modes) + desktop parity — confirmed pass via 24-UAT.md Test 1"
    - "HV-24-02-01 — Icon+micro-label tab bar 56px height, FR/EN stability, content clearance — confirmed pass via 24-UAT.md Test 2"
    - "HV-24-03-01 (original) — Disambiguation chip flow + why-panel comprehension — confirmed pass via 24-UAT.md Test 3, initially flagged cosmetic issue (escape-hatch button flush against tab bar), closed by plan 24-04"
    - "Cosmetic gap: why-panel escape-hatch button had no breathing room above the fixed tab bar — closed by 24-04 (--tab-bar-clearance now includes var(--spacing-md)); human-verified at 390px"
    - "Deviation discovered during 24-04's own checkpoint: review-dock's static 60px clearance clipped reveal content in the taller post-reveal grade-grid state — fixed via live ResizeObserver measurement in RecallSession.svelte; human re-verified at 390px"
  gaps_remaining: []
  regressions: []
---

# Phase 24: Mobile UX fixes from issue #14 Verification Report

**Phase Goal:** Close the three GitHub issue #14 mobile-UX complaints using the Session 5 sketch winners. On phone, the Review (/recall) page gains a structural action dock (sketch 014-A) that pins Révéler + grade actions above the tab bar so the review loop is always completable without scrolling. The phone bottom tab bar shrinks to 56px with an icon + 9px micro-label per slot (sketch 015-B) so long French labels stop eating vertical space and the bar height is stable across FR/EN. The Lookup page gains input-time disambiguation chips for casing-ambiguous symbols (Am7 vs Amaj7) plus an expandable "Pourquoi ces notes ?" teaching panel on every result, with a folded minor-vs-major duo as the deepest content (sketch 016 A+B, C folded into A). (Issue #14's recall-hint wish reuses the already-shipped 010-A ladder and is out of this phase's scope.)

**Verified:** 2026-07-20T17:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 24-04) and completed human UAT

## Goal Achievement

This is a re-verification pass. The previous verification (2026-07-20T15:40:00Z) found all 13 must-have truths had direct code/test evidence, but 5 of those truths asserted real-device visual/layout behavior that jsdom cannot exercise, and were routed to human verification (`human_needed`). Since then:

1. **24-UAT.md was completed** — all 3 human-verification items (HV-24-01-01, HV-24-02-01, HV-24-03-01) were manually tested at a 390px viewport. 2 passed outright; 1 (HV-24-03-01 / Test 3) surfaced a genuine cosmetic gap (why-panel escape-hatch button flush against the tab bar, zero breathing room).
2. **Plan 24-04 (gap_closure: true) closed that gap** — added `var(--spacing-md)` (16px) breathing room to the shared `--tab-bar-clearance` token. During its own checkpoint, a related deviation was discovered (the review-action-dock's static 60px clearance didn't account for the taller post-reveal grade-grid state, clipping reveal content) and fixed via live `ResizeObserver` measurement.
3. **Both fixes were human-verified at 390px** across two checkpoint rounds (round 1 surfaced the deviation, round 2 approved after the fix).
4. **24-UAT.md has been updated** in this verification pass to reflect all 3 tests as `pass` (Test 3's frontmatter `result` updated from `issue` to `pass` with a resolution note; overall UAT status flipped to `resolved`).

All 13 must-have truths — including the 5 previously flagged `PRESENT_BEHAVIOR_UNVERIFIED` — now have both automated (code/test) evidence AND completed human visual/behavioral confirmation. No must-have remains unverified.

### Observable Truths

**Plan 24-01 — Review action dock (sketch 014-A)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a 390px phone, after tapping Révéler the grade buttons (Encore/Difficile/Bien/Facile) are visible without scrolling | ✓ VERIFIED | `.review-action-dock` exists (`RecallSession.svelte:834`), `data-testid="recall-action-dock"`, `position: fixed; bottom: var(--tab-bar-clearance)`; `recallSession.test.ts` (61/61 pass, re-run this pass) proves dock presence + handler wiring. Human-verified pass at 390px: 24-UAT.md Test 1 = pass. The review-dock-clearance sizing bug found during 24-04 (static 60px too short for the 2x2 grade grid, clipping reveal content) is now fixed via live `ResizeObserver` measurement (`dockEl.closest('main[data-review-dock]')`, `RecallSession.svelte:146-159`), human re-verified. |
| 2 | Every review mode's primary advance action is always reachable in the thumb zone, above the bottom tab bar | ✓ VERIFIED | Dock renders `formulaActions`/`seePlayActions`/`hearNameActions` per mode; `formula-build` intentionally renders nothing (embedded BuildSession owns its own UI). Human-verified: 24-UAT.md Test 1 = pass (all 4 modes checked). |
| 3 | Review page content scrolls independently above the pinned action dock; nothing is clipped by it | ✓ VERIFIED | `--review-dock-clearance` token (`app.css:133`, static 60px fallback) now overridden live by `RecallSession.svelte`'s measured dock height when `ResizeObserver` is available, closing the exact clipping bug discovered during 24-04's checkpoint. `main[data-review-dock] { padding-bottom: calc(var(--tab-bar-clearance) + var(--review-dock-clearance)) }` (`app.css:157`). Human re-verified at 390px: grade-grid no longer clips reveal content (24-04-SUMMARY.md Checkpoint History, Round 2 approved). |
| 4 | On desktop (>=640px) the review page action layout is byte-identical to before this plan | ✓ VERIFIED | `@media (min-width: 640px) { .review-action-dock { display: none; } }` confirmed present (`RecallSession.svelte:1158-1162`), self-contained (not relying on Tailwind `sm:` utility). `recallSession.test.ts` dual-render tests pass. Human-verified: 24-UAT.md Test 1 explicitly checked desktop parity = pass. |

**Plan 24-02 — Icon + micro-label tab bar (sketch 015-B)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | On a phone, the bottom tab bar is 56px tall, each of the 5 slots showing an icon above a 9px micro-label | ✓ VERIFIED | `.bottom-tab-bar__item { height: 56px; ... }`, `.bottom-tab-bar__label { font-size: 9px; ... }` confirmed in `+layout.svelte`. `masthead.e2e.test.ts` asserts icon+label structure. Human-verified: 24-UAT.md Test 2 = pass ("56px, shorter than before, icon+9px label per slot"). |
| 6 | The tab bar height is identical in French and English — long FR labels no longer force the bar taller or wrap | ✓ VERIFIED | Single `height: 56px` rule, no locale branching; `.bottom-tab-bar__label` has `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Human-verified: 24-UAT.md Test 2 explicitly checked FR label fit/ellipsis and constant height = pass. |
| 7 | Each tab remains a real link/button with an accessible name equal to its full localized label, regardless of the truncated 9px micro-label | ✓ VERIFIED | `aria-label={t(link.labelKey)}` on every tab anchor; `masthead.e2e.test.ts` asserts correct EN/FR accessible names. |
| 8 | Every full-height page still clears the bottom bar — `--tab-bar-clearance` tracks the new 56px height | ✓ VERIFIED | `--tab-bar-clearance: calc(56px + env(safe-area-inset-bottom) + var(--spacing-md))` (`app.css:115`), single source consumed by the generic `main` phone padding rule and Plan 01's review-dock stacked offset. Human-verified: 24-UAT.md Test 2 checked no content hidden at bottom of long pages = pass; Test 3's fix (24-04) further confirmed breathing room (not just bare clearance) at the bottom of the lookup page. |

**Plan 24-03 — Lookup casing disambiguation + why-panel (sketch 016 A+B)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 9 | Every recognized chord result carries an expandable "Pourquoi ces notes ?" panel explaining why each note belongs, and that the key signature does not impose accidentals | ✓ VERIFIED | `WhyTheseNotes` mounted unconditionally inside `{#if result?.recognized && !ambiguity}`; renders `home.why.key-signature` clarification. `whyTheseNotes.test.ts` (8 tests) + `lookupWhyPanel.test.ts` (8 tests) pass. Human-verified: 24-UAT.md Test 3 = pass, explicitly checked the minor-third teaching sentence and key-signature clarification legibility in French. |
| 10 | The panel's deepest content is a side-by-side minor-vs-major duo (Am7 vs Amaj7) showing the differing third/seventh, folded as the deepest rung | ✓ VERIFIED | `.why-duo` (`data-testid="why-duo"`) renders two `duo-card`s gated on `counterpart && counterpartSymbol && counterpartThird`. Human-verified: 24-UAT.md Test 3 = pass, explicitly checked the folded Am7/Amaj7 duo shows differing third/seventh. |
| 11 | Typing a casing-ambiguous symbol (am7/AM7) shows a disambiguation prompt BEFORE a result, offering both readings as chips; picking a chip resolves to that chord | ✓ VERIFIED | `detectCasingAmbiguity()` intercepts in `showChord()` before `spellChord` commits a result; result card gated `{#if result?.recognized && !ambiguity}`. `lookupWhyPanel.test.ts` asserts am7/AM7 render the prompt with no result and each chip resolves correctly. Human-verified: 24-UAT.md Test 3 = pass, explicitly confirmed both chip resolutions (Am7 = A-C-E-G, Amaj7 = A-C♯-E-G♯) and the "no result until a chip is tapped" behavior. |
| 12 | Non-ambiguous input (Cm7, Fmaj7, correctly-cased Am7) shows the result directly with no disambiguation prompt; the why-panel is available regardless | ✓ VERIFIED | `casingAmbiguity.test.ts` (11 tests) confirms unambiguous inputs return `null`; `lookupWhyPanel.test.ts` confirms Cm7 shows result with no prompt. Human-verified: 24-UAT.md Test 3 = pass, explicitly confirmed unambiguous chords render directly with no prompt. |
| 13 | All new copy is bilingual (EN+FR); chord symbols/note letters/interval shorthand are never translated | ✓ VERIFIED | `home.why.*` and `home.disambig.*` keys present in both `en`/`fr` blocks of `home.ts` (grep-confirmed). Human-verified: 24-UAT.md Test 3 = pass, explicitly checked French comprehensibility. |

**Score:** 13/13 truths verified — full automated (code/test) evidence AND completed human on-device confirmation for every truth. No truth remains in a present-but-behavior-unverified state.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/RecallSession.svelte` | Phone-only fixed action dock hosting each mode's primary action buttons | ✓ VERIFIED | `.review-action-dock` + `data-testid="recall-action-dock"` present, wired, single-snippet-per-mode pattern confirmed. Additionally now self-measures its own height (`dockEl` + guarded `ResizeObserver`, lines 146-159) per 24-04's fix. |
| `src/app.css` | `--review-dock-clearance` token stacked above `--tab-bar-clearance` | ✓ VERIFIED | `--review-dock-clearance: 60px` (line 133, static fallback), consumed in `main[data-review-dock]` padding calc (line 157); live-overridden by RecallSession.svelte when ResizeObserver available. |
| `src/routes/+layout.svelte` | Bottom-tab-bar items as icon (inline SVG) + 9px micro-label, 56px tall | ✓ VERIFIED | `TAB_ICONS`/`MORE_ICON` constant maps, `.bottom-tab-bar__icon`/`.bottom-tab-bar__label` classes, `height: 56px`. |
| `src/app.css` | `--tab-bar-clearance` updated from 64px to 56px base, plus breathing room | ✓ VERIFIED | `calc(56px + env(safe-area-inset-bottom) + var(--spacing-md))` (line 115) — the `var(--spacing-md)` addend is the 24-04 gap-closure fix. |
| `src/lib/lookup/casingAmbiguity.ts` | Pure helper detecting ambiguous m/maj casing, returning candidate pair | ✓ VERIFIED | `detectCasingAmbiguity(input: string)` exported, zero Svelte/DOM imports, 11 passing tests. |
| `src/lib/components/WhyTheseNotes.svelte` | Expandable teaching panel with the folded m-vs-maj duo | ✓ VERIFIED | Component exists, props `chord`/`counterpart`/`counterpartSymbol`/`onLookupCounterpart`, graceful duo-omission path, 8 passing tests. |
| `src/routes/+page.svelte` | Wires disambiguation chips at input time and the why-panel on every result | ✓ VERIFIED | `detectCasingAmbiguity` called in `showChord()` before `spellChord`; `WhyTheseNotes` mounted unconditionally on recognized results. |
| `src/lib/i18n/messages/home.ts` | `home.why.*` and `home.disambig.*` bilingual keys | ✓ VERIFIED | Both EN and FR blocks populated (grep-confirmed). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| RecallSession.svelte dock | existing handlers (`handleReveal`/`handleGrade`/`handleModeACheck`/`handleModeANext`/`advanceHearName`) | direct `onclick` calls inside shared snippets | ✓ WIRED | Snippets call the pre-existing handler functions verbatim; `recallSession.test.ts` proves a docked grade click advances the queue. |
| RecallSession dock | `--tab-bar-clearance` token | `bottom: var(--tab-bar-clearance)` | ✓ WIRED | Single-sourced, no second hardcoded bar height. |
| RecallSession dock measured height | `--review-dock-clearance` (ancestor override) | `dockEl.closest('main[data-review-dock]').style.setProperty(...)` | ✓ WIRED | Confirmed at `RecallSession.svelte:146-159`; guarded for `ResizeObserver` absence, falling back to the static 60px token. |
| +layout.svelte icon selection | `navLinks` source array | href-keyed `TAB_ICONS` record | ✓ WIRED | `TAB_ICONS[link.href]` selection inside the existing `{#each bottomTabLinks}`, no drift-prone duplicate array. |
| `--tab-bar-clearance` (app.css) | every page's bottom padding AND Plan 01's review-dock offset | shared CSS custom property | ✓ WIRED | Both consumers read the same token; the 24-04 breathing-room addend propagates to both. |
| `+page.svelte` showChord() | `casingAmbiguity` detector | `detectCasingAmbiguity(cleaned)` called before `spellChord` | ✓ WIRED | Intercepts and returns early, blocking the result render until a chip is picked. |
| `+page.svelte` WhyTheseNotes mount | `casingAmbiguity`/`spellChord`-derived counterpart | `counterpartSymbolFor()` pure helper + `spellChord` | ✓ WIRED | No hardcoded note lists; counterpart derived from the resolved chord's ASCII quality suffix and re-spelled through the real chord engine. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| RecallSession review dock | `pageState`, mode-specific action state (`revealed`, `modeAAnswered`, `hearNameHintOpen`) | Existing session-driving reactive state | Yes — same state machine as pre-existing in-flow actions | ✓ FLOWING |
| RecallSession dock height override | Live `ResizeObserver`-measured pixel height | `dockEl` bound element, observed and written to ancestor `main[data-review-dock]` | Yes — real DOM measurement, not a hardcoded estimate | ✓ FLOWING |
| Recall route `<main data-review-dock>` clearance | `mode === 'review'` conditional attribute | `src/routes/recall/+page.svelte:54` | Yes — attribute only present during active review | ✓ FLOWING |
| WhyTheseNotes duo | `counterpart`/`counterpartSymbol` props | `+page.svelte`'s `counterpartSymbolFor()` → re-spelled via `spellChord` | Yes — real tonal-engine-derived chord | ✓ FLOWING |
| Disambiguation chips | `ambiguity.minorSymbol` / `ambiguity.majorSymbol` | `detectCasingAmbiguity()` → both guarded through `spellChord(...).recognized === true` | Yes — candidates are validated real chords | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Review dock tests pass (re-run this verification pass) | `npx vitest run src/lib/components/recallSession.test.ts` | 1 file, 61 tests passed | ✓ PASS |
| svelte-check clean (re-run this verification pass) | `npm run check` | 1336 files, 0 errors, 0 warnings | ✓ PASS |
| Full suite green (re-run this verification pass) | `npx vitest run` | 94 files, 1358 tests passed | ✓ PASS |
| `--tab-bar-clearance` includes breathing-room addend | `grep -F -- '--tab-bar-clearance: calc(56px + env(safe-area-inset-bottom) + var(--spacing-md))' src/app.css` | Match found (line 115) | ✓ PASS |
| Review-dock live measurement wired | `grep -n "dockEl\|ResizeObserver\|closest(" src/lib/components/RecallSession.svelte` | `dockEl` state, guarded `ResizeObserver` effect, `closest('main[data-review-dock]')` all present | ✓ PASS |
| Working tree clean, all phase commits present | `git status --short` / `git log --oneline` | Clean tree; commits `7b0b06f`, `723565c`, `e221e3a`, `d3f90df`, `e7ea11f` present in history | ✓ PASS |

### Probe Execution

Not applicable — this phase is a UI-only mobile-UX fix (Svelte components, CSS, i18n) with no migration/CLI probe scripts declared or conventionally expected. `find scripts -path '*/tests/probe-*.sh'` returns no results in this repo layout.

### Requirements Coverage

No requirement IDs are mapped to Phase 24 (ROADMAP.md states "Requirements: none mapped (issue-#14 UX fixes; must-haves derived per-plan from the three sketch winners)"). All four plans' `requirements:` frontmatter fields are empty arrays except plan 24-04, which declares `requirements: [HV-24-03-01]` — this is a UAT-tracking ID (from the human-verification item the previous verification pass emitted), not a `.planning/REQUIREMENTS.md` entry; `.planning/REQUIREMENTS.md` contains no "Phase 24" references (confirmed via grep, zero matches). No orphaned requirements.

### Anti-Patterns Found

None. Re-scanned all files modified across the four plans (`RecallSession.svelte`, `recallSession.test.ts`, `app.css`, `recall.ts`, `+layout.svelte`, `masthead.e2e.test.ts`, `casingAmbiguity.ts`/`.test.ts`, `WhyTheseNotes.svelte`/`.test.ts`, `+page.svelte`, `lookupWhyPanel.test.ts`, `home.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and stub-language patterns — zero matches, including in the two files touched by plan 24-04 (`app.css`, `RecallSession.svelte`). No empty-implementation patterns found. The graceful-omission paths (e.g. `WhyTheseNotes` omitting the duo when no counterpart exists) remain intentional, tested behavior.

### Human Verification Required

None outstanding. All three previously-open human-verification items are now closed:

1. **HV-24-01-01** (review dock no-scroll guarantee, all 4 modes, desktop parity) — 24-UAT.md Test 1 = pass.
2. **HV-24-02-01** (56px tab bar, FR/EN height stability, content clearance) — 24-UAT.md Test 2 = pass.
3. **HV-24-03-01** (disambiguation + why-panel comprehension) — 24-UAT.md Test 3 = pass, after the cosmetic breathing-room gap it originally surfaced was closed by plan 24-04 and re-verified by the user at 390px (two checkpoint rounds, round 2 approved).

### Gaps Summary

No gaps. All 13 must-have truths verified with both automated evidence and completed human on-device confirmation. The single cosmetic gap surfaced during UAT (why-panel escape-hatch button flush against the tab bar) was root-caused, fixed in plan 24-04 (`--tab-bar-clearance` gains `var(--spacing-md)` breathing room), and human-verified resolved. A related deviation discovered during that same checkpoint (review-dock's static clearance clipping reveal content in the taller grade-grid state) was also fixed and human-verified in the same plan. Working tree is clean, all commits are present in history, svelte-check is clean (1336 files, 0 errors/warnings), and the full test suite is green (1358/1358). Phase goal achieved; ready to proceed.

---
_Verified: 2026-07-20T17:45:00Z_
_Verifier: Claude (gsd-verifier)_
