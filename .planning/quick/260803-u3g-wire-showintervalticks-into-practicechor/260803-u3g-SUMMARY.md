---
phase: quick-260803-u3g
plan: 01
status: complete
subsystem: ui
tags: [piano-keyboard, intervals, practice-drill, testing]

requires:
  - "PianoKeyboard's showIntervalTicks prop (commit 471d32a, PR #66)"
provides:
  - "PracticeChordDrill's three PianoKeyboard reveal keyboards (formula, see-play, hear-name) now render the semitone tick rail alongside the interval badges"
affects: [practice-hub-chord-drill]

tech-stack:
  added: []
  patterns:
    - "showIntervalTicks gated identically to the neighbouring showIntervalBadges prop at every call site (answered-gated for formula/see-play, bare for hear-name's post-answer-only block)"

key-files:
  created: []
  modified:
    - src/lib/components/PracticeChordDrill.svelte
    - src/lib/components/PracticeChordDrill.test.ts

decisions:
  - "The container-wide middot regression sweep (PracticeChordDrill.test.ts, 'removes the old grey mono shape line' test) was narrowed to scope over screen.getByTestId('chord-drill-feedback').textContent instead of the whole container, since the rail's own middot-joined gap labels ('m3 · 3') now legitimately render above the board and are not a descendant of the feedback region the sweep was written to guard."

metrics:
  duration: ~20min
  completed: 2026-08-03
---

## What shipped

| Commit | Change |
|--------|--------|
| 6b5a174 | `PracticeChordDrill.svelte`: `showIntervalTicks` added to all three `PianoKeyboard` call sites; `PracticeChordDrill.test.ts`: middot regression sweep narrowed to the feedback region |
| 13aa09a | `PracticeChordDrill.test.ts`: six new tests pinning rail absence pre-answer and rail presence (+ Cm7 gap-label content) post-answer across all three modes |

## Objective

Wire PianoKeyboard's already-shipped `showIntervalTicks` prop into PracticeChordDrill's three `PianoKeyboard` instances, gated on `answered` exactly the way the neighbouring `showIntervalBadges` prop already is — no changes to `PianoKeyboard.svelte`, `app.css`, or `chordPresentation.ts`.

## Wiring (per mode)

1. **`formula`**: `showIntervalTicks={answered}` added beside `showIntervalBadges={answered}`. Notes are visible from the start in this mode, but the rail names the distances between them (answer-adjacent), so it stays gated.
2. **`see-play`**: `showIntervalTicks={answered}` added beside `showIntervalBadges={answered}`. Belt-and-braces gate — `notes` is already `[]` pre-answer and PianoKeyboard self-suppresses the rail below two notes — kept explicit so the two teaching props read identically.
3. **`hear-name`**: bare `showIntervalTicks` added beside the bare `showIntervalBadges`. Unconditional is correct because the whole `{#if answered}` block wrapping this keyboard only mounts once the answer is in.

## Test coverage added

Six new assertions in a `describe('PracticeChordDrill: interval tick rail (showIntervalTicks)', ...)` block:

- formula: no `.piano-keyboard__rail` before answering (proves the gate, not just board absence, since the keyboard IS mounted showing notes)
- formula: rail present after tapping a choice, with gap labels `['m3 · 3', 'M3 · 4', 'm3 · 3']` for Cm7 — same fixture PianoKeyboard's own shipped tests pin
- see-play: no rail before Check
- see-play: rail present on the reveal keyboard after Check
- hear-name: no keyboard at all before answering (therefore no rail)
- hear-name: rail present once the post-answer keyboard mounts

## Deviations from Plan

None — plan executed exactly as written. The one pre-planned assertion repair (narrowing the middot sweep to `chord-drill-feedback`) was executed per the plan's explicit instruction, not an unplanned deviation.

## Verification

- `npx vitest run src/lib/components/PracticeChordDrill.test.ts`: 47/47 passing (41 pre-existing + 6 new).
- `grep -v '^\s*\*' src/lib/components/PracticeChordDrill.svelte | grep -c 'showIntervalTicks'` → 3.
- `git diff --name-only HEAD~2 HEAD` → only `PracticeChordDrill.svelte` and `PracticeChordDrill.test.ts`; `PianoKeyboard.svelte`, `app.css`, and `chordPresentation.ts` are untouched.
- Full `npx vitest run`: first run showed 1 failure (`practiceInversionsReg.test.ts`, a 5000ms test timeout under full-suite parallel load, with `Not implemented: navigation to another Document` jsdom noise). Re-ran the file in isolation — passed. Re-ran the full suite a second time — **148/148 test files, 2540/2540 tests passing**, confirming the first failure was pre-existing load flakiness unrelated to this change (neither modified file touches routing, navigation, or the inversions drill).

## Known Stubs

None.

## Threat Flags

None — no new network endpoint, auth path, file access pattern, or trust-boundary schema change. Matches the plan's own threat model: two boolean literals passed between two components already in the same client bundle.

## Self-Check: PASSED

- FOUND: src/lib/components/PracticeChordDrill.svelte
- FOUND: src/lib/components/PracticeChordDrill.test.ts
- FOUND: commit 6b5a174
- FOUND: commit 13aa09a
