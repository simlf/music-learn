---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 07
subsystem: ui
tags: [svelte, i18n, fsrs, voicings, chord-theory, tdd]

# Dependency graph
requires:
  - phase: 25-02
    provides: shellVoicing.ts (shellNotes/rootlessNotes/fullStackNotes/optionalMarkers/voicingStageForChord/seventhChordSymbols)
  - phase: 25-03
    provides: PianoKeyboard's ghostKeys prop (ink-hatch optional-note treatment)
  - phase: 25-05
    provides: route/nav/i18n wiring pattern for a new drill surface (+layout.svelte navLinks + moreHrefs, per-domain i18n file, dynamic-import-after-mocks page test convention)
provides:
  - ShellVoicingDrill.svelte - the sketch-019 "shell voicings, staged by card state" drill (SK-019)
  - /voicings route, reachable from the desktop masthead and phone More sheet
  - voicingMet.ts - the compare-intro-shown-once localStorage store
  - voicings i18n domain (EN/FR) + nav.voicings label
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A stage-derivation $derived.by reads a plain $state counter it doesn't otherwise need (metVersion) purely to force re-evaluation after a localStorage-only side effect (markVoicingMet) that the derived's other reactive dependencies (cards, symbol) don't themselves change"
    - "A single interactive PianoKeyboard instance serves as BOTH the ghost-hatch teaching display and the graded play region simultaneously (ghostKeys applies whenever a key carries no interval role, independent of the interactive selection state), rather than two separate keyboard elements"
    - "'Never gates' wrong-answer UX modeled as a transient boolean (wrongRetry) fully decoupled from the correct-answer reveal state (answered), rather than a tri-state that conflates 'graded' with 'graded correctly'"

key-files:
  created:
    - src/lib/practice/voicingMet.ts
    - src/lib/practice/voicingMet.test.ts
    - src/lib/components/ShellVoicingDrill.svelte
    - src/lib/components/shellVoicingDrill.test.ts
    - src/routes/voicings/+page.svelte
    - src/routes/voicingsPage.test.ts
    - src/lib/i18n/messages/voicings.ts
  modified:
    - src/lib/i18n/messages/chrome.ts
    - src/lib/i18n/messages/index.ts
    - src/routes/+layout.svelte
    - src/lib/i18n/messages.test.ts

key-decisions:
  - "voicingMet mirrors songFilterPref.ts/confidenceLog.ts's total, degrade-to-safe localStorage pattern under the music-learn:* key convention rather than introducing a new persistence idiom"
  - "The 'shell' jazz-pedagogy term is kept identical in en/fr (no French translation invented), mirroring chrome.ts's existing nav.progressions precedent for a technical term without an established French equivalent"
  - "French register-slot abbreviation (013 fit rule) applied to the voicing-selector chips (ROOT/ROOTLESS -> FOND./SANS FOND.) and the step-indicator chips (1 MEET/3 DRILL -> 1 VOIR/3 EXO), matching the documented FONDAMENTALE-vs-ROOT canonical case"
  - "The subtract/drill stage's ghost-hatch teaching display and its interactive play region are the SAME PianoKeyboard element (ghostKeys is orthogonal to the interactive/selected/notes props), not two separate keyboards"
  - "Wrong-answer grading uses a transient wrongRetry boolean, fully independent of the answered (correct-and-revealed) state, so 'never gates' falls out of the state model rather than needing a branch that hides the Check button on a wrong grade"

patterns-established:
  - "Pattern: a chord-maturity-staged drill reads getAllCards() filtered to a chord-formula factId and re-derives its stage via a pure staging function, entirely independent of any deck write - future staged drills can reuse this read-only-deck shape"

requirements-completed: [SK-019]

coverage:
  - id: D1
    description: "ShellVoicingDrill stages compare (meet)/subtract/drill by the chord's FSRS card maturity via voicingStageForChord, with a NEW chord whose compare intro was already shown (voicingMet) advancing straight to subtract"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: stage derived from card maturity"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: Got it advances the meet stage > marks the chord met and advances from meet to subtract"
        status: pass
    human_judgment: false
  - id: D2
    description: "The subtract stage ghost-hatches the droppable root+fifth (25-03's ghostKeys) with a teach panel, and never renders the wrong-extra gray treatment for them"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: stage derived from card maturity > shows the subtract stage (with ghost-hatched root + fifth) for a Learning card"
        status: pass
    human_judgment: false
  - id: D3
    description: "The drill stage shows a Root/Shell/Rootless voicing selector (no teach panel) and grades the selected style's note subset"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: stage derived from card maturity > shows the drill stage (voicing selector, no teach panel) for any Review card"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: grading + advance > grades the drill stage against the selected voicing style (shell = 2 notes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A correct chroma-matched play reveals (ChordGlyph stamp-in) and advances via Next; a wrong play never gates, showing a gentle retry and staying on the same question"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: grading + advance > a correct shell chroma play in the subtract stage advances"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: grading + advance > a wrong play in the subtract stage never gates"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 1 Meet / 2 Subtract / 3 Drill step indicator always renders, with the current stage's chip visually inverted"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#ShellVoicingDrill: step indicator"
        status: pass
    human_judgment: false
  - id: D6
    description: "/voicings route renders the drill and is reachable from both the desktop masthead nav and the phone More sheet, alongside /progressions"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/routes/voicingsPage.test.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "Bilingual EN/FR copy for the whole surface, with French register-slot abbreviation on the fixed-width selector/step chips, chord symbols/intervals staying immune from t()"
    requirement: "SK-019"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts, src/lib/i18n/messages.test.ts"
        status: pass
    human_judgment: false
  - id: D8
    description: "Learner-facing visual polish (ghost-hatch legibility, vcard/step-indicator/voicing-row layout, stamp-in reveal timing on phone width) reads correctly on-device"
    verification: []
    human_judgment: true
    rationale: "CSS visual treatment and phone-width layout require human eyeballing; jsdom component tests can only assert class names/data attributes/testids, not rendered appearance (project's documented preview-harness null-origin gap)."

# Metrics
duration: 13min
completed: 2026-07-21
status: complete
---

# Phase 25 Plan 07: Shell Voicing Drill (sketch-019 staged pedagogy) Summary

**ShellVoicingDrill.svelte: a single /voicings flow whose help level fades with a chord's FSRS card maturity (meet compare intro once, subtract ghost-hatch drain, drill cold voicing selector), grading the 2-note shell (or selected style) by chroma, shipped bilingual with full nav/More-sheet reachability.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-21T18:45:34+02:00
- **Completed:** 2026-07-21T18:58:54+02:00
- **Tasks:** 3
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments
- `voicingMet.ts` persists which chord symbols have already had their compare intro shown (`music-learn:voicing-met`), total/degrade-to-safe like `songFilterPref.ts`/`confidenceLog.ts`
- Full EN/FR `voicings` i18n domain covering the page chrome, the 1/2/3 step-indicator chips, the compare-intro vcard labels/captions, the subtraction teach-panel body, the Root/Shell/Rootless selector (French register-slot abbreviated), and the Check/Next/retry/confirm copy, plus `nav.voicings` registered in the merged catalog
- `ShellVoicingDrill.svelte` derives its stage from 25-02's `voicingStageForChord` against the chord's live deck cards (`getAllCards`, read-only), with a NEW chord whose compare intro was already met (`hasVoicingMet`) advancing straight to `subtract` per the fading-scaffold rule
- The subtract stage's single interactive `PianoKeyboard` doubles as the ghost-hatch teaching display (25-03's `ghostKeys` marking root/fifth) and the graded play region; the drill stage swaps in a `Root`/`Shell`/`Rootless` `.voicing-row` selector with no teach panel
- Grading is chroma-only (`matchChord`) against the shell (subtract) or the selected style's note subset (drill); a correct play shows a `ChordGlyph` stamp-in reveal + Next, a wrong play shows a gentle, non-gating retry
- `/voicings` route added, reachable from both the desktop masthead nav and the phone More sheet, alongside 25-05's `/progressions` entry
- 9-test TDD suite (RED then GREEN) plus a 2-test route/nav suite, zero deck writes (`recordGrade` grep count 0), zero `{@html}`

## Task Commits

Each task was committed atomically:

1. **Task 1: voicingMet store + voicings i18n domain + nav label + register** - `e06cc48` (feat)
2. **Task 2: ShellVoicingDrill.svelte - three stages keyed to card maturity** - RED `e7839b6` (test), GREEN `b412a91` (feat)
3. **Task 3: /voicings route + nav wiring + page test** - `8630add` (feat)

**Plan metadata:** (pending - this commit)

_Note: Task 2's `tdd="true"` frontmatter was executed as genuine RED-then-GREEN: the failing component test was written and committed first (failing on the missing `ShellVoicingDrill.svelte` import), then the implementation landed second, making all 9 tests pass on the second attempt (one interim fix to the wrong-answer state model - see Deviations)._

## Files Created/Modified
- `src/lib/practice/voicingMet.ts` - The compare-intro-shown-once localStorage store (`markVoicingMet`/`hasVoicingMet`)
- `src/lib/practice/voicingMet.test.ts` - 7-test suite covering mark/query, corrupt-store degradation, and setItem-failure no-op
- `src/lib/components/ShellVoicingDrill.svelte` - The staged shell-voicing drill component
- `src/lib/components/shellVoicingDrill.test.ts` - 9-test TDD suite covering stage derivation, ghost-hatch, step indicator, Got-it advance, and correct/wrong grading
- `src/routes/voicings/+page.svelte` - The `/voicings` route page shell (standard paper chrome, mirrors `/recall`/`/progressions`)
- `src/routes/voicingsPage.test.ts` - Route render test + masthead/More-sheet nav-reachability test (also asserts `/progressions` still coexists)
- `src/lib/i18n/messages/voicings.ts` - EN/FR domain for all voicing-drill copy
- `src/lib/i18n/messages/chrome.ts` - Added `nav.voicings` (EN "Voicings", FR "Voicings")
- `src/lib/i18n/messages/index.ts` - Registered the `voicings` domain in the merged catalog
- `src/routes/+layout.svelte` - Added `/voicings` to `navLinks` (desktop masthead) and `moreHrefs` (phone More sheet)
- `src/lib/i18n/messages.test.ts` - Registered the new `voicings` domain in the pre-existing domain-collision-guard list (Rule 1 fix - see Deviations)

## Decisions Made
See `key-decisions` in frontmatter: `voicingMet` reuses the established total/degrade-to-safe localStorage idiom; "shell" stays untranslated in French (mirrors `nav.progressions`'s precedent for jazz jargon without an established French equivalent); the voicing-selector and step-indicator chips get French register-slot abbreviation per the documented 013 fit rule; the subtract/drill stage's ghost-hatch display and its interactive play region are literally the same `PianoKeyboard` element, not two; wrong-answer grading is a transient `wrongRetry` flag fully decoupled from the correct-and-revealed `answered` state so "never gates" is structural rather than a special-cased branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong-answer state model initially gated the Check button on ANY graded attempt**
- **Found during:** Task 2 (GREEN implementation), first test run
- **Issue:** The first implementation used a single `answered` boolean set true on every Check (correct or wrong) plus a separate `correct` boolean to branch the reveal vs. retry template. This hid the Check button and the interactive keyboard on a WRONG grade too, which is exactly the "hard gate" the plan's behavior spec explicitly prohibits ("a wrong play gives a gentle retry, never a hard gate") - the wrong-play test failed because `Check` was no longer queryable.
- **Fix:** Split the state into `answered` (true ONLY on a correct grade - the reveal + Next state) and a transient `wrongRetry` boolean (cleared on the next key toggle/style pick/Check) that renders the retry line alongside the still-fully-interactive Check/keyboard. "Never gates" now falls out of the state model itself.
- **Files modified:** `src/lib/components/ShellVoicingDrill.svelte`
- **Verification:** All 9 component tests pass; `npm run check` clean (0 errors/0 warnings)
- **Committed in:** `b412a91` (Task 2 GREEN commit - the fix was made before that commit landed, so the committed file was already correct)

**2. [Rule 1 - Bug] messages.test.ts's domain-collision-guard list didn't know about the new voicings domain**
- **Found during:** Post-Task-3 full-suite verification (`npx vitest run`)
- **Issue:** A pre-existing test (`src/lib/i18n/messages.test.ts`) enumerates every i18n domain by name to assert the merged catalog's key count equals the sum of each domain's key count. It predates this plan and doesn't import/list the new `voicings` domain, so the merged catalog (494 keys) no longer matched the enumerated sum (472 keys) - a direct, mechanical consequence of this plan's own change (adding a 10th domain to `index.ts`), not a pre-existing failure.
- **Fix:** Imported `voicings` and added `['voicings', voicings.en]` to the test's `domains` array, mirroring every prior domain-addition plan's identical fix to this same list.
- **Files modified:** `src/lib/i18n/messages.test.ts`
- **Verification:** Full suite green (1440/1440 tests); `npm run check` clean
- **Committed in:** `8630add` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes are direct, necessary consequences of this plan's own scope (fixing a state-model bug found by the plan's own test, and updating a pre-existing cross-cutting gate test to account for the new domain this plan added). No scope creep.

## Issues Encountered

None beyond the two auto-fixed items above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full suite: 1440/1440 tests pass; `npm run check` clean (1360 files, 0 errors, 0 warnings).
- `/voicings` is live, bilingual, and reachable from both the desktop masthead and the phone More sheet, alongside `/progressions` (25-05).
- Zero deck writes from this drill (`recordGrade` grep count 0 in the new component) - the FSRS scheduling state this drill reads is never perturbed by using it.
- Known human-judgment item (D8 in `coverage`): the ghost-hatch/vcard/voicing-row visual polish and phone-width layout have not been eyeballed on-device - this project's preview harness cannot hydrate this SvelteKit app (see [[preview-harness-null-origin-sveltekit]]), so a manual on-device check of `/voicings` is recommended before considering the sketch-019 synthesis fully verified end-to-end.
- No blockers for the remaining phase plan (25-08, already complete per the phase's incomplete-plans list showing only 25-07 as outstanding before this execution).

## Self-Check: PASSED

- FOUND: src/lib/practice/voicingMet.ts
- FOUND: src/lib/practice/voicingMet.test.ts
- FOUND: src/lib/components/ShellVoicingDrill.svelte
- FOUND: src/lib/components/shellVoicingDrill.test.ts
- FOUND: src/routes/voicings/+page.svelte
- FOUND: src/routes/voicingsPage.test.ts
- FOUND: src/lib/i18n/messages/voicings.ts
- FOUND: e06cc48 (Task 1 feat commit)
- FOUND: e7839b6 (Task 2 RED commit)
- FOUND: b412a91 (Task 2 GREEN commit)
- FOUND: 8630add (Task 3 feat commit)

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-21*
