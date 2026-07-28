---
phase: 35-inversions-new-drill-family
plan: 03
subsystem: i18n
tags: [i18n, svelte, drills, inversions]

requires:
  - phase: 20-i18n-foundation
    provides: LocaleDict shape, messages/index.ts merge point, collision-guard test pattern
  - phase: 25
    provides: progressions.ts as the closest structural precedent (Symbol-Immunity header, hint-ladder split-key convention)
provides:
  - "inversions.* i18n domain: inversion names/abbreviations, article-free bass-role words, prompt/retry/reveal copy, 3-rung hint-ladder tags/bodies, closing line"
  - "Domain registered in messages/index.ts merge and messages.test.ts collision-check array"
affects: [35-05-inversion-drill-component, 35-06-practice-hub-host-cue]

tech-stack:
  added: []
  patterns:
    - "Split-key composition for immune interpolated values (bass letter never routed through t(), only surrounding words keyed) — mirrors progressions.hint.degree.lead/.builtOn/.noteOf/.rootLabel"

key-files:
  created:
    - src/lib/i18n/messages/inversions.ts
  modified:
    - src/lib/i18n/messages/index.ts
    - src/lib/i18n/messages.test.ts

key-decisions:
  - "Bass letter is spliced raw around keyed connector phrases (inversions.hint.bass.mid, inversions.hint.stack.lead/.closing) rather than embedding it in a template key, preserving Symbol Immunity."
  - "Replaced the UI-SPEC's illustrative arrow (→) in rung-1 body with a colon-joined sentence structure (mirrors existing project convention, e.g. 'TON :'), per the plan task's explicit no-arrow-glyph instruction."
  - "bassRole words are article-free in both locales (EN 'root'/'third'/'fifth'/'seventh', FR 'fondamentale'/'tierce'/'quinte'/'septième') with one shared inversions.bass.article key ('the'/'la'), per the plan task's exact wording over the UI-SPEC table's inline EN articles."

patterns-established:
  - "Domain files are registered in exactly two places (messages/index.ts spread, messages.test.ts collision array) — this plan's Task 2 is a template for any future domain addition."

requirements-completed: [INV-01]

coverage:
  - id: D1
    description: "New inversions.* i18n domain (FR primary + EN) provides every keyed WORD the inversion drill and host cue will render: inversion names/abbreviations, bass-role words + article, prompt phrase, buttons, both retry lines, reveal line, 3-rung hint ladder (reveal-control labels, tier tags, split-key rung bodies), closing line."
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (no-raw-key-leak sweep across every domain, including inversions.*)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts (en/fr parity + domain-collision guard, inversions added to domains array)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/immunity.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Domain registered in messages/index.ts merge (en/fr spreads) and messages.test.ts collision-check array; no key collides with any other domain."
    requirement: "INV-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts > domain dictionary key collisions (I18N-02)"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check, 0 errors)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-27
status: complete
---

# Phase 35 Plan 03: Inversions i18n Domain Summary

**New `inversions.*` i18n domain (FR primary + EN) delivering all INV-01 drill copy — inversion names, bass-role words, retry/reveal lines, and a 3-rung hint ladder with split keys preserving Symbol Immunity around the bass note letter.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-27T00:40:39Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Authored `src/lib/i18n/messages/inversions.ts` with FR-primary + EN parity: inversion names/abbreviations (0-3), article-free bass-role words + shared article, prompt-composition phrase, Check/Hear-it/Next buttons, both distinct retry lines (wrong notes vs. right-notes-wrong-bass), the reveal-confirmation line, the full 3-rung hint ladder (reveal-control labels, tier tags, split-key rung bodies around the immune bass letter), and the closing line.
- Registered the domain in `messages/index.ts` (import + en/fr spreads) and in `messages.test.ts`'s collision-check `domains` array, matching the existing per-domain registration pattern exactly.
- Verified zero key collisions, full en/fr parity, Symbol Immunity intact, and no em dashes anywhere in the new file.

## Task Commits

1. **Task 1: Author messages/inversions.ts (FR primary + EN)** - `d24e456` (feat)
2. **Task 2: Register the domain (index.ts merge + messages.test.ts collision list)** - `e232182` (feat)

_No TDD tasks in this plan (pure config/registration)._

## Files Created/Modified
- `src/lib/i18n/messages/inversions.ts` - New domain: inversion names/abbreviations, bass-role vocabulary, prompt/retry/reveal copy, 3-rung hint-ladder copy, closing line
- `src/lib/i18n/messages/index.ts` - Import + en/fr spread registration for the new domain
- `src/lib/i18n/messages.test.ts` - Added `['inversions', inversions.en]` to the collision-check domains array

## Decisions Made
- Bass letter (and any other immune value) is spliced raw between keyed connector phrases rather than embedded in a template string, preserving Symbol Immunity while still letting rung bodies read as natural sentences (e.g. rung-1 composes as `${inversionName} : ${hint.bass.mid} ${bassLetter} (${bass.article} ${bassRoleWord}).`).
- Replaced the UI-SPEC's illustrative arrow glyph (→) in the rung-1 body template with a colon-joined structure, per the plan task's explicit instruction not to use the em-dash or arrow glyph the UI-SPEC table shows only illustratively; the project already uses colon-joined labels elsewhere (e.g. `progressions.key.banner.label: "KEY:"`).
- `inversions.bassRole.*` words are kept article-free in both EN and FR (matching the plan task's literal wording), with a single shared `inversions.bass.article` key ("the"/"la") for composition — slightly cleaner than the UI-SPEC table's inline EN articles ("the root", "the third", etc.), since the plan task's own field-by-field instructions take precedence and this keeps EN/FR composition symmetric.

## Deviations from Plan

None - plan executed exactly as written. The only interpretive choices made (arrow-to-colon substitution, article-free bass-role words) were explicitly anticipated and permitted by the plan task's own instructions (which take precedence over the UI-SPEC table's illustrative wording where the two differ), not scope changes.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `inversions.*` keys are ready for consumption by the upcoming `InversionDrill.svelte` component (35-05) and its Practice-hub host cue (35-06): inversion names/abbreviations for the prompt and passive rotation strip, bass-role vocabulary for prompt/retry composition, and the full 3-rung hint-ladder copy (bass/stack/ghost) for the escalating hint interaction.
- No blockers. The domain is additive-only; zero risk to the existing nine registered domains (collision test asserts this).

---
*Phase: 35-inversions-new-drill-family*
*Completed: 2026-07-27*

## Self-Check: PASSED
- FOUND: src/lib/i18n/messages/inversions.ts
- FOUND: d24e456 (Task 1 commit)
- FOUND: e232182 (Task 2 commit)
