---
phase: 38-midi-connection-progressive-enhancement
plan: 03
subsystem: ui
tags: [svelte5, i18n, midi, web-midi-api, masthead, self-hiding-chrome]

requires:
  - phase: 38-midi-connection-progressive-enhancement (plan 02)
    provides: "src/lib/midi/midi.svelte.ts: midiState(), connectMidi(), initMidi(), MidiConnectionState"
provides:
  - "src/lib/components/MidiStatus.svelte: the masthead MIDI chip - self-hides on unsupported, is the app's only connect affordance, renders the seven visible connection states with clamped/escaped device-name display"
  - "src/lib/i18n/messages/chrome.ts: the eight midi.status.* keys (en/fr)"
  - "+layout.svelte: MidiStatus mounted in the masthead, initMidi() called once from onMount"
affects: [38-04, 39-play-to-answer]

tech-stack:
  added: []
  patterns:
    - "Self-hiding chrome pattern applied a second time (after StreakBadge): a single {#if state.kind !== 'unsupported'} wrapping the entire component body, contributing zero DOM nodes at the excluded state, satisfying MIDI-04 by construction"
    - "Component-level guard mirroring the module's own re-entrancy guard: handleClick() checks isEnabling before calling connectMidi(), belt-and-braces alongside the disabled attribute, since a synthetic/programmatic click is not guaranteed to be suppressed by every runtime the way a real user click on a disabled control is"

key-files:
  created:
    - src/lib/components/MidiStatus.svelte
    - src/lib/components/midiStatus.test.ts
  modified:
    - src/lib/i18n/messages/chrome.ts
    - src/routes/+layout.svelte
    - tests/masthead.e2e.test.ts

key-decisions:
  - "handleClick() re-checks isEnabling before calling connectMidi(), in addition to the button's disabled attribute - a jsdom fireEvent.click on a disabled native <button> still invokes the click listener (confirmed empirically during Task 1), so relying on the disabled attribute alone would let the re-entrancy test pass only by accident of a real browser's suppression behavior, not by anything this component actually guarantees"
  - "The self-hide test asserts container.querySelectorAll('*').length === 0 rather than an innerHTML string equality, since Svelte 5's {#if} block leaves its own anchor (an HTML comment node) in the DOM even when the branch is false - a comment node is not a wrapper element, placeholder, or skeleton, so the invariant the plan cares about (no MIDI chrome, no MIDI-shaped element) is intact"

requirements-completed: [MIDI-01, MIDI-04]

coverage:
  - id: D1
    description: "MidiStatus.svelte self-hides entirely at the unsupported state (no wrapper element, no placeholder), satisfying MIDI-04 by construction"
    requirement: MIDI-04
    verification:
      - kind: unit
        ref: "src/lib/components/midiStatus.test.ts#MidiStatus self-hiding (MIDI-04) > renders nothing at the default unsupported state"
        status: pass
      - kind: e2e
        ref: "tests/masthead.e2e.test.ts#MidiStatus renders no MIDI chrome on a Web-MIDI-unsupported browser (MIDI-04)"
        status: pass
      - kind: other
        ref: "grep -rl \"midi-status\" build --include='*.html' | wc -l -> 0 (adapter-static prerendered output)"
        status: pass
    human_judgment: false
  - id: D2
    description: "MidiStatus renders the exact English and French copy for all seven visible connection states, with data-midi-state carrying the state kind"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/components/midiStatus.test.ts#MidiStatus per-state English copy (7 cases) and #MidiStatus French copy (2 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "connected renders a non-interactive <span>; every other visible state renders a <button>, disabled while enabling; clicking idle calls connectMidi exactly once, clicking the disabled enabling button calls it zero more times"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/components/midiStatus.test.ts#MidiStatus element kind and interactivity"
        status: pass
    human_judgment: false
  - id: D4
    description: "Device-name display clamps to 24 characters, falls back to a readable placeholder for empty/whitespace-only names, and never reaches the DOM as markup (no {@html}, script-tag-shaped input renders as text with no script element)"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "src/lib/components/midiStatus.test.ts#MidiStatus device-name handling and #MidiStatus escaping (threat T-38-09)"
        status: pass
      - kind: other
        ref: "grep -c '{@html' src/lib/components/MidiStatus.svelte -> 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "+layout.svelte mounts <MidiStatus /> in the masthead's left flex row (no hidden wrapper) and calls initMidi() once from onMount, importing only initMidi from midi.svelte (never a gesture-gated function) so no app-start path can request MIDI access"
    requirement: MIDI-01
    verification:
      - kind: e2e
        ref: "tests/masthead.e2e.test.ts and tests/nav-badges.e2e.test.ts (full suite green, unedited except the one added test)"
        status: pass
      - kind: other
        ref: "grep -cF \"from '\\$lib/midi/midi.svelte'\" src/routes/+layout.svelte -> 1, importing initMidi only"
        status: pass
    human_judgment: false
  - id: D6
    description: "The full pre-existing Vitest suite stays green and unedited (only additions to tests/masthead.e2e.test.ts); npm run check and npm run build (adapter-static strict prerender) both succeed"
    requirement: MIDI-01
    verification:
      - kind: unit
        ref: "npm test -> 151 files, 2608 tests passed"
        status: pass
      - kind: other
        ref: "npm run check -> 0 errors, 0 warnings; npm run build -> succeeded"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-08-04
status: complete
---

# Phase 38 Plan 03: MidiStatus Masthead Chip Summary

**Self-hiding masthead MIDI chip (`MidiStatus.svelte`) that both displays the live connection state from Plan 02's reactive module and is the app's sole gesture-gated connect affordance, wired into `+layout.svelte` with its eight `midi.status.*` English/French message keys**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-04T20:16:00+02:00
- **Completed:** 2026-08-04T22:30:32+02:00
- **Tasks:** 2 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Built `MidiStatus.svelte`: a single `{#if state.kind !== 'unsupported'}` wraps the entire component, so a browser without Web MIDI contributes zero DOM nodes, mechanically satisfying MIDI-04 the same way `StreakBadge.svelte` self-hides at a zero streak
- The seven visible states each render exact, colon-punctuated English and French copy via eight new `midi.status.*` keys in `chrome.ts`, all i18n gates green (parity, coverage, dead-key scan, no-em-dash)
- `connected` renders a non-interactive `<span>`; every other state renders a `<button>` (disabled while `enabling`), and the click handler both relies on `disabled` and re-checks `isEnabling` itself, so the re-entrancy guarantee holds even under jsdom's more permissive synthetic-click behavior
- Device-name handling: trimmed, clamped to 24 characters (a layout guard against a verbose/rogue USB descriptor), falls back to a translated placeholder when empty or whitespace-only, and reaches the DOM only through Svelte's default auto-escaping interpolation (`grep -c '{@html'` returns `0`; a script-tag-shaped device name renders as text with no `<script>` element materializing, closing threat T-38-09)
- `+layout.svelte` mounts `<MidiStatus />` beside `StreakBadge` in the masthead's left flex row (visible at every viewport width, no `hidden sm:block` wrapper) and calls `initMidi()` once from `onMount` right after `registerUpdateWatcher()`; the file imports exactly one symbol (`initMidi`) from `$lib/midi/midi.svelte`, so no app-start path can request MIDI access
- Full regression proof: 151 test files / 2608 tests green (only one test added, to `tests/masthead.e2e.test.ts`, with zero edits to any pre-existing test body), `npm run check` clean, `npm run build` succeeds, and the adapter-static prerendered HTML contains no `midi-status` markup anywhere

## Task Commits

Each task was committed atomically:

1. **Task 1: MidiStatus component with its English and French copy** - `10308a6` (feat)
2. **Task 2: Mount MidiStatus in the masthead and initialize the state on app start** - `197d464` (feat)

_Note: both tasks are task-level `tdd="true"`/plain `auto` (Task 1 writes the full behavior block, then implements, then commits once green) - not a plan-level TDD gate, matching plans 38-01/38-02's precedent._

## Files Created/Modified
- `src/lib/components/MidiStatus.svelte` - the masthead MIDI chip: `statusKey()` switch, `displayName()` trim/fallback/clamp, `label()` substitution, self-hiding `{#if}`, span/button branching, scoped styles
- `src/lib/components/midiStatus.test.ts` - 23 Vitest cases covering self-hide, all seven states' EN copy + `data-midi-state`, element kind/interactivity (including the disabled-button re-entrancy case), device-name clamp/fallback, script-tag escaping, and French copy for idle/no-device/disconnected/connected/empty-name
- `src/lib/i18n/messages/chrome.ts` - eight `midi.status.*` keys added to both `en` and `fr`, plus a header-comment paragraph documenting the group
- `src/routes/+layout.svelte` - added the `MidiStatus`/`initMidi` imports, the `initMidi();` call in `onMount`, and the `<MidiStatus />` mount point (net +7 lines)
- `tests/masthead.e2e.test.ts` - one added test asserting no `midi-status` element renders when the root layout mounts in jsdom (a faithful Safari/iOS stand-in, since jsdom has no `navigator.requestMIDIAccess`)

## Decisions Made
- `handleClick()` re-checks `isEnabling` before calling `connectMidi()`, in addition to the button's `disabled` attribute - discovered during Task 1 that jsdom's `fireEvent.click` still invokes the click listener on a `disabled` native `<button>` (unlike a real user click, which browsers suppress before dispatch), so the component needed its own explicit guard rather than relying on `disabled` alone to make the "clicking the disabled button calls connectMidi zero more times" acceptance criterion actually true rather than accidentally true
- The self-hide test asserts `container.querySelectorAll('*').length === 0` rather than an `innerHTML` string equality, since Svelte 5's `{#if}` block always leaves its own anchor (an HTML comment node) in the DOM even when the branch is false; a comment node is not a wrapper element, placeholder, or skeleton, so it does not violate the "no MIDI chrome at all" invariant the plan actually cares about
- `statusKey()`'s switch includes `case 'unsupported':` falling through to the same default (`midi.status.error`) as an unreachable defensive arm, mirroring `MicCheckPanel.svelte`'s `unavailableCopyKey` shape exactly (a `default` arm present even though the `{#if}` guard means `unsupported` never actually reaches this function)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Disabled-button re-entrancy guard needed at the component level, not just the `disabled` attribute**
- **Found during:** Task 1, writing the "clicking the disabled enabling button calls connectMidi zero more times" test
- **Issue:** The plan's action block only specified `disabled={state.kind === 'enabling'}` on the button with no additional click guard, on the (reasonable, but jsdom-incorrect) assumption that a disabled native button suppresses a dispatched click event the same way it suppresses a real user click. Running the test showed `fireEvent.click` on the disabled button still invoked the `onclick` handler and called the mocked `connectMidi` once.
- **Fix:** Added `isEnabling` as a derived value and a small `handleClick()` wrapper that re-checks it before calling `connectMidi()`, used for both the `disabled` attribute and the `onclick` handler.
- **Files modified:** `src/lib/components/MidiStatus.svelte`
- **Verification:** `npx vitest run src/lib/components/midiStatus.test.ts` - the re-entrancy test passes deterministically now, independent of the test runtime's click-dispatch behavior on disabled elements.
- **Committed in:** `10308a6` (part of Task 1's commit)

**2. [Rule 1 - Bug] Self-hide test needed a DOM-shape assertion, not an innerHTML string comparison**
- **Found during:** Task 1, writing the "renders nothing at the default unsupported state" test
- **Issue:** The plan's behavior block describes the container's `innerHTML` as "empty apart from whitespace." Svelte 5 compiles every `{#if}` block to include its own anchor comment node in the DOM regardless of which branch is active, so a strict `container.innerHTML.trim() === ''` assertion failed even though the component correctly renders no element.
- **Fix:** Changed the assertion to `container.querySelectorAll('*').length === 0`, which proves the actual invariant (no wrapper element, no placeholder, no skeleton) without depending on Svelte's internal anchor-comment implementation detail.
- **Files modified:** `src/lib/components/midiStatus.test.ts`
- **Verification:** `npx vitest run src/lib/components/midiStatus.test.ts` passes; `queryByTestId('midi-status')` being `null` is still asserted directly alongside it.
- **Committed in:** `10308a6` (part of Task 1's commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs found while writing the plan's own specified tests, both scoped entirely inside the two new files this task creates).
**Impact on plan:** Both fixes are necessary for the stated acceptance criteria to hold for real reasons rather than by test-runtime coincidence. No scope creep; no architectural change; no file outside the plan's `files_modified` list was touched.

## Issues Encountered
- `grep -n "from '\$lib/midi/midi.svelte'" src/routes/+layout.svelte` (the acceptance criterion's literal command) returns no match under this environment's grep (macOS BSD grep, basic regex mode) - the same `\$` mid-pattern quirk already documented in `38-02-SUMMARY.md`. Confirmed with `grep -nF "from '\$lib/midi/midi.svelte'" src/routes/+layout.svelte` (fixed-string mode) and independently with `perl`, both of which find exactly one match, importing exactly `initMidi` and nothing else. The underlying invariant holds; only the literal shell-quoting of the plan's verification command is affected by a pre-existing grep quirk on this platform.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`MidiStatus.svelte` is live in the masthead and self-hides correctly. Plan 38-04 (or later phases) can build on `connectMidi()`/`midiState()` unchanged; Phase 39's note-stream work still resolves through `connectedDeviceId()` (Plan 38-02) plus `activeInput()` (Plan 38-01), neither of which this plan touched. No blockers.

---
*Phase: 38-midi-connection-progressive-enhancement*
*Completed: 2026-08-04*

## Self-Check: PASSED

All created files (`src/lib/components/MidiStatus.svelte`, `src/lib/components/midiStatus.test.ts`, this SUMMARY.md) and commit hashes (`10308a6`, `197d464`) verified present on disk / in git history.
