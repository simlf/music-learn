---
status: in_progress
phase: 27-practice-hub
source: [27-VERIFICATION.md]
started: 2026-07-25T00:53:13Z
updated: 2026-07-25T12:00:00Z
---

## Current Test

number: 2
name: Responsive / animation at phone width
expected: |
  Play one full mixed session at phone width (~375px). Pre-start card,
  in-session register + family cue, and the session-end stamp-in animation
  render cleanly. No overflow/clip; missed chips wrap; register legible.
awaiting: user on-device check (user tested desktop width so far)

## Tests

### 1. Visual accent placement check
expected: Family-cue chip muted/ink never vermilion; vermilion only on Start + in-session primary buttons.
result: PASS (2026-07-25) — desktop screenshot confirmed: "VOICING" cue muted gray, vermilion only on "Vérifier"; "Pratique de gamme" is ghost/outline.

### 2. Responsive / animation check
expected: Phone-width session end-to-end renders cleanly incl. the stamp-in end-card.
result: [pending] — user tested at desktop width; phone-width + end-card animation not yet confirmed.

## Findings (voicing family in /practice) — fixed, pending on-device re-check

### F1. Voicing keys made no sound on tap
cause: ShellVoicingDrill never wired onPress; PianoKeyboard only plays on onPress.
fix: commit e8c9f43 — added pressKey (ensureAudioReady + playNote), mirrors PracticeIntervalDrill.
result: [needs on-device re-check] — jsdom cannot verify audio.

### F2. Ghost key rendered dropped below the keyboard row (Retirer stage)
cause: .piano-keyboard__key--ghost set position:relative, pulling the key out of the absolute row.
fix: commit 8a49675 — removed the override; ghost key stays in the absolute layer.
result: [needs on-device re-check] — jsdom cannot verify layout.

### F3. Could not return to "1 Voir" from "2 Retirer"; landed mid-drill with no lead-in
cause: step indicator was display-only spans; stage auto-derived from FSRS maturity (due cards skip Voir).
fix: commit 5e0b7f6 — step tabs are now clickable buttons; can review the meet/Voir reference then return; grading stays on the real stage.
result: [needs on-device re-check].

### F4. name-it (nomme cet accord) clearer right/wrong feedback
cause: on a correct answer the drill showed no affirmation (only silent badges); only a miss revealed a glyph, so correctness was ambiguous.
fix: commits 5383eb0 / 2825675 — clear "✓ Correct" (fr "Bien vu") / "✕ Incorrect" (fr "Pas tout à fait") feedback after answering, new i18n keys EN/FR; per-note role reveal on tap already gated to post-answer (no pre-answer leak). Reserved vermilion untouched.
result: [needs on-device re-check] — visual/animation polish (stamp timing, glyph sizing, EN/FR).

## Summary

total: 2 tests + 4 findings
tests_passed: 1 (accent)
tests_pending: 1 (phone responsive/animation)
findings_fixed: 4 (F1/F2/F3/F4, pending on-device re-check)

## Round 2 findings (fixed, pending on-device re-check)

### G1. Keys must play piano sound on every tap, everywhere
cause: audio was opt-in per caller (only inspect mode + wired onPress played); ProgressionDrill, build construct, etc. were silent.
fix: 3da6b09 — audio centralized in PianoKeyboard activation choke point (interactive + constructing modes), redundant caller audio removed (no double-play). Every tappable key sounds once.
result: [needs on-device re-check] — jsdom can't hear audio.

### G2. name-it served the same chord back-to-back
cause: a chord's teach cluster maps multiple modes to the name-it family, so 2+ same-symbol name-it items could land adjacent; interleaver only guarded same-family runs, never symbol.
fix: 17ce2dc — same-symbol anti-adjacency in composePracticeQueue (still allows a legitimately single-due symbol to repeat, PRAC-05 preserved).
result: [fixed, covered by tests].

### G3. Voicing "Voir" stage: show target symbol + tap-to-hear
fix: 88926f4 — ChordGlyph target shown; meet keyboards inspectable (tap plays). Build "Construire" tap-to-hear covered by G1.
result: [needs on-device re-check].

### G4. Duplicate preset song in Progress > Songs
cause: no storage-level uniqueness by presetId; in-memory guard couldn't collapse on-disk dups.
fix: 7c362a3 — listSongs dedups by presetId on read (non-destructive); saveSong hardened against new preset dups.
result: [fixed, covered by tests] — user's existing duplicate now shows once.

### G5. Voicing "Exo" no instruction / inert Fond.·Shell·Sans fond. tabs
fix: 6d40199 — Exo prompt now names the selected style (playFull/playShell/playRootless, EN/FR); switching sub-tabs changes the instruction. Drill stays a from-memory recall (target hidden pre-answer by design).
result: [needs on-device re-check] — confirm the style prompt reads clearly.

## Gaps

Round 1 (F1-F4: e8c9f43 / 8a49675 / 5e0b7f6 / 5383eb0) + round 2 (G1-G5: 3da6b09 / 17ce2dc / 88926f4 / 7c362a3 / 6d40199) all on the PR branch. Full suite green (1497), build green. On-device re-check still needed for anything audio/visual/animation (F1, F2, F3, F4, G1, G3, G5) plus the phone-width Test 2. G2/G4 covered by tests.

## Round 3 findings (fixed)

BLOCKER
- B1 practice register frozen at "21 sur 21" (Math.min of asked/length) so re-enqueued misses looked stuck. Fixed 9482578: register shows live hybridSessionRemaining ("N restantes"); completion unchanged (queue-empty). [needs on-device re-check of the last-stretch feel]

VOICING (ShellVoicingDrill) — commit fe6acd8
- V1 clicking Retirer jumped to Exo. Fixed: stages now user-navigable (activeStage ?? derived); each tab shows its own stage.
- V2 Exo did not show the target symbol pre-answer. Fixed: ChordGlyph shown on subtract+drill, before and after answering.
- V3 switching Fond./Shell/Sans fond. wiped tapped notes. Fixed: style switch preserves `selected`.
- V4 correct reveal was silent. Fixed: correct check plays the voicing guide tones (ensureAudioReady+playChord).
- V5 voicing overall UX: largely addressed by V1-V4 (navigable stages + symbol + audio). Deeper redesign still optional.

NAME-IT (PracticeChordDrill) — commit dfac88f
- E1 wrong answer now shows "Tu as choisi X. C'était Y." beside the correct glyph.
- E2 after answering, a muted teaching line shows the quality's stacked-thirds pattern (e.g. "m7: m3 · M3 · m3"), reusing stackedThirdsFor (Phase 26 engine). Teaches the invariant shape.

Suite green (1510), build green. On-device re-check: voicing audio + free-nav feel; name-it pattern line readability; B1 last-stretch flow.
