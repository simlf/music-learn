---
phase: quick-260729-ert
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/components/keyboardLayout.ts
  - src/lib/components/keyboardLayout.test.ts
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/ShellVoicingDrill.svelte
  - tests/e2e/tap-targets.spec.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "On a 390px-wide phone viewport, the voicing card's piano keyboard(s) render with zero horizontal scrolling and the full note range visible (wrapped into two stacked rows when a single row would fall under the 44px white-key floor)."
    - "On the same viewport, the voicing card's 'CE QUE TU SAIS' / 'WHAT YOU KNOW' compare-card header (label + caption) is fully visible, not clipped off the right edge."
    - "Two-row wrap never breaks black-key positioning or note-label alignment: each row is its own mini C-to-C-boundary keyboard with independently correct white/black key geometry."
    - "Chord-tone highlight coloring (root/third/fifth/seventh fills, wrong marks, selected/ghost/bass-ring states) is visually intact across both rows."
    - "Desktop/wide-viewport rendering is unchanged (single row, 2-octave board, byte-identical to before)."
  artifacts:
    - src/lib/components/keyboardLayout.ts (adds row-split pure functions)
    - src/lib/components/PianoKeyboard.svelte (renders 1 or 2 stacked rows)
    - src/lib/components/ShellVoicingDrill.svelte (.vcards mobile-first stacking + header wrap fix)
  key_links:
    - "keyboardLayout.ts's new shouldStackRows/splitBoardIntoRows feed PianoKeyboard.svelte's render — every existing call site (Lookup, drills, ScaleKeyboardDrill siblings, BuildSession, ShellVoicingDrill) gets the fix for free since none pass an explicit row-count override."
    - "ShellVoicingDrill's .vcards grid must go single-column below the app's existing 639.98px phone breakpoint so each PianoKeyboard's measured container width is the full card width, not a squeezed half-column."
</must_haves>
---

<objective>
Fix two related mobile-viewport (~390px) bugs on the practice page's voicing card
(`ShellVoicingDrill.svelte`, rendered when `currentItem.family === 'voicing'` on `/practice`):

1. The shared `PianoKeyboard.svelte` component currently answers "not enough width" by
   growing the board past the container and letting the user horizontally scroll to see
   the rest of the keys (`keyboardLayout.ts`'s `octavesForWidth`/`fitsWithoutScrolling` +
   the component's `overflow-x: auto` wrapper). On phone widths this leaves the keyboard
   only partially visible. LOCKED user decision: replace this with a **two-row vertical
   wrap** — the full note range renders across two stacked rows, each a correct mini
   keyboard, with no horizontal scrolling and no reduction of the rendered octave range.
2. `ShellVoicingDrill.svelte`'s "meet" stage compare-card header (`.vcard__head`, holding
   `voicings.compare.knowLabel` "CE QUE TU SAIS" and `voicings.compare.knowCaption` "La
   pile complète...") is a `flex; justify-content: space-between` row with an unwrapped,
   right-aligned caption span — it clips off-screen once its `.vcard` column is squeezed
   narrow. Root cause of the squeeze: `.vcards` is a rigid `grid-template-columns:
   repeat(2, 1fr)` with no responsive override, so each compare card (and the
   `PianoKeyboard` inside it) gets roughly half the already-narrow phone width. Per the
   app's own mobile-first / phone-first stated strategy and this component's own
   `contextual-learning-metacognition.md` note that the compare card is meant to be
   "stacked" on phone, `.vcards` must default to one column and only go two-column at the
   app's existing `640px`-class breakpoint.

Purpose: The practice page's voicing drill (a core spaced-repetition drill family) is
currently unusable on the phone the app is explicitly built mobile-first for — the primary
teaching surface (the keyboard) is half-hidden and its own header text is unreadable.

Output: `PianoKeyboard.svelte` renders a full, uncropped keyboard on any phone-class
viewport via two stacked rows when needed; `ShellVoicingDrill.svelte`'s compare-card
header and grid layout are legible and correctly stacked on phone.
</objective>

<execution_context>
@.claude/gsd-core/workflows/execute-plan.md
@.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.claude/skills/sketch-findings-music-learn/SKILL.md
@.claude/skills/sketch-findings-music-learn/references/counting-hint-grammar.md

Relevant source (read during scouting, referenced by these tasks):
- src/lib/components/keyboardLayout.ts — pure layout math (`octavesForWidth`,
  `fitsWithoutScrolling`, `minBoardWidthPx`, `whiteLettersForOctaves`,
  `blackKeysForOctaves`, `assignNotesToKeys`, `MIN_WHITE_KEY_PX`). `BLACK_KEY_PATTERN` has
  no entry at `afterWhiteIndex: 6` (the B-to-C gap) or `afterWhiteIndex: 13` for a
  2-octave board's equivalent gap — these are the only black-key-free seams in the
  layout, i.e. the only places a row can split without orphaning a black key from its
  adjacent white key.
- src/lib/components/PianoKeyboard.svelte — renders `whiteKeys`/`blackKeys` (absolute
  `index`/`keyIndex`-keyed arrays spanning the WHOLE board) as absolutely-positioned
  `left/width` percentage children of one `.piano-keyboard__board` div, itself inside a
  `.piano-keyboard` wrapper with `overflow-x: auto`. `effectiveOctaves` (1 or 2) is
  self-measured via `ResizeObserver` unless the `octaves` prop is explicitly passed (no
  call site currently passes it).
- src/lib/components/ShellVoicingDrill.svelte — the "meet" stage's `.vcards` (2-col grid
  of `.vcard`, each containing a `.vcard__head` flex row + a `PianoKeyboard`).
- tests/e2e/helpers.ts — `PHONE` (375x812), `PHONE_NARROW` (320x568), `PHONE_LANDSCAPE`,
  `DESKTOP` viewport fixtures; `openPracticeFamily(page, 'voicing')` seeds a deck and
  starts a session landing on the voicing drill (`FAMILY_TESTID.voicing =
  'shell-voicing-drill'`).
- tests/e2e/tap-targets.spec.ts — the existing keyboard tap-target suite. Its current
  "octave count matches width" and "never makes the page scroll sideways" tests encode
  the OLD single-row/scroll behavior this plan replaces; they must be updated to assert
  two-row stacking at narrow widths instead of a wider-than-container scrolling board.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add row-split pure functions to keyboardLayout.ts</name>
  <files>src/lib/components/keyboardLayout.ts, src/lib/components/keyboardLayout.test.ts</files>
  <behavior>
    - `shouldStackRows(octaves, availableWidthPx, minWhiteKeyPx = MIN_WHITE_KEY_PX)`:
      returns true whenever `!fitsWithoutScrolling(octaves, availableWidthPx,
      minWhiteKeyPx)` — i.e. exactly the condition that currently triggers horizontal
      scroll, now instead triggering the two-row wrap. False at/above each span's
      existing floor (352px for 1 octave, 660px for 2), matching current
      `fitsWithoutScrolling` behavior byte-for-byte (no new threshold invented).
    - `firstRowWhiteCount(octaves)`: returns 7 — the count of white keys in the first
      row (C through B), for BOTH 1-octave and 2-octave spans. This is the only seam
      with no black key on either side (`BLACK_KEY_PATTERN` has no `afterWhiteIndex: 6`
      entry), so splitting here never orphans a black key from its neighboring white
      key. For a 1-octave span (8 white keys total: C D E F G A B C) this yields a
      7-key first row + 1-key second row (the trailing C alone, with zero black keys) —
      matches "each row is its own mini-keyboard with correct geometry" even in the
      degenerate single-trailing-key case.
    - `splitBoardIntoRows(octaves)`: returns a 2-element array of `{ whiteLetters:
      string[]; blackKeys: BlackKeyPattern[]; startWhiteIndex: number }`, partitioning
      `whiteLettersForOctaves(octaves)` and `blackKeysForOctaves(octaves)` at the
      `firstRowWhiteCount(octaves)` boundary. Row 1: white indices `[0,
      firstRowWhiteCount)`, black keys whose `afterWhiteIndex <
      firstRowWhiteCount`. Row 2: the remainder, with each row's own `blackKeys`
      re-indexed to `afterWhiteIndex - startWhiteIndex` (or equivalent), i.e. Row 2 is
      itself a valid standalone board layout at index 0, not a raw slice of the full
      board's absolute indices — `whiteLettersForOctaves`/`blackKeysForOctaves`
      percentage math (`whiteSlot`/`blackSlot`) must resolve correctly against each
      row's own key count for `PianoKeyboard.svelte` to compute correct per-row
      `leftPct`/`widthPct`.
    Cases: `shouldStackRows(1, 351)` -> true; `shouldStackRows(1, 352)` -> false;
    `shouldStackRows(2, 659)` -> true; `shouldStackRows(2, 660)` -> false;
    `firstRowWhiteCount(1)` -> 7; `firstRowWhiteCount(2)` -> 7;
    `splitBoardIntoRows(1)` -> row 1 has 7 white letters (`C D E F G A B`) + all 5 black
    keys of the first octave, row 2 has exactly 1 white letter (`C`) + 0 black keys;
    `splitBoardIntoRows(2)` -> row 1 has 7 white letters + 5 black keys (octave 1), row
    2 has 8 white letters (`C D E F G A B C`, the second octave plus trailing C) + 5
    black keys (octave 2's pattern, re-indexed to start at 0).
  </behavior>
  <action>
    Add the three functions above to keyboardLayout.ts alongside the existing
    `octavesForWidth`/`fitsWithoutScrolling` exports, following the file's existing
    JSDoc-per-export convention (explain WHY the split seam is white-index 7, citing the
    `BLACK_KEY_PATTERN` gap, per D-locked "no horizontal scroll, no range shrink" —
    reference the user's practice-page mobile symptom, not a hypothetical). Do not
    modify `octavesForWidth`, `fitsWithoutScrolling`, `minBoardWidthPx`,
    `whiteLettersForOctaves`, or `blackKeysForOctaves` — they stay the source of truth
    for span selection and per-octave data; the new functions only decide row
    partitioning on top of them. Add corresponding test cases to
    keyboardLayout.test.ts following the existing `describe` block style (see the
    `octavesForWidth`/`fitsWithoutScrolling` describe blocks already in that file for
    the exact assertion/threshold style to match).
  </action>
  <verify>
    <automated>npm test -- --run keyboardLayout</automated>
  </verify>
  <done>`shouldStackRows`, `firstRowWhiteCount`, and `splitBoardIntoRows` are exported
  from keyboardLayout.ts, covered by passing unit tests for both the 1-octave and
  2-octave cases described above, and existing keyboardLayout.test.ts assertions are
  unchanged and still pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Render two stacked rows in PianoKeyboard.svelte when required</name>
  <files>src/lib/components/PianoKeyboard.svelte</files>
  <behavior>
    - When `shouldStackRows(effectiveOctaves, measuredWidth)` is true (and
      `measuredWidth` is known), the component renders `splitBoardIntoRows(effectiveOctaves)`
      as two separate `.piano-keyboard__board` elements stacked vertically inside the
      existing `.piano-keyboard` wrapper (via a new `.piano-keyboard__rows` flex-column
      container), each row computing its OWN `whiteKeyWidthPct`/`blackKeyWidthPct` from
      its own white-letter count (7 for row 1, up to 8 for row 2) so each row
      independently satisfies the fingertip floor at the measured container width — no
      `overflow-x` needed on the stacked path since each row's own min-width
      (`row.whiteLetters.length * MIN_WHITE_KEY_PX`) is always <= the measured
      container width once `shouldStackRows` triggered on the ORIGINAL wider span
      (verify: for `effectiveOctaves=2`, row widths are 308px/352px, both comfortably
      under any phone viewport that was too narrow for the original 660px one-row
      board).
    - `noteAtWhiteIndex`/`noteAtBlackIndex` (which key currently holds which spelled
      note) must still resolve correctly per row: each row's rendered white/black key
      list needs its OWN absolute-index lookup preserved (row 2's first white key is
      absolute index 7, not 0) so highlight coloring / NoteLabel / wrong-marks /
      ghost/bass-ring props keep working per key exactly as they do today — do not
      recompute `noteAssignment` per row; keep the single existing `noteAssignment` map
      (keyed by the full-board `whiteLetters`/`blackKeyPatterns`) and only change WHERE
      each already-assigned key is rendered (which row, which local left%) not HOW
      assignment is computed.
    - When `shouldStackRows` is false (desktop, or any width that already fit), render
      exactly as today: one `.piano-keyboard__board`, unchanged CSS class names, no new
      wrapper — this is the byte-identical-when-unstacked requirement. Keep the
      existing `overflow-x: auto` / `-webkit-overflow-scrolling` styling on
      `.piano-keyboard` as a dead-code-safe fallback only (it becomes inert once
      stacking covers every phone-class width the app targets; it is not removed, since
      an extremely narrow <308px viewport — narrower than any real device this app
      targets — would still need it as a last resort per row, and removing it outright
      is unrelated scope).
    - `keyboardAriaLabel` stays describing octave count (unaffected by row count — row
      count is a rendering detail, not a semantic one).
  </behavior>
  <action>
    Modify the render block (currently one `{#each whiteKeys}` / `{#each blackKeys}`
    pair inside one `.piano-keyboard__board`) to branch on a new `$derived` boolean
    (e.g. `stacked`, computed from `shouldStackRows(effectiveOctaves, measuredWidth ??
    0)` when `measuredWidth` is defined, else `false` to match the component's existing
    "unmeasurable -> desktop-safe default" convention). When `stacked` is true, iterate
    `splitBoardIntoRows(effectiveOctaves)` and render one `.piano-keyboard__board` per
    row inside a `.piano-keyboard__rows` wrapper (`display: flex; flex-direction:
    column; gap: var(--spacing-sm)` — reuse the existing `--spacing-sm` token, matching
    ShellVoicingDrill's own spacing-token usage), computing each row's own
    `whiteKeyWidthPct`/`blackKeyWidthPct`/`leftPct` locally from that row's
    `whiteLetters.length`, and looking up `note`/interactive state for each rendered key
    via the row's absolute white/black index offset (row 2 offsets its local index by
    `firstRowWhiteCount` before calling the existing `noteAtWhiteIndex`/
    `octaveForWhiteIndex`/etc. helpers — do not change those helpers' signatures, only
    the index passed in). Keep every existing class-name helper
    (`roleClass`/`selectedClass`/`wrongClass`/`stampedClass`/`pressedClass`/
    `flashWrongClass`/`pulseClass`/`pendingClass`/`ghostClass`/`bassHintClass`) called
    exactly as today per key, so all existing highlight/feedback behavior (chord-tone
    fills, wrong ✕ marks, selected hatch, ghost hints, bass ring) is visually intact on
    both rows. Add a `.piano-keyboard__rows` CSS rule and adjust `.piano-keyboard__board`
    height rules only as needed so two stacked 160px-tall boards do not overflow their
    parent awkwardly (reuse the existing 160px `.piano-keyboard__board` height per row).
  </action>
  <verify>
    <automated>npm test -- --run pianoKeyboard</automated>
  </verify>
  <done>At a measured width below each span's `fitsWithoutScrolling` floor, PianoKeyboard
  renders two `.piano-keyboard__board` elements (one per row) with the correct
  white/black key counts (7+5 then up to 8+5) and correct highlight/wrong/ghost/selected
  classes preserved per key; at/above the floor (including the `octaves` prop test seam
  used by existing jsdom tests, which have no ResizeObserver and default to 2 octaves
  unstacked) rendering is unchanged from before this task.</done>
</task>

<task type="auto">
  <name>Task 3: Fix ShellVoicingDrill's clipped compare-card header and rigid 2-col grid</name>
  <files>src/lib/components/ShellVoicingDrill.svelte, tests/e2e/tap-targets.spec.ts</files>
  <action>
    Two coordinated CSS fixes in ShellVoicingDrill.svelte's `<style>` block, both
    mobile-first (narrow-screen rule is the default; the existing app-wide
    `639.98px`-class breakpoint is the enhancement — match src/app.css's own
    `@media (max-width: 639.98px)` convention exactly, inverted as a min-width
    equivalent so mobile stays the base case per the phase's mobile-first
    instruction):
    1. `.vcards` — change the unconditional `grid-template-columns: repeat(2, 1fr)` to
       a single-column default (`grid-template-columns: 1fr`), then apply
       `repeat(2, 1fr)` only inside `@media (min-width: 640px)`. This gives each
       `.vcard` (and the `PianoKeyboard` inside it) the full card width on phone,
       matching this component's own documented "compare card... stacked" intent
       (contextual-learning-metacognition.md) instead of squeezing it to a half-column.
    2. `.vcard__head` — the header row clips because its right-aligned
       `.vcard__use` caption span has no wrap allowance inside the
       `justify-content: space-between` flex row. Change `.vcard__head` to allow
       wrapping (`flex-wrap: wrap`) and give `.vcard__label`/`.vcard__use` each
       `min-width: 0` so long text wraps onto its own line within the card instead of
       being pushed off the right edge; keep `.vcard__use`'s `text-align: right` only
       at the wider breakpoint if needed for visual balance, but the phone-default
       behavior must be "wraps and stays fully visible," never "clips."
    Do not change `voicings.compare.knowLabel` / `knowCaption` copy (i18n text), the
    `vcard`/`vcard__head`/`vcard__label`/`vcard__use` class names, or any non-CSS
    markup — this is a layout-only fix.
    Update tests/e2e/tap-targets.spec.ts's keyboard describe block: the "octave count
    matches the available width" test's assumption (`whites.length` is always 8 or 15)
    still holds per-row-summed (two rows together still total 8 or 15 white keys /
    5 or 10 black keys — same assertion, no change needed there). The
    "a keyboard wider than its container never makes the page scroll sideways" test's
    rationale comment (currently describing "the keyboard may scroll inside itself to
    hold the floor") must be corrected to describe two-row stacking as the mechanism
    now, and add one new assertion for the `PHONE_NARROW` (320px) and `PHONE` (375px)
    cases specifically: `page.locator('.piano-keyboard__rows')` is present (stacked)
    while `page.locator('.piano-keyboard').first()` itself never needs horizontal
    scroll (`scrollWidth <= clientWidth` on the `.piano-keyboard` element, not just the
    document), replacing the old "boards may scroll" assumption. Leave the `DESKTOP`
    and `PHONE_LANDSCAPE` cases' expectations as unstacked (single row) per Task 2's
    unstacked-at-desktop-width guarantee.
  </action>
  <verify>
    <automated>npm run test:e2e -- tap-targets</automated>
  </verify>
  <done>On a 390px-class phone viewport, opening the voicing drill's "meet" stage shows
  both compare cards stacked in one column with fully visible, non-clipped headers, and
  `tests/e2e/tap-targets.spec.ts` passes with assertions that reflect two-row stacking
  (not horizontal scroll) as the narrow-width answer.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None crossed | Pure client-side rendering/layout fix; no new user input, network call, or persisted data path is introduced. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|------------|----------|-------------|------------------|
| T-260729-01 | Denial of Service (self) | PianoKeyboard.svelte row-split render | low | accept | Row split is a pure, bounded (max 15 white + 10 black keys total, split 2 ways) synchronous computation triggered by the existing ResizeObserver path already in production; no new unbounded loop or recursive structure is introduced. |

</threat_model>

<verification>
Run the full unit suite and the affected e2e spec to confirm no regressions:
- `npm test` (full Vitest suite — confirms keyboardLayout.test.ts, all PianoKeyboard-*
  test files, and ShellVoicingDrill's shellVoicingDrill.test.ts / embed test stay green)
- `npm run test:e2e -- tap-targets` (confirms phone/narrow/landscape/desktop keyboard
  geometry assertions pass under the new stacking behavior)
- `npm run check` (svelte-check clean — no type errors from the new row-split types)
</verification>

<success_criteria>
- `keyboardLayout.ts` exports `shouldStackRows`, `firstRowWhiteCount`,
  `splitBoardIntoRows`, covered by passing unit tests.
- `PianoKeyboard.svelte` renders two stacked, independently-correct mini-keyboards
  whenever the measured container width falls under the existing per-span fingertip
  floor, with all existing highlight/feedback classes intact per key; unchanged
  (single row) above that floor.
- `ShellVoicingDrill.svelte`'s `.vcards` stacks to one column by default and its
  `.vcard__head` header text wraps instead of clipping, both by default (mobile-first)
  and enhanced at the existing `640px`-class breakpoint.
- `npm test`, `npm run test:e2e -- tap-targets`, and `npm run check` all pass.
</success_criteria>

<output>
Create `.planning/quick/260729-ert-fix-mobile-broken-voicing-card-wrap-pian/260729-ert-SUMMARY.md` when done.
</output>
