---
phase: 35-inversions-new-drill-family
verified: 2026-07-27T04:10:00Z
status: human_needed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Bass ink-ring + 'B' badge legibility over a role-colored key on a real device"
    expected: "The neutral-ink ring and mono 'B' badge on the bass key are clearly visible/legible layered on top of a role fill or ghost hatch, on real hardware (not jsdom)"
    why_human: "Visual contrast/legibility on real screens cannot be judged from unit tests; the preview/browser harness cannot hydrate this SvelteKit app (project memory: preview-harness-null-origin-sveltekit), so this is an on-device-only check"
  - test: "2-octave keyboard tap targets on a phone-width viewport"
    expected: "All 15 white keys (2 octaves) remain comfortably tappable at phone width, with the bass note visibly reachable below the stack"
    why_human: "Physical tap-target sizing/reachability on a real touchscreen is a UX judgment call the plan itself explicitly flagged for on-device UAT (35-05-PLAN.md, 35-06-PLAN.md verification sections)"
---

# Phase 35: Inversions — New Drill Family Verification Report

**Phase Goal:** The user can drill a chord in a named inversion (root / 1st / 2nd / 3rd) with the correct bass, guided by a fading hint ladder, scheduled as its own FSRS family inside the Practice hybrid queue.
**Verified:** 2026-07-27T04:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can drill a chord in a named inversion (root/1st/2nd/3rd), playing notes graded by chroma + required bass (never letter strings) | ✓ VERIFIED | `matchInversion.ts` composes `matchChord` (chroma Set) + a separate `bassCorrect` chroma-equality check; `inversionDrill.test.ts` grading suite (4 tests) exercises right/right, wrong-notes, right-notes/wrong-bass, and a keyboard-only (non-pointer) win — all pass |
| 2 | Role colors stay fixed across inversions; only note order changes; bass note carries ink ring + "B" badge | ✓ VERIFIED | `inversions.ts#inversionVoicing` preserves each note's own `role` under rotation; `PianoKeyboard.bassHintClass`/`bassBadge` render `.piano-keyboard__key--bass-ring` + `data-bass="B"` matched by chroma+octave, deliberately NOT `!role`-gated (layers over a role fill) — `pianoKeyboard.bassHint.test.ts` (6 cases) pass |
| 3 | Escalating optional hint ladder (bass → stack-from-bass → ghost keys) fades by FSRS maturity | ✓ VERIFIED | `InversionDrill`'s `offeredRungs` derived from `voicingStageForChord(cards)`: meet→3 rungs, subtract→2 (bass dropped), drill→0 (no ladder); `inversionDrill.test.ts` covers all three stages + "wrong Check does not collapse a revealed rung" — all pass |
| 4 | Bass ring never spoils the answer / never bypasses the maturity fade (CR-01 fix) | ✓ VERIFIED | `bassHint={!answered && ghostRevealed ? bassHintEntry : null}` — ring appears only once the ghost rung is actually revealed, never pre-answer-spoiler, never at matured `drill` stage (`offeredRungs === []` ⇒ `ghostRevealed` false); 2 dedicated regression tests pass (`inversionDrill.test.ts:234, 262`) |
| 5 | Symbol shown up front (not earned); wrong play retries with two distinct lines; never gates | ✓ VERIFIED | `ChordGlyph` rendered unconditionally at top; `retryKind` branches `'notes'` vs `'bass'` with distinct `data-testid`s and copy; `checkPlay` never sets `answered=true` on a wrong result — tests confirm no-complete on both wrong paths |
| 6 | Inversion is its own family in the Practice hybrid queue (INV-03), alongside the synthetic voicings/progressions — synthetic-vs-carded interpretation | ✓ VERIFIED (interpreted) | `PracticeFamily` widened with `'inversion'`; `InversionQueueItem` joins `HybridQueueItem` as a **synthetic** member (mirrors `VoicingQueueItem`/`ProgressionQueueItem`), NOT added to `CardedFamily`/`isCardedItem`. This is a deliberate, ROADMAP-documented planner decision (ROADMAP.md "Planner decision (Claude's Discretion, 35-CONTEXT carded-vs-synthetic)": "the inversion family is SYNTHETIC... chosen for REG-01 safety in this highest-risk phase"). REQUIREMENTS.md's literal INV-03 wording ("its own FSRS-scheduled family") is superseded by this roadmap-level resolution; the operative contract is "own family in the hybrid queue," which is met |
| 7 | Inversion item consumed via `completeSynthetic` (no `deck.recordGrade`); family cue via `practice.cue.inversion` | ✓ VERIFIED | `+page.svelte:511-515` widens `completeSynthetic`'s early-return guard to include `'inversion'`; `completeCarded`/`recordGrade` never touch it; `CUE_LABELS.inversion = t('practice.cue.inversion')`; `practiceInversions.test.ts` asserts `deck.recordGrade` mock never called for an inversion completion — pass |
| 8 | Existing five families' scheduling/grading/telemetry/interleaving/single-type-due/song-filter byte-unchanged (REG-01) | ✓ VERIFIED | `composePracticeQueue`'s weave body untouched (confirmed via git diff in 35-04-SUMMARY); frozen-order REG-parity test in `practiceQueue.test.ts` asserts literal id-order baseline for a fixed rng with zero inversion items; `practiceInversionsReg.test.ts` asserts six-family interleave, FSRS grade-commit path (name-it/interval/build-it), song-filter steering, and single-type-due gate all hold with inversions genuinely woven in; 4 pre-existing e2e/host tests updated with `syntheticInversionItems: () => []` isolation stubs (mechanical consequence of the same due-chord gate, not a behavior change) — all pass |
| 9 | Keyboard renders 2 octaves so the bass can sit below the stack | ✓ VERIFIED | `InversionDrill` passes `octaves={2}` explicitly (forced, documented deviation from self-measuring default); `PianoKeyboard`'s `octaves` prop is respected (`octaves ?? (measured ? octavesForWidth(...) : 2)` — explicit value short-circuits self-measurement) |
| 10 | `inversions.*` i18n domain: every keyed word, FR primary + EN, no em dashes, Symbol Immunity | ✓ VERIFIED | `messages/inversions.ts` registered in `index.ts` + `messages.test.ts` collision array; `coverage.test.ts`/`immunity.test.ts`/`messages.test.ts` all pass; grep for em-dash/arrow glyphs in the domain file and `InversionDrill.svelte` returns no matches |
| 11 | `stackedThirdsFor`/`CountingChipRow`/`PianoKeyboard` extended additively with zero change to existing callers (REG-01) | ✓ VERIFIED | `chordPresentation.test.ts`, `CountingChipRow.test.ts`, `pianoKeyboard.bassHint.test.ts` all assert byte-identical omitted-prop rendering; full pre-existing suite green (114 files / 1597 tests) |
| 12 | No debt markers / stub anti-patterns in phase-touched files | ✓ VERIFIED | Grep for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER/"not yet implemented" across all 9 touched core files returns zero matches |

**Score:** 12/12 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/practice/inversions.ts` | Pure inversion engine (count/bass-role/bass-note/voicing) | ✓ VERIFIED | Exists, substantive (95 lines, 4 exported functions + constant), wired (imported by `matchInversion` callers, `InversionDrill`, `practiceQueue.ts`) |
| `src/lib/drills/matchInversion.ts` | Chroma + bass grading composing matchChord | ✓ VERIFIED | Exists, composes `matchChord` (no chroma-set re-derivation), wired into `InversionDrill.checkPlay` |
| `src/lib/i18n/messages/inversions.ts` | New i18n domain | ✓ VERIFIED | Exists, registered in `index.ts` + `messages.test.ts`, wired via `t()` calls throughout `InversionDrill.svelte` |
| `src/lib/components/InversionDrill.svelte` | Practice-hub drill component | ✓ VERIFIED | Exists (426 lines), substantive, wired into `/practice` host render branch |
| `PianoKeyboard bassHint` prop + CSS | Ink ring + "B" badge, chroma+octave matched, not role-gated | ✓ VERIFIED | Prop added, `bassHintClass` has no `!role` guard (confirmed by direct grep), `.piano-keyboard__key--bass-ring` CSS present |
| `CountingChipRow rotateFromRole` prop | Rotated tone/gap row from the bass | ✓ VERIFIED | Delegates to `stackedThirdsFor(chord, rotateFromRole)`; used in InversionDrill's stack rung |
| `practiceQueue.ts` inversion family | `PracticeFamily`/`InversionQueueItem`/`syntheticInversionItems`/`filterInversionsBySong` | ✓ VERIFIED | All four present; `composePracticeQueue`/`isCardedItem` bodies unedited (weave stays generic) |
| `/practice` host weave | Gated + song-filtered inversion weave, render branch, `completeSynthetic` extension | ✓ VERIFIED | All present in `+page.svelte` |
| `src/routes/practiceInversions.test.ts` + `practiceInversionsReg.test.ts` | Host integration + REG gate | ✓ VERIFIED | Both exist, both pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `matchInversion.ts` | `matchChord.ts` | function composition | ✓ WIRED | `matchChord(played, target)` called directly, not re-derived |
| `inversions.ts` | `spellChord`/tonal | data source | ✓ WIRED | `spellChord(symbol).notes`, `Note.chroma` — no new theory source |
| `InversionDrill.svelte` | `inversions.ts` + `matchInversion.ts` | grading pipeline | ✓ WIRED | `bassNoteFor`, `bassRoleForIndex`, `inversionVoicing`, `matchInversion` all imported and called in `checkPlay`/render |
| `InversionDrill.svelte` | `voicingStageForChord` (`shellVoicing.ts`) | maturity read | ✓ WIRED | `getAllCards()` filtered to `chord-formula:{symbol}`, fed to `voicingStageForChord` — no new maturity metric |
| `CountingChipRow.rotateFromRole` | `stackedThirdsFor` startRole | one source of truth | ✓ WIRED | `$derived(stackedThirdsFor(chord, rotateFromRole))` |
| `practiceQueue.syntheticInversionItems` | `inversions.inversionCountFor` | index bounding | ✓ WIRED | Imported and used to enumerate valid `{symbol, inversionIndex}` pairs |
| `/practice` host | `syntheticInversionItems` + `InversionDrill` | weave + render | ✓ WIRED | Woven into `syntheticItems` inside `dueChordSymbols.size > 0` gate; render branch mounts `InversionDrill` |
| `/practice` host `completeSynthetic` | inversion consumption | no FSRS write | ✓ WIRED | Guard widened to `'inversion'`; `recordGrade` never called for it (asserted by test) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-scoped unit/component/integration tests | `npx vitest run` (10 targeted files: inversions, matchInversion, bassHint, InversionDrill, practiceQueue, host integration, REG gate, i18n coverage/collision/immunity) | 98/98 passed | ✓ PASS |
| Full workspace suite (run once, per constraint) | `npx vitest run` | 114 files / 1597 tests passed | ✓ PASS |
| Type-check | `npm run check` | 1391 files, 0 errors, 0 warnings | ✓ PASS |
| Debt-marker / stub-pattern scan | grep across 9 touched core files | 0 matches | ✓ PASS |
| Em-dash / arrow glyph scan (copy contract) | grep `—`/`→` in `inversions.ts` i18n domain + `InversionDrill.svelte` | 0 matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| INV-01 | 35-01, 35-02, 35-03, 35-05 | Drill a named inversion, chroma+bass grading, fixed role colors + bass ring | ✓ SATISFIED | `inversions.ts`, `matchInversion.ts`, `PianoKeyboard.bassHint`, `InversionDrill.svelte` all present, tested, wired |
| INV-02 | 35-02, 35-03, 35-05 | Escalating hint ladder fading by FSRS maturity | ✓ SATISFIED | `InversionDrill`'s `offeredRungs`/`voicingStageForChord` logic, `CountingChipRow.rotateFromRole` stack rung, ghost-rung reveal — all tested across meet/subtract/drill stages |
| INV-03 | 35-04, 35-06 | Own family in the Practice hybrid queue, no regression to existing five | ✓ SATISFIED (synthetic interpretation) | `PracticeFamily 'inversion'`, `InversionQueueItem`, host weave, `completeSynthetic`, frozen-order REG-parity test, REG gate host test — all present and passing. Interpreted as "synthetic family alongside voicings/progressions" per ROADMAP's explicit planner-decision resolution, not a literal new FSRS-carded family (which would have required a new FactKind/Dexie schema change explicitly ruled out for REG-01 safety) |

No orphaned requirements: REQUIREMENTS.md maps exactly INV-01/INV-02/INV-03 to Phase 35, and all three appear in at least one plan's `requirements:` frontmatter field.

### Anti-Patterns Found

None. Scanned all 9 phase-touched core files (`inversions.ts`, `matchInversion.ts`, `inversions.ts` i18n domain, `InversionDrill.svelte`, `CountingChipRow.svelte`, `PianoKeyboard.svelte`, `practiceQueue.ts`, `+page.svelte`, `chordPresentation.ts`) for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER/"not yet implemented" markers — zero matches. Code review (35-REVIEW.md, iteration 2) found 0 BLOCKER, 0 WARNING; 4 INFO items remain (dead `filterInversionsBySong` export, latent-defensive `Note.chroma` undefined handling, unguarded out-of-range `inversionIndex`, stale prop-doc wording) — all non-blocking, code-quality-only, explicitly not required for phase goal achievement. Both prior BLOCKER (CR-01: bass ring spoiler) and WARNING (WR-01: keyboard-only bass detection) findings were fixed and re-verified in review iteration 2 with dedicated regression tests, confirmed present and passing in this verification.

### Human Verification Required

1. **Bass ink-ring + "B" badge legibility over a role-colored key**
   **Test:** On a real device/browser, reveal the ghost hint rung in an inversion drill and observe the bass key.
   **Expected:** The neutral-ink ring and mono "B" badge are clearly legible layered on top of the role-colored fill / ghost hatch.
   **Why human:** Visual contrast/legibility judgment on real hardware; the project's preview/browser harness cannot hydrate this SvelteKit app (project memory: preview-harness-null-origin-sveltekit), so only jsdom-level presence (confirmed) is machine-verifiable, not real-world legibility.

2. **2-octave keyboard tap targets on a phone-width viewport**
   **Test:** Open an inversion drill item on a phone-width screen and attempt to tap each of the 15 white keys, including the bass note below the stack.
   **Expected:** All keys remain comfortably tappable; the bass note is visibly reachable below the stacked chord tones.
   **Why human:** Physical tap-target sizing and reachability is a UX judgment call on a real touchscreen; explicitly flagged by the plan itself (35-05-PLAN.md, 35-06-PLAN.md verification sections) as deferred on-device UAT, not machine-testable.

### Gaps Summary

None. All 12 derived observable truths verified against the codebase (not SUMMARY claims): code read directly, tests run directly (98/98 targeted, 1597/1597 full suite, 0 svelte-check errors), key links traced by grep/read. The two open items are pure on-device visual/UX confirmations that the plan itself always intended to defer to human UAT — they do not indicate missing or stubbed functionality; the underlying code and its behavioral logic (gating, fade-by-maturity, chroma+bass grading, REG-01 non-regression) are all proven by passing tests, not presence alone.

The INV-03 "own FSRS-scheduled family" vs. "synthetic family in the hybrid queue" distinction is a deliberate, ROADMAP-documented planner resolution (not a phase-level shortcut) made explicitly for REG-01 safety in this highest-risk new-family phase; it is treated here as satisfying INV-03's operative intent ("participates in the Practice hybrid queue as its own family alongside the existing five, with no regression"), per this verification's explicit instructions.

---

_Verified: 2026-07-27T04:10:00Z_
_Verifier: Claude (gsd-verifier)_
