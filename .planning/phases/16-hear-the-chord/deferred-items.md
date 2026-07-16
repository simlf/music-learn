# Deferred Items — Phase 16 (Hear the Chord)

Out-of-scope discoveries logged during plan execution, per the executor's
scope-boundary rule (only auto-fix issues directly caused by the current
task's changes; log everything else here instead of fixing it).

## 1. `assignNotesToKeys` (keyboardLayout.ts) can collapse a scale's octave-up
   tonic onto the SAME physical key as the low tonic

**Found during:** 16-08, Task 3 (writing the G-major duplicate-tonic
BuildSession test).

**File:** `src/lib/components/keyboardLayout.ts` — NOT one of 16-08's
authorized files (`BuildSession.svelte`, `PianoKeyboard.svelte`, and their
two test files only). Left unmodified per the scope boundary.

**Issue:** `assignNotesToKeys`'s ascending cursor advances using a single
shared "position" integer space for both white-key `index` and black-key
`afterWhiteIndex + 1`. For G major specifically, the seventh degree (F♯) is
assigned to the SECOND octave's black key at `afterWhiteIndex: 10`, giving
`position: 11` — which numerically collides with the SECOND G white key's own
`index: 11`. The cursor then advances to `12`, so when the octave-up tonic G
note is placed, no G candidate exists at `position >= 12` and the note
wrap-arounds to the LOWEST-position G candidate — `index: 4`, the SAME
physical key already holding the root G. The two notes silently collapse onto
one physical key; `noteAtWhiteIndex(11)` finds no assignment there, so the
second G key never renders ANY interval-role class at all (confirmed via a
direct `render(PianoKeyboard, ...)` probe: `rootCount === 1` for a G-major
`earnedNotes` list on a 2-octave keyboard, vs `rootCount === 2` for F major,
whose degrees don't hit this collision).

**Impact:** For chromatic tonics whose diatonic 7th degree's black-key
"position" numerically coincides with the octave-up tonic's white-key index
(G major is the confirmed case; other tonics may share the pattern — not
exhaustively checked), the study-mode roll's octave-aware pending model
(this plan's fix) has nothing to independently dim for the octave-up tonic,
because that key never gets a role in the first place. The 16-08 fix
(pendingKeys keyed by `{ letter, octave }`) is still correct and necessary —
it's what makes duplicate-tonic scales that DON'T hit this collision (e.g. F
major, confirmed working in `buildSession.test.ts`) behave correctly. This is
a narrower, separate defect in the note-to-key assignment layer, not in the
pending/audio-sync logic this plan touches.

**Workaround used:** 16-08's BuildSession-level duplicate-tonic test uses F
major instead of G major, since F major's scale degrees don't collide (root F
assigned to index 3, octave-up F cleanly assigned to index 10, no shared
"position" ambiguity with the black-key fourth degree B♭). This preserves the
same test intent (proving `{ letter, octave }`-keyed pending independence)
without depending on the unrelated `keyboardLayout.ts` defect.

**Suggested fix (future plan):** Give white-key and black-key candidates
disjoint position numbering (e.g. multiply white index by 2, black
`afterWhiteIndex*2+1`) so a black key's "position" can never numerically
equal an unrelated white key's index, or track the assignment cursor
per-kind. Should ship with a `keyboardLayout.test.ts` case asserting G major
(and any other affected tonic) assigns its octave-up tonic to a distinct
physical key on a 2-octave keyboard.

**Severity:** Low-to-medium — cosmetic/pedagogical (a scale's octave-up tonic
key doesn't visually distinguish itself from the root during BUILD-mode
completion for the affected tonics), not a correctness or security issue.
No user-facing regression from before this plan (the bug predates 16-08).
