---
phase: quick-260816-w4h
plan: 01
subsystem: ui
tags: [improvisation, chord-scale, audio, i18n, pedagogy]

requires:
  - phase: PR #74
    provides: chord-scale engine (src/lib/theory/chordScale.ts) and the ImproviseGuide panel on the Lookup result card
provides:
  - "chordScale: a careful note now reports WHICH chord tone it rubs (clashesWith, clashesWithLabel, clashesWithRole) and, where honest, a context where the same note is idiomatic (fineOn)"
  - "chordScale: a major-family guide reports the chord's own major 7th (blueNoteHeldSeventh) so the blue-note claim can be qualified over a maj7"
  - "audio: playNotesOverChord / stopChordDemo / chordDemoActive, a cancellable held-chord-plus-note demo on the existing engine"
  - "voicing: toMelodyPitch, the register that puts an improvised note above a voiced chord"
  - "ImproviseGuide: colour and careful split into two explained sections, per-note listen buttons, an A/B on every careful note, a blue-note row, and chord-under-the-key on every keyboard tap"
affects: [improvisation-guide, audio-engine, lookup-page]

tech-stack:
  added: []
  patterns:
    - "Explanation selected by the COLLIDING DEGREE (root/third/fifth, else an interval-naming fallback), so one rule in the engine yields specific copy per note without a chord/note lookup table"
    - "Demo cancellation via a generation token plus a released-pitch list, mirroring startCompLoop's loopToken: the guard is what makes a seconds-long playback safe to click repeatedly"

key-files:
  created: []
  modified:
    - src/lib/theory/chordScale.ts
    - src/lib/theory/chordScale.test.ts
    - src/lib/components/ImproviseGuide.svelte
    - src/lib/components/improviseGuide.test.ts
    - src/lib/i18n/messages/improvise.ts
    - src/lib/audio/audio.ts
    - src/lib/audio/audio.test.ts
    - src/lib/audio/voicing.ts
    - src/lib/audio/voicing.test.ts
    - tests/lookup.e2e.test.ts

key-decisions:
  - "D-01: per-colliding-degree copy, never one sentence for every avoid note. The classic F/Cmaj7 case names E, calls it the 3rd that says major or minor, and names the minor 9th."
  - "D-02: the A/B plays the chord tone then the half step above it, which is the exact claim the copy makes."
  - "D-03: a keyboard tap plays the chord only, because PianoKeyboard's inspect mode already sounds the tapped key (playing it again would double it)."
  - "D-04: no 'seventh' variant of the careful copy. The note a half step above any 7th is the root, always a chord tone, so that sentence could never be read."
  - "D-05: the blue note is a row in the panel body, not only a concepts paragraph, because it answers a question the captain asked in front of the keyboard."

constraints-honoured:
  - ".planning/design/improvisation.md section 5.2/5.3: reference only. No FactKind, no Mode, no Dexie version, no FSRS, no drill grammar, no counter, no streak."
  - "Four interval colours app-wide: the careful side reuses vermilion (the existing 'pay attention' accent), no fifth colour and no new CSS custom property."
  - "One audio engine: the demo is a function in $lib/audio/audio using the same sampler, sample load, no-throw contract and sound toggle. No new dependency, no second sound path, no MIDI."
  - "No em dashes in user-facing copy (noEmDashes.test.ts); i18n domain already registered in the four required places."

verification:
  - "npx vitest run: 154 files, 2743 tests, green (no unhandled errors)."
  - "npm run check: 1487 files, 0 errors, 0 warnings."
  - "Browser (dev server, Chrome, fr locale, 390x844 mobile emulation): panel renders the two sections, the vermilion careful row with its three lines, and the blue-note row; no horizontal overflow; no console errors."
  - "Audio verified by counting AudioBufferSourceNode.start calls in the live page: an A/B click fires 10 (two steps of 4 chord tones + 1 melody note), a keyboard tap fires 5 (chord + the key's own note, not doubled), and 12 clicks in a tight loop fire 5 total, so rapid clicking swaps the sound instead of stacking it."

follow-ups:
  - "The same chord-plus-note demo would suit the comping loop's scale overlay (design doc 5.2) if that is ever built; nothing here assumes the Lookup page."
