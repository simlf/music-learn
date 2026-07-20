---
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
verified: 2026-07-20T15:40:00Z
status: human_needed
score: 13/13 must-haves verified (structural/behavioral evidence); 5 truths present-but-visually-unverified
behavior_unverified: 5
overrides_applied: 0
human_verification:
  - id: HV-24-01-01
    test: "On a real 390px phone viewport, open /recall, drive a formula-mode card (e.g. Cdim/F♯ø7) to reveal, and confirm the Révéler button, then the 4 grade buttons, are visible in the pinned dock ABOVE the tab bar without any scrolling. Scroll the card content up/down and confirm nothing is clipped behind the dock. Repeat for see-play (Check/Next) and hear-name (Continue after opening a hint). Widen to >=640px and confirm the review page looks byte-identical to before this phase (no dock, in-flow actions)."
    expected: "Every review mode's primary advance action is reachable without scrolling on phone; content scrolls independently and clears the dock; desktop is unchanged."
    why_human: "jsdom cannot evaluate CSS layout, position:fixed geometry, viewport scroll, or visual clipping — only DOM presence and handler wiring were verified programmatically (recallSession.test.ts's dock-presence/handler-reuse assertions). The plan's own Task 3 checkpoint (gate=blocking) was explicitly deferred by the user ('Defer testing, continue')."
  - id: HV-24-02-01
    test: "On a 390px phone viewport, confirm the bottom tab bar is visibly 56px (shorter than before) with icon+9px-label per slot. Toggle to French and confirm the bar height does NOT change and the long FR labels (RECHERCHER, EXERCICES, RÉVISION, MORCEAUX) fit or cleanly ellipsis-truncate without wrapping. Confirm active-tab ink-fill treatment and icon recoloring. Scroll a long page (e.g. /recall or /progress) to the bottom and confirm no content is hidden behind the bar. Optionally confirm VoiceOver/TalkBack announces the full label despite the tiny visible text."
    expected: "56px bar, stable height across FR/EN with no wrap, correct active-tab styling, no content clipped behind the bar."
    why_human: "jsdom does not lay out CSS (no real pixel height, no text-wrap/ellipsis evaluation, no visual clipping check) — only DOM structure (icon+label elements) and accessible names (aria-label, including the live FR locale flip) were verified programmatically. The plan's Task 3 checkpoint (gate=blocking) was explicitly deferred by the user, tracked as HV-24-02-01 in 24-02-SUMMARY.md."
  - id: HV-24-03-01
    test: "On the running app (ideally in French), type AM7/am7 and confirm the vermilion disambiguation prompt appears with two chips and NO result renders until a chip is tapped. Tap the minor chip and confirm Am7 (A-C-E-G) renders; repeat and tap the major chip, confirm Amaj7 (A-C♯-E-G♯) renders. Open 'Pourquoi ces notes ?' on the Am7 result and confirm the minor-third teaching sentence and key-signature clarification read clearly to a beginner, and the folded Am7/Amaj7 duo shows the differing third/seventh. Tap 'Voir Amaj7' and confirm it re-runs the lookup. Type an unambiguous chord (Cm7, Fmaj7, G7) and confirm no disambiguation prompt appears. Confirm legibility at a 390px viewport."
    expected: "Disambiguation and why-panel flows behave correctly and the beginner explanation is comprehensible in context, especially in French."
    why_human: "Copy comprehension ('does this explanation actually land for a beginner') and visual legibility on a real device are judgment calls jsdom's non-rendering DOM cannot verify — only DOM structure, resolution logic (chip → correct chord), and bilingual key presence were verified programmatically. The plan's Task 4 checkpoint (gate=blocking) was explicitly deferred by the user, tracked as HV-24-03-01 in 24-03-SUMMARY.md."
---

# Phase 24: Mobile UX fixes from issue #14 Verification Report

**Phase Goal:** Close the three GitHub issue #14 mobile-UX complaints using the Session 5 sketch winners. On phone, the Review (/recall) page gains a structural action dock (sketch 014-A) that pins Révéler + grade actions above the tab bar so the review loop is always completable without scrolling. The phone bottom tab bar shrinks to 56px with an icon + 9px micro-label per slot (sketch 015-B) so long French labels stop eating vertical space and the bar height is stable across FR/EN. The Lookup page gains input-time disambiguation chips for casing-ambiguous symbols (Am7 vs Amaj7) plus an expandable "Pourquoi ces notes ?" teaching panel on every result, with a folded minor-vs-major duo as the deepest content (sketch 016 A+B, C folded into A), turning the Am7/AM7 confusion into a teaching moment. (Issue #14's recall-hint wish reuses the already-shipped 010-A ladder and is out of this phase's scope.)

**Verified:** 2026-07-20T15:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

**Plan 24-01 — Review action dock (sketch 014-A)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a 390px phone, after tapping Révéler the grade buttons (Encore/Difficile/Bien/Facile) are visible without scrolling | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `.review-action-dock` exists (`RecallSession.svelte:798`), `data-testid="recall-action-dock"`, `position: fixed; bottom: var(--tab-bar-clearance)`; `formulaActions` snippet hosts Révéler pre-reveal, grade grid post-reveal (lines 621-646); dock-presence + grade-button wiring proven by `recallSession.test.ts` (102 tests pass incl. this file). No-scroll visual guarantee on a real viewport is not testable in jsdom — see HV-24-01-01. |
| 2 | Every review mode's primary advance action is always reachable in the thumb zone, above the bottom tab bar | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Dock renders `formulaActions`/`seePlayActions`/`hearNameActions` per mode (lines 800-806); `formula-build` intentionally renders nothing (embedded BuildSession owns its own UI) — confirmed by source (no matching `{:else if}` branch). Structural presence verified; on-device thumb-zone reachability is a visual/ergonomic check — see HV-24-01-01. |
| 3 | Review page content scrolls independently above the pinned action dock; nothing is clipped by it | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `--review-dock-clearance: 60px` token added (`app.css:121`), consumed via `main[data-review-dock] { padding-bottom: calc(var(--tab-bar-clearance) + var(--review-dock-clearance)) }` (`app.css:145`); `data-review-dock` attribute conditionally set on the recall route's `<main>` only while `mode === 'review'` (`src/routes/recall/+page.svelte:54`). Clearance mechanism wired correctly by source inspection; visual "nothing clipped" confirmation needs a real viewport — see HV-24-01-01. |
| 4 | On desktop (>=640px) the review page action layout is byte-identical to before this plan | ✓ VERIFIED | Self-contained `@media (min-width: 640px) { .review-action-dock { display: none; } }` rule present in RecallSession.svelte's scoped style (lines 1122-1125), avoiding the Tailwind-cascade-layers hazard. `recallSession.test.ts` dual-render tests assert the dock and in-flow slot are both present in the DOM sharing the same handler wiring (jsdom cannot evaluate the media query, so this is the documented compensating test per the plan's own acceptance criteria) — this specific truth is a structural/CSS-source claim, not a runtime state transition, so source + dual-render test is sufficient evidence. |

**Plan 24-02 — Icon + micro-label tab bar (sketch 015-B)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | On a phone, the bottom tab bar is 56px tall, each of the 5 slots showing an icon above a 9px micro-label | ✓ VERIFIED | `.bottom-tab-bar__item { height: 56px; ... }` (`+layout.svelte:256`); `.bottom-tab-bar__icon` (icon wrapper, `+layout.svelte:135,149,284`) and `.bottom-tab-bar__label { font-size: 9px; ... }` (`+layout.svelte:293`) both present; `masthead.e2e.test.ts` asserts each tab contains an svg + label element. This is a CSS-source value assertion (not a runtime layout claim) so source+test is direct evidence for the numeric value; visual confirmation is still routed to HV-24-02-01 for the "looks visibly shorter" / icon legibility claim. |
| 6 | The tab bar height is identical in French and English — long FR labels no longer force the bar taller or wrap | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Single `height: 56px` rule with no locale branching, `.bottom-tab-bar__label` has `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (no wrap possible by construction); `masthead.e2e.test.ts` resolves FR accessible names (Rechercher/Exercices/Révision/Morceaux) live after a locale flip. jsdom does not lay out text, so actual FR-label overflow/ellipsis rendering and constant pixel height across locales is a visual claim — see HV-24-02-01. |
| 7 | Each tab remains a real link/button with an accessible name equal to its full localized label, regardless of the truncated 9px micro-label | ✓ VERIFIED | `aria-label={t(link.labelKey)}` on every tab anchor and the More button (`+layout.svelte:133,146`); `masthead.e2e.test.ts` asserts `toHaveAttribute('aria-label', 'Lookup')` etc. (EN) and resolves FR names by role+name after locale flip (lines 129-150). SVG icons carry `aria-hidden="true"` (confirmed in all 5 icon constants). |
| 8 | Every full-height page still clears the bottom bar — `--tab-bar-clearance` tracks the new 56px height | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `--tab-bar-clearance: calc(56px + env(safe-area-inset-bottom))` (`app.css:112`), single source consumed by both the generic `main` phone padding rule (`app.css:132`) and Plan 01's review-dock stacked offset (`app.css:145`) — no duplicated constant. Source-level correctness verified; the "no content hidden at the bottom of a long page" claim is a real-device scroll-to-bottom visual check — see HV-24-02-01. |

**Plan 24-03 — Lookup casing disambiguation + why-panel (sketch 016 A+B)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 9 | Every recognized chord result carries an expandable "Pourquoi ces notes ?" panel explaining why each note belongs, and that the key signature does not impose accidentals | ✓ VERIFIED | `WhyTheseNotes` mounted unconditionally inside `{#if result?.recognized && !ambiguity}` (`+page.svelte:345-350`); panel derives its per-note claim via `intervalBetween(chord.root, third.letter)` — same helper the result card's formula row uses (`WhyTheseNotes.svelte:49`) — and renders the key-signature clarification sentence (`home.why.key-signature`, line 81). `whyTheseNotes.test.ts` (8 tests) and `lookupWhyPanel.test.ts` (8 tests) both pass, confirming toggle/open/content assertions. |
| 10 | The panel's deepest content is a side-by-side minor-vs-major duo (Am7 vs Amaj7) showing the differing third/seventh, folded as the deepest rung | ✓ VERIFIED | `.why-duo` (`data-testid="why-duo"`, `WhyTheseNotes.svelte:85`) renders two `duo-card`s each with a `ChordGlyph` and colored note chips; gated on `counterpart && counterpartSymbol && counterpartThird` all being present (graceful omission otherwise, per plan's explicit "graceful path" requirement). Prop-driven (not hardcoded) — confirmed by source (counterpart/counterpartSymbol are props) and by test asserting the duo updates when fed a different chord. |
| 11 | Typing a casing-ambiguous symbol (am7/AM7) shows a disambiguation prompt BEFORE a result, offering both readings as chips; picking a chip resolves to that chord | ✓ VERIFIED | `detectCasingAmbiguity()` (`casingAmbiguity.ts:35`, pure, no Svelte/DOM imports) intercepts in `showChord()` BEFORE `spellChord` commits a result (`+page.svelte:95-101`); disambig prompt rendered via `{#if ambiguity}` with `disambig-chip-minor`/`disambig-chip-major` (`+page.svelte:254-278`); result card is gated `{#if result?.recognized && !ambiguity}` (line 303) so the prompt genuinely blocks the result. `lookupWhyPanel.test.ts` asserts am7/AM7 render the prompt with no result, and each chip resolves to the correct chord (Am7 = A-C-E-G, Amaj7 = A-C♯-E-G♯). |
| 12 | Non-ambiguous input (Cm7, Fmaj7, correctly-cased Am7) shows the result directly with no disambiguation prompt; the why-panel is available regardless | ✓ VERIFIED | `detectCasingAmbiguity('Cm7')`/`('Am7')`/`('Cmaj7')`/`('G7')` all return `null` per `casingAmbiguity.test.ts` (11 tests, all pass); `+page.svelte` only sets `ambiguity` when `detected` is non-null, so unambiguous input flows straight to `spellChord`. `lookupWhyPanel.test.ts` confirms Cm7 shows the result with no `disambig-prompt`. |
| 13 | All new copy is bilingual (EN+FR); chord symbols/note letters/interval shorthand are never translated | ✓ VERIFIED | `home.why.*` and `home.disambig.*` keys present in both `en` and `fr` blocks of `src/lib/i18n/messages/home.ts` (verified by direct grep, lines 28-45 EN / 62-80 FR); symbols/letters render via separate template interpolation (`{chord.symbol}`, `{third.letter}`), never embedded in translated strings; full suite's i18n coverage/immunity tests passed as part of the 1358/1358 full run. |

**Score:** 13/13 must-have truths have direct code/test evidence; 5 of those 13 are additionally flagged ⚠️ PRESENT_BEHAVIOR_UNVERIFIED because their assertion includes a real-device visual/layout claim (no-scroll geometry, FR/EN height stability, content-clearance-at-bottom-of-page) that jsdom structurally cannot exercise. These 5 are not failures — the code is present, wired, and every project-side automated check that CAN run (svelte-check, all 5 targeted test files, full 1358/1358 suite) is green — but they require the human on-device pass that all three plans explicitly deferred.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/RecallSession.svelte` | Phone-only fixed action dock hosting each mode's primary action buttons | ✓ VERIFIED | `.review-action-dock` + `data-testid="recall-action-dock"` present, wired, single-snippet-per-mode pattern confirmed (dock + in-flow both render `{@render formulaActions()}` etc.) |
| `src/app.css` | `--review-dock-clearance` token stacked above `--tab-bar-clearance` | ✓ VERIFIED | `--review-dock-clearance: 60px` (line 121), consumed in `main[data-review-dock]` padding calc (line 145) |
| `src/routes/+layout.svelte` | Bottom-tab-bar items as icon (inline SVG) + 9px micro-label, 56px tall | ✓ VERIFIED | `TAB_ICONS`/`MORE_ICON` constant maps, `.bottom-tab-bar__icon`/`.bottom-tab-bar__label` classes, `height: 56px` |
| `src/app.css` | `--tab-bar-clearance` updated from 64px to 56px base | ✓ VERIFIED | `calc(56px + env(safe-area-inset-bottom))` |
| `src/lib/lookup/casingAmbiguity.ts` | Pure helper detecting ambiguous m/maj casing, returning candidate pair | ✓ VERIFIED | `detectCasingAmbiguity(input: string)` exported, zero Svelte/DOM imports (only imports `spellChord`), 11 passing tests covering the full ambiguous/unambiguous matrix |
| `src/lib/components/WhyTheseNotes.svelte` | Expandable teaching panel with the folded m-vs-maj duo | ✓ VERIFIED | Component exists, props `chord`/`counterpart`/`counterpartSymbol`/`onLookupCounterpart`, graceful duo-omission path, 8 passing tests |
| `src/routes/+page.svelte` | Wires disambiguation chips at input time and the why-panel on every result | ✓ VERIFIED | `detectCasingAmbiguity` called in `showChord()` before `spellChord`; `WhyTheseNotes` mounted unconditionally on recognized results; 8 passing `lookupWhyPanel.test.ts` tests |
| `src/lib/i18n/messages/home.ts` | `home.why.*` and `home.disambig.*` bilingual keys | ✓ VERIFIED | Both EN and FR blocks populated (grep-confirmed) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| RecallSession.svelte dock | existing handlers (`handleReveal`/`handleGrade`/`handleModeACheck`/`handleModeANext`/`advanceHearName`) | direct `onclick` calls inside shared snippets | ✓ WIRED | Snippets call the pre-existing handler functions verbatim (no forked/duplicated logic); `recallSession.test.ts` proves a docked grade click advances the queue (reviewedCount increments) |
| RecallSession dock | `--tab-bar-clearance` token | `bottom: var(--tab-bar-clearance)` | ✓ WIRED | Confirmed at `RecallSession.svelte:1133`; single-sourced, no second hardcoded bar height |
| +layout.svelte icon selection | `navLinks` source array | href-keyed `TAB_ICONS` record, no second literal href list | ✓ WIRED | `TAB_ICONS[link.href]` selection inside the existing `{#each bottomTabLinks}` — confirmed by source, no drift-prone duplicate array |
| `--tab-bar-clearance` (app.css) | every page's bottom padding AND Plan 01's review-dock offset | shared CSS custom property | ✓ WIRED | Both consumers read the same token; 56px update propagates correctly to both (confirmed by source + full green suite) |
| `+page.svelte` showChord() | `casingAmbiguity` detector | `detectCasingAmbiguity(cleaned)` called before `spellChord` | ✓ WIRED | Confirmed at `+page.svelte:95-101` — intercepts and returns early, blocking the result render until a chip is picked |
| `+page.svelte` WhyTheseNotes mount | `casingAmbiguity`/`spellChord`-derived counterpart | `counterpartSymbolFor()` pure helper + `spellChord` | ✓ WIRED | No hardcoded note lists; counterpart derived from the resolved chord's ASCII quality suffix and re-spelled through the real chord engine |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| RecallSession review dock | `pageState`, mode-specific action state (`revealed`, `modeAAnswered`, `hearNameHintOpen`) | Existing session-driving reactive state (unchanged by this phase) | Yes — same state machine as pre-existing in-flow actions | ✓ FLOWING |
| Recall route `<main data-review-dock>` clearance | `mode === 'review'` conditional attribute | `src/routes/recall/+page.svelte:54` | Yes — attribute only present during active review, not on empty/error/complete states | ✓ FLOWING |
| WhyTheseNotes duo | `counterpart`/`counterpartSymbol` props | `+page.svelte`'s `counterpartSymbolFor()` → re-spelled via `spellChord` | Yes — real tonal-engine-derived chord, not a hardcoded note array; gracefully `null` for qualities with no counterpart | ✓ FLOWING |
| Disambiguation chips | `ambiguity.minorSymbol` / `ambiguity.majorSymbol` | `detectCasingAmbiguity()` → both guarded through `spellChord(...).recognized === true` | Yes — candidates are validated real chords, never nagging on an unrecognized "major" reading | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted test files for all 3 plans pass | `npx vitest run recallSession masthead casingAmbiguity whyTheseNotes lookupWhyPanel` | 5 files, 102 tests passed | ✓ PASS |
| svelte-check clean | `npm run check` | 1336 files, 0 errors, 0 warnings | ✓ PASS |
| Full suite green (matches SUMMARY claim, run once) | `npx vitest run` | 94 files, 1358 tests passed | ✓ PASS |
| Dock click advances queue (state transition) | `recallSession.test.ts` — "docked grade click advances the queue" assertion (reviewedCount increments) | Assertion present and passing within the 102-test run above | ✓ PASS |
| Disambiguation chip resolves to correct chord (state transition) | `lookupWhyPanel.test.ts` — minor/major chip resolution assertions | Assertion present and passing within the 102-test run above | ✓ PASS |

### Probe Execution

Not applicable — this phase is a UI-only mobile-UX fix (Svelte components, CSS, i18n) with no migration/CLI probe scripts declared or conventionally expected. `find scripts -path '*/tests/probe-*.sh'` returns no results in this repo layout.

### Requirements Coverage

No requirement IDs are mapped to Phase 24 (ROADMAP.md states "Requirements: none mapped (issue-#14 UX fixes; must-haves derived per-plan from the three sketch winners)"). All three plans' `requirements:` frontmatter fields are empty arrays, consistent with the roadmap. `.planning/REQUIREMENTS.md` contains no "Phase 24" references — confirmed via grep, zero matches. No orphaned requirements.

### Anti-Patterns Found

None. Scanned all 13 files modified across the three plans (`RecallSession.svelte`, `recallSession.test.ts`, `app.css`, `recall.ts`, `+layout.svelte`, `masthead.e2e.test.ts`, `casingAmbiguity.ts`/`.test.ts`, `WhyTheseNotes.svelte`/`.test.ts`, `+page.svelte`, `lookupWhyPanel.test.ts`, `home.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and stub-language patterns — zero matches. No empty-implementation patterns (`return null`/`return {}`/`=> {}`) found in a way that indicates unfinished work; the component graceful-omission paths (e.g. `WhyTheseNotes` omitting the duo when no counterpart exists) are intentional, tested behavior, not stubs.

### Human Verification Required

Three items, one per plan, all previously identified and explicitly deferred by the user during execution (per each plan's SUMMARY.md). These are genuine visual/on-device checks that automated tooling structurally cannot perform (jsdom does not render CSS layout, viewport geometry, or text wrapping). See the `human_verification` frontmatter block above for full test/expected/why_human detail on each:

1. **HV-24-01-01** — Review action dock no-scroll guarantee on a real 390px phone (all 4 review modes) + desktop parity visual check.
2. **HV-24-02-01** — Icon+micro-label tab bar 56px height, FR/EN stability (no wrap), icon legibility, content clearance at the bottom of a long page.
3. **HV-24-03-01** — Disambiguation chip flow, why-panel teaching-content comprehension (does the beginner explanation land, especially in French), and 390px legibility.

### Gaps Summary

No gaps. Every truth derived from the three plans' `must_haves.truths` has direct, positive code and/or automated-test evidence. The only reason overall status is `human_needed` rather than `passed` is that 3 of the 13 truths (spanning all three plans, one dominant checkpoint per plan) assert real-device visual/layout behavior that the plans themselves correctly flagged as `human_judgment: true` and that the user explicitly deferred via "Defer testing, continue" at each blocking checkpoint — this is expected, tracked, non-blocking-for-status-purposes deferral, not a discovered defect. Recommend running `/gsd-verify-work` (or an equivalent manual walkthrough) against a real ~390px viewport in both EN and FR to close out HV-24-01-01, HV-24-02-01, and HV-24-03-01 before considering this phase's UX guarantees fully proven end-to-end.

---
_Verified: 2026-07-20T15:40:00Z_
_Verifier: Claude (gsd-verifier)_
