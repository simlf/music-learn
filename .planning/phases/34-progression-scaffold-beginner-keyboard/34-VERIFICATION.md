---
phase: 34-progression-scaffold-beginner-keyboard
verified: 2026-07-27T02:00:00Z
status: passed
score: 4/4 must-haves verified (roadmap success criteria); all plan-level truths verified in code+tests
behavior_unverified: 0
overrides_applied: 1
human_verification:
  - test: "Open the progression drill (/practice or embedded progression session) on a beginner-stage bar (a fresh card, before any Review-state grading). Look at the play-step keyboard."
    expected: "The keyboard visually renders as a single, narrow one-octave span (8 white keys), not the full two-octave keyboard, and the caption 'Keyboard reduced to one octave (beginner level).' / 'Clavier réduit à une octave (niveau débutant).' appears beneath it in the correct locale."
    why_human: "The preview/browser harness in this project cannot hydrate the SvelteKit app (project memory: preview-harness-null-origin-sveltekit), so exact visual width/proportions and caption placement can only be confirmed on-device, even though the octaves prop, the DOM assertion ('Piano keyboard, one octave' accessible name), and the caption's gating are all proven by passing unit tests."
  - test: "On that same beginner-stage bar's play step, tap 'Show a hint' / 'Afficher un indice' three times and read each rung's rendered text and the CountingChipRow chip visuals."
    expected: "Rung 1 shows a sentence naming the roman numeral, ordinal degree, key, mode, and root note (no chord symbol). Rung 2 shows a sentence plus the role-tinted CountingChipRow tone/gap chips, legible and correctly colored. Rung 3 shows a ghost instructional line, and the on-screen keyboard now displays dashed/hatched ghost markers (R/3/5/7) at the chord tones, visually distinct from playable keys. A final tap replaces the control with an italic closing line."
    why_human: "The reveal sequence, rung content, symbol-hidden invariant, and ghost-key DOM presence (.piano-keyboard__key--ghost) are all proven by passing unit tests, but the exact visual appearance of the chip row coloring and the ghost-key hatch/dash rendering (CSS-only, canvas-adjacent visual polish) requires eyes-on confirmation per this project's standing preview-harness limitation."
  - test: "Progress the same chord's FSRS card to State.Review (e.g. via repeated correct drilling) and revisit its play step."
    expected: "The keyboard visually widens to the full two-octave span, the beginner caption disappears, and no hint ladder is rendered at all."
    why_human: "Same preview-harness limitation; the stage-driven octave count and ladder suppression are proven in code/tests (State.Review -> 'Piano keyboard, two octaves', no progression-hint-ladder testid) but the visual transition itself is an on-device check."
---

# Phase 34: Progression Scaffold & Beginner Keyboard Verification Report

**Phase Goal:** A beginner can climb an escalating optional counting-hint ladder on the earn-the-symbol progression drill without the symbol being given away, and drill on a one-octave keyboard that widens as level rises.
**Verified:** 2026-07-27T02:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria — SC1-SC4)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On the earn-the-symbol progression drill, the user can reveal an escalating, optional hint ladder rung by rung (degree → root note → semitone-count chips → ghost keys). | VERIFIED | `ProgressionDrill.svelte:236-247` (`hintDepth`/`revealHint`, capped at `offeredRungs.length`); markup at lines 447-486 renders `offeredRungs.slice(0, hintDepth)` cumulatively. Test `progressionDrill.test.ts:247` ("reveals degree -> count -> ghost one rung at a time...") passes, asserting exactly 1/2/3 layers appear in order across 3 clicks, then the closing note replaces the control. |
| 2 | The chord symbol stays hidden while the ladder is used — earn-the-symbol payoff preserved. | VERIFIED | No `ChordGlyph` or `currentBar.symbol` string is interpolated inside the ladder markup (lines 447-486) — only `currentBar.roman`, `ordinalWord(...)`, `progression.key`, `hintModeWord`, `currentChord.root`, `qualityWord(...)`, and `CountingChipRow`. Dedicated test `progressionDrill.test.ts:279` ("never renders the current bar's chord symbol inside the ladder at any depth") asserts `ladder.textContent` does not contain `'Dm7'` after all 3 rungs are revealed. Passes. |
| 3 | The hint ladder fades as the FSRS card matures (fewer rungs offered as mastery rises). | VERIFIED | `offeredRungs` ($derived.by, lines 230-234): `meet` → `[degree, count, ghost]`, `subtract` → `[count, ghost]`, `drill` (Review) → `[]` (no ladder rendered, gated at line 447 `offeredRungs.length > 0`). Tests `progressionDrill.test.ts:295` (subtract stage → exactly 2 rungs, tags renumbered from 1) and `:320` (drill/Review stage → no `progression-hint-ladder` at all) both pass. |
| 4 | At beginner level the progression keyboard shows only the tonic's one octave, widening to the full span as the level rises. | VERIFIED | `ProgressionDrill.svelte:436`: `octaves={stage === 'drill' ? 2 : 1}` passed explicitly to `PianoKeyboard` (bypasses its width self-measurement per `PianoKeyboard.svelte:243` `if (octaves !== undefined) return;`). Tests assert the accessible name `'Piano keyboard, one octave'` for empty-deck/Learning-state cards and `'Piano keyboard, two octaves'` for a Review-state card (`progressionDrill.test.ts:210-243`). All pass. |

**Score:** 4/4 roadmap success criteria verified in code and unit tests.

### Plan-Level Must-Haves (34-01, 34-02 frontmatter)

| Must-have | Status | Evidence |
|-----------|--------|----------|
| Beginner caption appears at 1-octave span, absent at 2-octave span | VERIFIED | Caption gated on `step === 'play' && cardsLoaded && stage !== 'drill'` (line 399); tests assert presence/absence per stage. |
| Octave span holds regardless of viewport width (explicit prop, never self-measured) | VERIFIED (code inspection) | `octaves` is always a concrete `1 | 2` value from the play-step call site (line 436); `PianoKeyboard`'s own width-based `octavesForWidth` effect short-circuits whenever `octaves !== undefined` (`PianoKeyboard.svelte:243`). No viewport-dependent branch remains in `ProgressionDrill`. |
| Maturity read self-contained, staleness-guarded, read-only (no deck writes) | VERIFIED (code inspection + precedent) | `loadCards` (lines 119-135) only calls `getAllCards`; the staleness guard re-checks `currentBar?.symbol` both after the await and in the `finally`; wrapped in try/catch (fixed post-review as WR-03, commit `e5aa428`) so a rejected Dexie read fails closed to `cards = []` rather than an unhandled rejection. No `recordGrade`/`advanceQueue`/deck-write call is present anywhere in the file (grep-confirmed). Code review (34-REVIEW.md) flagged one non-blocking Info item (IN-01: `octaves` reads `stage` from possibly-stale `cards` during an in-flight bar-to-bar reload, since `cards` isn't cleared when `cardsLoaded` flips false) — disposed as defensive-only/masked-in-practice by the reviewer, not a functional regression, and not required by any must-have or success criterion. |
| Earn-the-symbol grading / roman display / function reveal / completion / embed seam unchanged (REG-01) | VERIFIED | All pre-existing `progressionDrill.test.ts`, `ProgressionDrill.embed.test.ts`, and `tests/practice-hub-mix.e2e.test.ts` cases pass unchanged (re-run independently, see Behavioral Spot-Checks). `checkPlay` (lines 311-337), roman display (line 384), function reveal (lines 405-409), completion card (lines 490-504), and the embed `onComplete` seam (lines 494-497) are byte-identical to pre-phase behavior per diff inspection — only additive `octaves`/`ghostKeys` props and the new ladder block were introduced. |
| Single reveal control; cumulative reveal; tier tags renumbered from offered rungs | VERIFIED | `hintTierLabel` (lines 255-258) indexes `offeredRungs`, not a fixed ordinal; test at `:295` explicitly asserts renumbering ("tags renumbered from 1") for the 2-rung subtract case. |
| Rung set richest-last: degree → count → ghost | VERIFIED | `offeredRungs` array order is always `[degree, count, ghost]` for `meet`, `[count, ghost]` for `subtract` — ghost is always last/deepest. |
| Reset on cursor advance, preserved across a wrong Check in the same bar | VERIFIED | `$effect` on `cursor` resets `hintDepth = 0` (lines 239-242); `checkPlay`'s wrong-play branch (`playRetry = true; return;`, line 320-323) never touches `hintDepth`. Tests `:331` (cursor-advance reset) and `:350` (wrong-Check preservation) both pass. |
| Ghost keys populate only after ghost rung revealed | VERIFIED | `ghostHintRevealed` derived (line 272) gates the `ghostKeys` prop (line 437: `ghostHintRevealed ? ghostKeysForCurrentBar : []`). Test `:367` asserts zero `.piano-keyboard__key--ghost` elements through the degree and count reveals, then a nonzero count only after the ghost reveal. |
| CountingChipRow reused verbatim as count rung (no re-authored chip markup) | VERIFIED | Imported at line 23, rendered at line 467 as `<CountingChipRow chord={currentChord} />` — the only chip-rendering call site in the file. |
| Symbol-immune i18n (no chord/roman/note letter through `t()`) | VERIFIED | `progressions.keyboard.beginnerCaption` and all `progressions.hint.*` keys (en/fr) inspected directly — all are static sentence fragments/labels; dynamic values (roman, root, ordinal, quality word) are interleaved in markup as separate expressions, never passed as `t()` arguments. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/ProgressionDrill.svelte` | Maturity read, octave prop, beginner caption, inline hint ladder, ghost keys | VERIFIED | All present, substantive (not stubs), and wired — confirmed by direct read of the full file. |
| `src/lib/i18n/messages/progressions.ts` | `progressions.keyboard.beginnerCaption` + `progressions.hint.*` in en/fr | VERIFIED | All keys present in both locales with parity; `messages.test.ts` parity gate passes. |
| `src/lib/components/progressionDrill.test.ts` | Deck mock + SCAF-02/SCAF-01 describe blocks | VERIFIED | Deck mock (`vi.mock('$lib/srs/deck', ...)`) present; both describe blocks present with the full set of cases claimed in both SUMMARYs. |
| `src/lib/components/ProgressionDrill.embed.test.ts` | Deck mock added (no new SCAF cases required by plan) | VERIFIED | File passes with deck mock in place (confirmed via test run). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `ProgressionDrill.svelte` | `$lib/practice/shellVoicing` `voicingStageForChord` | Import + `$derived.by` call on `cards` | WIRED | Imported line 18, called line 144; no parallel maturity function defined (grep-confirmed no second stage-computation function). |
| `ProgressionDrill.svelte` play-step | `PianoKeyboard`'s `octaves` prop | Explicit prop `stage === 'drill' ? 2 : 1` | WIRED | Line 436; `PianoKeyboard` accepts `octaves?: 1 \| 2` (PianoKeyboard.svelte:88) and short-circuits self-measurement when defined (line 243). |
| `ProgressionDrill.svelte` | `CountingChipRow` | Direct import + render fed `currentChord` (`spellChord(currentBar.symbol)`) | WIRED | Import line 23, render line 467. |
| `ProgressionDrill.svelte` play-step | `PianoKeyboard`'s `ghostKeys` prop | Gated on `ghostHintRevealed` | WIRED | Line 437; `PianoKeyboard` consumes `ghostKeys` to render `.piano-keyboard__key--ghost` (PianoKeyboard.svelte:183,619-639). |
| Test files | `$lib/srs/deck` `getAllCards` | `vi.mock` with `importOriginal` passthrough | WIRED | Confirmed in `progressionDrill.test.ts:35-41`; default empty-array resolution in `beforeEach` (line 100). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|-------------|--------|----------|
| SCAF-01 | 34-02 | Escalating optional counting-hint ladder, symbol never given away, fades with maturity | SATISFIED | See Observable Truths #1-#3 and plan must-haves table above. |
| SCAF-02 | 34-01 | Beginner-level keyboard reduced to one octave, widens with level | SATISFIED | See Observable Truth #4. |

No orphaned requirements: `.planning/REQUIREMENTS.md` maps only SCAF-01 and SCAF-02 to Phase 34, and both appear in the plans' `requirements:` frontmatter (34-01: `[SCAF-02]`, 34-02: `[SCAF-01]`).

### Anti-Patterns Found

None. Scanned `ProgressionDrill.svelte`, `progressions.ts` (i18n messages), and both test files for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented"/"coming soon" — zero matches. No empty-implementation stubs (`return null`/`=> {}`) in the new code paths; every new derived/function has a real body reachable in tests.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-scoped test suite (both SUMMARYs' claimed test files) | `npx vitest run src/lib/components/progressionDrill.test.ts src/lib/components/ProgressionDrill.embed.test.ts src/lib/i18n/messages.test.ts tests/practice-hub-mix.e2e.test.ts` | 4 files, 28 tests, all passed | PASS |
| Type/lint gate | `npm run check` | 1381 files, 0 errors, 0 warnings | PASS |
| Full workspace suite (run once, per SUMMARY's "108 files, 1538 tests" claim) | `npx vitest run` | 108 files, 1538 tests, all passed | PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` conventions and neither PLAN nor SUMMARY references any probe script.

## Human Verification Required

The code, wiring, and unit-test coverage for both success criteria are fully verified and green. The remaining gap is exclusively **on-device visual confirmation**, which this project's standing limitation (preview harness cannot hydrate this SvelteKit app — project memory `preview-harness-null-origin-sveltekit`) makes impossible to check from this environment. Both 34-01-SUMMARY.md (item D4) and 34-02-SUMMARY.md (item D7) independently flagged this as an open post-ship UAT item, consistent with this project's established pattern (e.g. phases 27, 32, 33 shipped the same way and closed via a follow-up on-device UAT pass).

### 1. Beginner one-octave span + caption visual check

**Test:** Open the progression drill on a beginner-stage (fresh/New card) bar's play step.
**Expected:** Keyboard visually renders as a narrow one-octave span with the beginner caption visible beneath it in the correct locale.
**Why human:** Exact visual width and caption placement require eyes-on confirmation; the preview harness cannot hydrate this app.

### 2. Hint ladder rung visuals + ghost-key hatching

**Test:** Reveal all three ladder rungs on a beginner-stage bar and inspect the CountingChipRow chip coloring and the ghost-key hatch/dash rendering on the keyboard.
**Expected:** Chips are legible and correctly role-tinted; ghost keys are visually distinct (dashed/hatched) from playable keys.
**Why human:** CSS-only visual polish (chip coloring, hatch pattern) is not assertable from DOM-presence tests alone.

### 3. Mature-card widen + ladder-suppression visual check

**Test:** Progress a chord's card to State.Review and revisit its play step.
**Expected:** Keyboard visually widens to two octaves, caption disappears, no hint ladder renders.
**Why human:** Same preview-harness limitation; the underlying logic is proven by tests but the visual transition is an on-device check.

## Acknowledged Gaps

Recorded during `/gsd-verify-work 34` on 2026-07-28. Status flipped `human_needed` -> `passed` on an explicit user decision ("Mark 2+3 blocked, ship phase"), NOT because the human checks were performed.

**What was actually verified by a human:** UAT test 1 only (beginner one-octave keyboard + caption), accepted low-confidence ("i reckon it is ok, hard to review").

**What remains unverified by a human:**
- Hint ladder rung visuals: chip coloring and ghost-key hatch/dash rendering (UAT test 2, blocked).
- Mature-card widen + ladder suppression visual transition (UAT test 3, blocked).

**Why blocked (not failed):** no code defect was found. A probe test confirmed `syntheticProgressionItems(2)` returns 2 items and all 2 survive `composePracticeQueue`. The blocker is testability: a progression bar is only reachable as 1 of 2 synthetic items woven into an uncapped `/practice` queue (`src/routes/practice/+page.svelte:296`), never in the first slot of a cold session, and suppressed entirely when the song filter is on (line 295, PRAC-04 by design). Drill/lesson seeds emit only `name-it` items (`buildSeededItems:159`), so no progression bar can be opened on demand.

**Follow-up carried forward:** add a deterministic entry point for a progression bar (dev route or a progression-capable seed channel). Blocks visual UAT for this phase and any future progression work. Out of this phase's scope.


## Gaps Summary

No functional gaps. All roadmap success criteria and plan-level must-haves are verified in code and by a green, independently-re-run test suite (component suite, full i18n parity gate, and the entire 108-file/1538-test workspace suite). One non-blocking code-review Info item (IN-01: a narrow stale-`stage`-during-reload window affecting only the octave-count read, not the ladder or caption) remains from the phase's own code review and was explicitly disposed as defensive-only/out-of-scope by that review — it does not fail any must-have or success criterion. The only outstanding item is the standard on-device visual UAT this project always defers post-ship due to its non-hydrating preview harness; this is routed to human verification, not treated as a code gap.

---

_Verified: 2026-07-27T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
