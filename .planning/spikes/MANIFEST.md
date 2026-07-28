# Spike Manifest — Overnight v2 Learning Upgrade

## Idea

Upgrade Music Learn from v1 chord-lookup/drill app to a deeper learning companion: sampled piano sound everywhere (key touch, answer reveal), intervals integrated across the app plus a dedicated interval drill, hybrid level gating (few easy chords first, unlock tiers on proven accuracy with manual override), song-based practice (song builder + presets, starting with the user's Autumn Leaves arrangement), improved theory content, and tasteful mnemonics only where genuinely good.

Executed as an autonomous overnight multi-agent run: parallel research, architect-defined contracts, parallel builders in dedicated worktrees with TDD, architect merge + browser/responsive verification.

## Requirements (locked by user, 2026-07-14)

- Song practice: **song builder + presets**. User creates named songs by typing chord symbols from their sheet (matches their arrangement's key). One-tap preset for common standards including Autumn Leaves changes. Drills weight song chords first.
- Levels: **hybrid gating**. App suggests unlocking the next tier when accuracy proves mastery; user confirms. Manual override in settings. Tiers progress from triads to maj7/m7/dom7 to ø7/°7 to alterations.
- Sound: **sampled real piano** (@tonejs/piano, Salamander samples), lazy-loaded, synth fallback while loading. Key touches make sound (pedagogical, esp. scale selection). Answer reveal ALWAYS plays the chord sound.
- Intervals: **everywhere + drill**. Interval labels/colors surfaced in lookup, drills, scales (tap a key: hear it + see interval from root). Plus dedicated interval recognition drill.
- Mnemonics: only where genuinely good. Better none than cheesy. Quality gate required.
- No em dashes in any app copy (existing project rule).
- TDD: tests written first. Browser verification (looks right, responsive) required before done.
- MIDI (phase 4) explicitly out of scope for this run: needs hardware present.

## Spikes / Tracks

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | research-fanout | research | Parallel research: codebase map, sampled audio, learning science, intervals pedagogy, song presets, improvement exploration | VALIDATED | research |
| 002 | audio-engine | build | Sampled piano + key-touch + answer-reveal sound works in SvelteKit static app, iOS-safe | VALIDATED | audio |
| 003 | levels-and-songs | build | Hybrid level gating + song builder/preset weighting works end to end | VALIDATED | learning |
| 004 | intervals | build | Interval labels everywhere + interval drill + /scales explorer + server migration | VALIDATED | theory |
| 005 | theory-content | build | Improved theory content + quality-gated mnemonics | VALIDATED | content |

## Session 2: Pedagogy / Memorization Upgrade (2026-07-14 evening)

User feedback: the /scales Practice tab is confusing; wants either a real piano keyboard to play the scale on, or scales folded into the drill engine. Broader mandate: focus hard on the pedagogical aspect so the brain actually memorizes the theory. Run several agents.

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 006 | srs-recall-loop | build | FSRS-scheduled daily recall of theory facts (chord formulas, intervals, scale degrees) surfaces due-today cards and beats rote for retention | VALIDATED | learning, srs |
| 007 | construct-not-memorize | build | Build chord/scale note-by-note from the formula (stack thirds / step pattern) on a keyboard, teaching derivation instead of rote note lists | VALIDATED | learning, theory |
| 008 | scale-keyboard-drill | build | Play a scale ascending/descending on a real movable keyboard, graded like a drill (the concrete /scales complaint) | VALIDATED | scales, drills |
| 009 | recall-modes | build | One fact drilled across modes (see symbol->play, hear->name, degree->build); multi-modal encoding strengthens memory vs single-direction | VALIDATED | learning, memory |

### Requirements emerged (locked by spiking, 2026-07-14 evening)

- **Grade notes by chroma/MIDI, never by letter string.** Enharmonic-blind matching is mandatory (Bb vs A#, Gb major's Cb, Cdim7's Bdoubleflat on the white A key). Render tonal's own spelling for the chord/scale, but compare pitch classes. (006/007/008 all independently hit this.)
- **SRS card unit = (fact, mode), not fact.** Cm7|see-play, Cm7|hear-name, Cm7|formula-build are separate FSRS cards sharing a fact. Multi-modal thesis (009) IS the card model.
- **FSRS config: `enable_short_term: false`.** Default true gives ~10min learning steps and breaks any day-scale daily-review app. Use day-scale intervals. Rehydrate Date fields after JSON/storage round-trip (they silently become strings).
- **Scales stay a DEDICATED drill, NOT folded into the one-shot DrillQuestion union.** A scale is an ordered multi-tap sequence. Reuse drill chrome (prompt, pass state, FSRS hook), extend scaleDrill.ts (letters -> {chroma, midi, degree}, add octave degree 8 + descending). Movable tonic-anchored one-octave window solves the non-C span problem. Replace the confusing ladder, do not offer a keyboard-vs-ladder toggle.
- **Construction ("Build it") mode teaches WHY.** Phrase steps as consecutive intervals (stack m3/M3 for chords, W/H for scales) using Interval.distance between adjacent notes, not root-relative intervals. Enharmonic collision is a teaching moment, not a bug. Needs 2 octaves (phone needs scroll/compress). Place upstream of recall drilling (on-ramp).
- **Mode B (name-chord-by-ear) must be multiple-choice against the canonical symbol** (Chord.detect leaks inversions/enharmonics), same-root distractors, lowest rotation weight, never gates progress.
- Persistence: local-first (localStorage -> Dexie/IndexedDB as review log grows). Per-device for v1, no server needed. No em dashes in copy (existing rule, honored).

## Results (2026-07-14)

All five tracks built TDD in isolated worktrees, merged to main: 694 app tests + 40 server tests green, svelte-check clean, adapter-static build clean, browser-verified at desktop and 375px (two fixes landed from that pass: lookup autofocus preventScroll, masthead wrap).

Key findings:
- @tonejs/piano is dead (pins tone@14); Tone.Sampler + self-hosted Salamander mp3s (30 files, ~2 MB, CC-BY) is the working approach. lookAhead=0 kills the default 100 ms latency.
- Interval colors ride the extended IntervalRole (root|second|third|fourth|fifth|sixth|seventh); 2nd/4th/6th tokens are slate/plum/olive.
- Tier gating: 6 tiers, unlock at 85% over last 30 tier answers + 40 lifetime + per-quality floors + 2 distinct days; assisted answers excluded. Client rolling window lives in a bounded localStorage log until a server unlock endpoint exists.
- Song weighting: 60/25/15 song/tier/review, 35% per-item cap; above-tier song chords scaffold (2 formula-first exposures, hints, graduate after 5 cold correct).
- Mnemonics shipped for maj7/7/m7/m7b5/dim7 only; triads deliberately return null (quality bar).
- Server schema v1 migration (kind 'interval', duration_ms, given) ships in repo; production redeploy is a user UAT item. Client degrades gracefully against the old server.

## Session 3: Microphone input feasibility (2026-07-29)

Web MIDI is dead for this user (no Safari/iOS support, and nowhere to put a laptop near the piano). A phone can sit on the music desk. Question: can the phone mic verify that he played the right notes?

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 025 | mic-chord-detection | feasibility | Chromagram detector verifies the expected chroma set from phone-mic audio, measured on the repo's real Salamander samples, clean and degraded | GO WITH LIMITS | input, audio, mic, drills |

### Requirements emerged (locked by spiking, 2026-07-29)

- **Mic input is a VERIFIER, not an input device.** It cannot independently produce a chroma set, so it does not slot into `matchChord.ts` as a note-set producer. The seam is `verifyTargetChroma(target: Set<number>)` sitting beside `matchChord`, not feeding it. Grading stays chroma-only (D-01/D-02 preserved).
- **App audio MUST be gated while listening.** With the app playing the answer through the speaker and the user playing nothing, the detector accepts 97.2% of the time: the app grades itself. Browser echo cancellation cannot be used, because it has to be off for the piano to survive.
- **The perfect fifth cannot be verified present-or-absent.** It is the root's own 3rd partial, so a shell voicing that omits the fifth still shows a fifth. A dropped fifth goes unnoticed 25% to 75% of the time. An EXTRA fifth is always caught (0.0%).
- **Inversions stay keyboard-only.** Bass chroma is 88.5% accurate degraded, and end-to-end inversion grading is 73.4% true accept. Not a grader.
- **Usable register is roughly C2 to B3 for chord roots**, degrading above middle C, useless above G5, because the harmonic sum needs about three octaves of headroom below the anti-alias ceiling.
- **Latency floor is 464 ms and is not tunable**: distinguishing G from Gb at C3 (7.8 Hz apart) needs a third of a second of signal. Fine for hold-a-chord, unusable for anything rhythmic.
- Sustain pedal down costs recall, never precision: correct answers drop to 44.4% while the previous chord never false-accepts. The drill has to tell him to lift the pedal.
