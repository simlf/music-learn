---
phase: 20-french-translation
plan: 06
subsystem: i18n
tags: [i18n, svelte5-runes, theory-lesson, bilingual-copy]

requires:
  - phase: 20-french-translation
    plan: 01
    provides: "Reactive locale store (currentLocale/setLocale/initLocale/t) and the merged messages/index.ts dictionary architecture"
provides:
  - "messages/theory.ts filled with the theory-domain dictionary: theory page headings/body/captions, InteractiveLesson controls (Écouter/Continuer/Essayer dans un exercice →), ChordExample's Hear it button"
  - "thirdsLesson.ts LessonStep copy fields (title/body/correctLine/wrongHint) converted to bilingual { en, fr } BilingualCopy pairs, preserving **emphasis** markers and {N} placeholders verbatim"
  - "theory/+page.svelte, InteractiveLesson.svelte, ChordExample.svelte rewired to read t()/currentLocale() reactively"
affects: []

tech-stack:
  added: []
  patterns:
    - "Bilingual lesson-copy fields resolved at render time via step.<field>[currentLocale()], not t() - because lesson content is per-lesson data (thirdsLesson.ts), not a domain dictionary key/value pair. This is a distinct pattern from t(key) and is the one future lessons (triads, sevenths) should follow per the LessonStep interface's own doc comment."
    - "Caption arrays (SEVENTH_SHAPES/ANCHOR_CHORDS in theory/+page.svelte) store a captionKey string instead of a literal caption, resolved via t(entry.captionKey) at the ChordExample call site so the caption stays reactive to a live locale flip."

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/theory.ts
    - src/lib/lessons/thirdsLesson.ts
    - src/lib/lessons/thirdsLesson.test.ts
    - src/routes/theory/+page.svelte
    - src/lib/components/InteractiveLesson.svelte
    - src/lib/components/ChordExample.svelte
    - src/lib/components/interactiveLesson.test.ts
    - src/routes/theoryInteractiveLesson.test.ts

key-decisions:
  - "feedbackLine (the correct/wrong tap-line shown in the active step) is computed imperatively inside handleTap by reading currentLocale() at the moment of the tap, not via a reactive $derived - this satisfies the truth ('the four step titles/bodies/correct/wrong lines render in French') without a bigger state-machine refactor; the done-state correctLine display, by contrast, IS read directly in the template (step.correctLine[currentLocale()]) so it stays live-reactive even after the step completes."
  - "InteractiveLesson's 'Hear it' control and ChordExample's 'Hear it' button share a single theory.hearIt dictionary key (both are the identical locked EN/FR pair 'Hear it'/'Écouter') rather than two component-scoped keys, keeping the dictionary smaller without losing per-component override flexibility (a future lesson could still introduce its own key if wording ever needs to diverge)."
  - "theory.hook.label ('The hook' / \"L'astuce\") is keyed here (owned by theory/+page.svelte's own sidebar snippet), NOT in mnemonics.ts - the mnemonic line content itself stays untouched, matching the plan's explicit prohibition against editing mnemonics.ts (owned by 20-09)."

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "Theory page and interactive thirds lesson render French: four step titles/bodies/correct/wrong lines, plus Écouter/Continuer/Essayer dans un exercice controls"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#InteractiveLesson French locale (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/routes/theoryInteractiveLesson.test.ts#renders the theory page heading and interactive lesson step 1 in French"
        status: pass
    human_judgment: false
  - id: D2
    description: "**emphasis** markers and {N} placeholders preserved verbatim in both en and fr lesson copy"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/lessons/thirdsLesson.test.ts#THIRDS_LESSON bilingual copy completeness (I18N-02)"
        status: pass
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#renders the step 3 body with the **emphasis** span intact in French"
        status: pass
    human_judgment: false
  - id: D3
    description: "Chord symbols in the lesson remain immune to locale (render identically in en/fr)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/interactiveLesson.test.ts#a lesson chord symbol (C · Cm) renders identically across locales"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 06: Interactive Theory Surface Translation Summary

**Filled the theory-domain i18n dictionary, converted `thirdsLesson.ts`'s copy fields to bilingual `{ en, fr }` pairs, and rewired `theory/+page.svelte`, `InteractiveLesson.svelte`, and `ChordExample.svelte` to render fully in French while preserving the `**emphasis**` markers, `{N}` placeholders, and chord-symbol immunity.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-18T20:39:00Z
- **Completed:** 2026-07-18T20:46:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Filled `messages/theory.ts` with the full theory-domain dictionary: page title/subtitle, all six static-lesson sections' labels/headings/body prose, all twelve chord-example captions (5 seventh shapes + 7 anchor chords), the dominant-engine "Hear G7 resolve" button, the mnemonic sidebar's "The hook" label, the interactive lesson's heading/subtitle/controls/handoff copy, and the shared `theory.hearIt` ("Hear it" → "Écouter") key reused by both `InteractiveLesson` and `ChordExample`.
- Converted `thirdsLesson.ts`'s `LessonStep.title/body/correctLine/wrongHint` from bare `string`/`string | null` to a new `BilingualCopy` (`{ en, fr }`) shape, authoring full French do-then-check prose for all four steps while preserving the literal `**phrase**` emphasis markers (steps 3 and 4) and the `{N}` retry-count placeholder (steps 1, 2, 4) verbatim in the French strings.
- Rewired `InteractiveLesson.svelte`: step title/body render via `step.field[currentLocale()]` directly in the template (live-reactive to a locale flip mid-lesson); the tap-time `feedbackLine` (correct/wrong retry line) resolves `currentLocale()` at the moment of the tap; the done-state correct-line display reads `step.correctLine[currentLocale()]` directly in the template so it stays reactive even after the step completes; all controls (`Hear it`/`Continue`/`Done`/handoff tag/heading/body/CTA) now read `t('theory.lesson.*')`.
- Rewired `theory/+page.svelte`: replaced all static section prose with `t('theory.*')` reads; converted `SEVENTH_SHAPES`/`ANCHOR_CHORDS` caption strings to `captionKey` references resolved via `t(entry.captionKey)` at the `ChordExample` call site (keeps captions reactive under the `{#key}` block); kept `mnemonicFor()` calls and `mnemonics.ts` completely untouched per the plan's explicit prohibition.
- Rewired `ChordExample.svelte`'s "Hear it" button to `t('theory.hearIt')`.
- Extended `interactiveLesson.test.ts` and `theoryInteractiveLesson.test.ts` with French-locale assertions: step 1 title + Écouter/Continuer controls render in French; step 3's emphasized `**tierce majeure**` span renders correctly; the lesson's `C · Cm` chord-symbol line renders byte-identically in `en` and `fr`; the theory page heading (`Théorie`) and lesson step 1 title render together under `fr`.
- Extended `thirdsLesson.test.ts` with a completeness gate: every step has non-empty `en`/`fr` title and body; every non-null `correctLine` has non-empty `en`/`fr`; every non-null `wrongHint` preserves the `{N}` placeholder in `fr` whenever it's present in `en`; every step's emphasis-marker presence matches between `en` and `fr` bodies.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/theory.ts** - `02652bb` (feat)
2. **Task 2: Make thirdsLesson.ts lesson copy bilingual** - `aa186a0` (feat)
3. **Task 3: Rewire theory/+page.svelte + InteractiveLesson.svelte + ChordExample.svelte** - `ee5376e` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/lib/i18n/messages/theory.ts` - theory-domain dictionary (page copy, InteractiveLesson controls, ChordExample Hear it, mnemonic sidebar label)
- `src/lib/lessons/thirdsLesson.ts` - `BilingualCopy` type + `LessonStep` copy fields converted to `{ en, fr }` pairs, all four steps authored in both languages
- `src/lib/lessons/thirdsLesson.test.ts` - added bilingual copy completeness test suite
- `src/routes/theory/+page.svelte` - all static section prose + chord-example captions rewired to `t()`
- `src/lib/components/InteractiveLesson.svelte` - step copy resolved via `currentLocale()`, controls via `t()`
- `src/lib/components/ChordExample.svelte` - Hear it button via `t()`
- `src/lib/components/interactiveLesson.test.ts` - added French-locale assertion suite
- `src/routes/theoryInteractiveLesson.test.ts` - added a French-locale page-level assertion

## Decisions Made

- `feedbackLine`'s correct/wrong tap-line resolves `currentLocale()` imperatively at tap time inside `handleTap`, rather than as a `$derived` recomputed on every locale change; the done-state correctLine display, however, is read directly in the template (`step.correctLine[currentLocale()]`), which stays reactive to a locale flip even after the tap. This satisfies the plan's truths without a larger state-machine refactor of the feedback mechanism.
- `theory.hearIt` is a single shared dictionary key used by both `InteractiveLesson`'s "Hear it" step control and `ChordExample`'s "Hear it" button, since both are the identical locked EN/FR pair; this keeps the dictionary smaller while still leaving room for a future component-scoped override if wording ever needs to diverge.
- `theory.hook.label` ("The hook" / "L'astuce") is keyed in `theory.ts` since it's `theory/+page.svelte`'s own sidebar label, not mnemonic content itself — `mnemonics.ts` (owned by Plan 20-09) was not touched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm run check` is 0 errors; full suite (`npm test`) is green: 1120 tests / 82 files, including the new French-locale assertions and the thirdsLesson bilingual completeness gate.
- `messages/theory.ts` is now filled (no longer a stub); en/fr key-parity test continues to pass.
- No blockers for subsequent Phase 20 plans (20-07 through 20-10).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 7 created/modified deliverable files (theory.ts, thirdsLesson.ts, thirdsLesson.test.ts, theory/+page.svelte, InteractiveLesson.svelte, ChordExample.svelte, this SUMMARY.md) confirmed present on disk; all 3 task commit hashes (02652bb, aa186a0, ee5376e) confirmed in git log.
