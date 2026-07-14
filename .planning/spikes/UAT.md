# UAT — Overnight v2 Learning Upgrade (2026-07-14)

Everything below is live on `main`. Run `npm run dev` (or deploy) and walk this list at the piano. Items marked SERVER need the one redeploy step first.

## 0. The one thing only you can do: redeploy the server

The backend gained a schema migration (answers table: kind may now be 'interval', new nullable columns `duration_ms` and `given`). It runs automatically and idempotently at startup on your existing SQLite file.

On the Oracle box: pull main, rebuild the server container (`docker compose up -d --build` in the usual place). Until then the app still works: interval answers and timing data are dropped politely, chord progress records as before.

## 1. Sound (Track A)

- [ ] /drills construction question: tapping keys sounds each note instantly (synth first, real piano timbre swaps in after a few seconds).
- [ ] Every answer reveal plays the correct chord, including when you answered right.
- [ ] Lookup page: Hear it plays the stamped chord.
- [ ] Progress page settings: SOUND toggle to OFF silences everything; ON restores it.
- [ ] On your phone (Safari/iOS): first tap unlocks audio, no silence-forever state.

## 2. Songs (Track B1)

- [ ] /songs: tap Autumn Leaves (G minor or E minor, whichever matches your arrangement) on the preset shelf: lands in your list, ON stamp.
- [ ] Edit it to match your chart (chip entry validates symbols, typos get a tap-to-accept suggestion).
- [ ] New song from scratch: paste a line of chords from your sheet, it splits and validates.

## 3. Levels + practice engine (Track B2)

- [ ] /drills favors your active song's chords (~60% of draws).
- [ ] Above-tier song chords (Cm7, Am7b5...) arrive as NEW CHORD. FORMULA FIRST. with the formula shown, then graduate to cold questions.
- [ ] Sessions run 10 questions with an end card (score, misses, run it again).
- [ ] A miss returns 2 to 4 questions later (ONE MORE TIME), and seeds the next session's warm-up (BACK FOR ANOTHER GO).
- [ ] Progress page: tier selector (you can set your real tier any time), Drill these button under Weakest Spots seeds a session. SERVER for real stats.
- [ ] Unlock suggestion card appears at a round end only after real accuracy earns it (85% over last 30 in tier, 40+ attempts, every quality solid, 2+ days). SERVER.

## 4. Intervals + scales (Track C)

- [ ] /drills mode row: CHORDS, INTERVALS, MIX (default MIX interleaves).
- [ ] Interval questions: name the interval (4 choices, French secondary), or tap the key at the asked interval.
- [ ] Lookup: tap any highlighted key or formula column: it sounds and the register line reads like `E♭ · Mi · m3 · tierce mineure · 3 demi-tons`.
- [ ] /scales: pick any of the 12 tonics, see the 7 degrees in color, tap keys to hear + inspect.
- [ ] Wrong-answer reveals: keyboards are tappable for inspection.

## 5. Theory + mnemonics (Track D)

- [ ] /theory: six short lessons, each with a real keyboard and Hear it.
- [ ] Wrong construction answer on a 7th chord shows its structural hook (e.g. dom7 tritone engine). Plain triads show none, by design.
- [ ] Wrong identification pick shows the contrast line (e.g. "Cm7 has E♭, C7 has E.").

## 6. Responsive + design

- [ ] Phone width: nav wraps to two rows, everything reachable, keyboards fit.
- [ ] Print Shop look intact everywhere (paper, ink borders, stamps, zero radius).

## Post-review notes

A final adversarial review pass found and fixed 4 real bugs (wrong-octave voicing for flat-heavy chords, telemetry duration bound, concurrent queue drains, the A4 chord/interval name collision). Small observations left open, none blocking:

- If the app ever marks telemetry as unsupported (only happens against the old server), the flag persists after you redeploy; clear it in DevTools with `localStorage.removeItem('music-learn:telemetry-support')` once the server is updated.
- On the one-octave drill keyboard, a wide interval (M7 above B) wraps and can read visually descending; the audio plays it ascending correctly.
- Octave construction questions accept a unison tap (grading is octave-agnostic like the chord matcher).

## Known limits (deliberate, not bugs)

- Tiers 5 and 6 are labeled COMING LATER (engine supports 8 qualities today).
- Songs and level state live per-device (localStorage), same as recent lookups.
- Preset chords are simplified to the supported chord matrix (noted on each preset card); edit to taste.
- MIDI input remains phase 4, untouched tonight.
