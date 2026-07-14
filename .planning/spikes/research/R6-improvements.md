# R6: Post-v1 Improvement Survey (Learning-Focused)

**Date:** 2026-07-14
**Scope:** What else the app could do for the learning goal, beyond tonight's already-planned builds.
**Excluded (already planned tonight):** sampled piano sound on key touch + answer reveal, intervals everywhere + interval drill, hybrid level gating, song builder with presets, theory content improvements, quality-gated mnemonics.
**Excluded (already on ROADMAP, phases 4-7):** MIDI play-to-answer, smart drill design (scoped sessions, fading label scaffolds), major scales + fingerings, theory lessons.

## Current state (verified in code)

- Routes: `/` lookup, `/drills`, `/progress`, `/showcase` (`src/routes/`).
- Drill loop (`src/routes/drills/+page.svelte`): endless 50/50 construction/identification, uniform random draw over 12 roots x 8 qualities (`src/lib/theory/randomChord.ts`). No session boundary, no adaptivity. In-memory score resets on reload.
- Feedback: wrong construction reveals merged keyboard + interval formula. Wrong identification reveals the correct chord only. The user's WRONG choice is never contrasted with the right one, and the chosen answer is not persisted (`recordAnswer` sends only `{item, kind, correct}`).
- Progress (`server/src/stats.ts`): per-item accuracy over ALL history (no recency weighting), weakest-5 shortlist (>=3 attempts, <70%), daily streak. Progress page is display-only: no path from "weakest spots" back into a drill.
- Persistence: raw per-answer rows in SQLite (`server/src/db.ts`), explicitly kept raw "for future v1.x spaced repetition". No `ts-fsrs`, no `dexie`, no `webmidi` installed (package.json: only `tonal` + `tone`).
- Audio: plain `Tone.PolySynth` on lookup "Hear it" only (`src/lib/audio/playChord.ts`). Being replaced tonight by sampled piano.
- No service worker (PWA manifest only, `static/manifest.webmanifest`): cold load requires network.
- No dark mode: single Print Shop paper palette (`src/app.css`).
- Matching (`src/lib/drills/matchChord.ts`): exact chroma-set equality, octave/inversion-agnostic. No "omit the 5th" tolerance, no octave-aware mode.

## Patterns worth stealing from apps that work

- **Anki / FSRS:** review exactly what is about to be forgotten; "leech" detection for items you keep missing. The raw answer log here was designed for this.
- **Duolingo:** mistakes come back at the START of the next session; sessions are short with a clear end card. Its streak-freeze data shows grace mechanics retain users, but for a single-user tool honesty beats theater.
- **Tenuto / musictheory.net:** tight scoping of exercises (covered by Phase 5 / tonight's gating) and instant, minimal feedback. Nothing else to steal.
- **iReal Pro:** chords are practiced in PROGRESSION context, not isolation. That is the bridge from "knows Cm7" to "plays a lead sheet". Tonight's song builder starts this; ii-V-I drills finish it.
- **Piano Marvel:** a single fluency number (SASR) that visibly climbs. Accuracy alone plateaus at 100% while recall is still slow; speed is the missing axis.

---

## Proposals (ranked by learning value per unit effort)

### 1. Warm-up: recent misses come back first

**Effort: S** | **Verdict: BUILD-TONIGHT-IF-CHEAP**

When `/drills` mounts, fetch the existing `/stats` weakest shortlist (endpoint already live) plus the last session's wrong answers (already known client-side at grade time; persist the last N missed symbols in localStorage next to the offline queue). Seed the first 3-5 questions from that list before falling back to the normal draw. Copy idea: a small mono tag on the prompt, "Back for another go." (no em dashes).

**Rationale:** Corrective feedback only sticks if it is followed by a successful retrieval attempt on the same item; a miss that never comes back is a lesson half-taught. This is Duolingo's single most effective loop (mistake review) and the cheapest possible approximation of spaced repetition: re-test what you just failed, at the start of the next session, when it is about to be forgotten.

**Dependencies/conflicts:** Must draw from the level-gated pool once tonight's hybrid gating lands (filter the miss list by unlocked items). Composes fine with the interval drill (misses can be interval items too if keyed by `{item, kind}`).

### 2. Weakness-weighted draw + "Drill these" button on Progress

**Effort: S** | **Verdict: BUILD-TONIGHT-IF-CHEAP**

Two small parts. (a) Bias `generateQuestion` so roughly 1 in 3 draws comes from the `needsPractice` set instead of uniform random. (b) On the Progress page's Weakest Spots card, add a button, copy: "Drill these", linking to `/drills?focus=weakest`, which seeds the session from that list. Closes the currently dead-ended loop where the app diagnoses weakness but offers no action.

**Rationale:** Uniform random over 96 cells means a weak item resurfaces on average every 96 questions, far too sparse to fix anything. Weighted sampling is the 20-line version of adaptive practice, and the deep link turns the stats page from a report into a practice plan. Every serious drill app (Tenuto custom exercises, Anki filtered decks) has this "practice exactly this" affordance.

**Dependencies/conflicts:** Same gating interaction as #1: weight WITHIN the unlocked pool. Superseded later by FSRS (#7), which replaces the weighting with real scheduling; the deep link survives either way.

### 3. Confusion-contrast feedback on identification misses

**Effort: S** | **Verdict: BUILD-TONIGHT-IF-CHEAP**

When the user picks the wrong chord symbol, the app knows both symbols. Spell both with `spellChord`, diff the note sets, and show the one-line contrast under the reveal, e.g.: "You picked C7. The difference is the third: Cm7 has E flat, C7 has E." Optionally add a second "Hear both" tap that plays the correct chord then the picked one (free once tonight's sampled piano lands). Pure client change in the existing feedback block of `drills/+page.svelte`.

**Rationale:** The real difficulty in chord fluency is discrimination between near neighbors (m7 vs 7 vs maj7 share two or three notes), and the distractor generator already deliberately picks these near misses. Contrastive feedback that names the single differing interval targets exactly the feature the learner failed to encode. This is elaborative feedback aimed at the actual error, which beats merely showing the right answer.

**Dependencies/conflicts:** Complements tonight's mnemonics (mnemonic teaches the rule, contrast teaches the boundary) and intervals-everywhere (the differing note can be named by interval role). No conflicts.

### 4. Fixed-length micro-sessions with an end card

**Effort: S/M** | **Verdict: BUILD-TONIGHT-IF-CHEAP**

Replace the endless loop with a default 10-question set (keep an "endless" escape hatch if trivial). Progress dots or "4 of 10" in the existing score register. At the end, a Print Shop style summary card: score, best streak, the items missed (tappable to re-drill, reusing #2's seeding), and one button, copy: "Run it again." Session completion is also the natural moment to count the streak day as earned.

**Rationale:** The stated usage is short sessions before/after piano practice, on phone or laptop. Open-ended drills have no finish line, so sessions end by abandonment, which feels like quitting rather than completing; a fixed set gives a completable unit, a natural self-testing goal, and a summary that makes progress visible. Duolingo, Anki, and every habit-forming drill product converge on the bounded session for exactly this reason.

**Dependencies/conflicts:** The counter must count all question kinds (chord, interval after tonight). Works with level gating as-is. The end card is also the natural future home for FSRS due counts (#7).

### 5. Coverage stamp sheet: the 12 x 8 grid

**Effort: M** | **Verdict: NEXT-MILESTONE**

A Progress-page component rendering the full roots x qualities matrix as a sheet of stamps: blank for never practiced, outlined for seen, inked when accurate (>=70% over >=3 attempts, thresholds already exist in `stats.ts`). All data already comes back from `/stats`; this is a pure client rendering of it. Fits the Print Shop identity perfectly: a partially filled stamp sheet you want to complete.

**Rationale:** The current stats table shows only what you HAVE practiced; it cannot show the holes (nobody drills D flat dim7 because nothing reveals it has never appeared). A coverage map makes the goal state concrete (a full sheet), exposes avoidance of hard roots, and is a more motivating progress visualization than a table because completeness is legible at a glance. Collection mechanics are one of the few gamification patterns with real evidence behind them, and here the collection IS the curriculum.

**Dependencies/conflicts:** Should reflect tonight's level gating (locked cells rendered as locked, making the gate visible too). Grows naturally when the vocabulary expands (#11).

### 6. Answer telemetry: response time and the chosen answer

**Effort: S/M** | **Verdict: NEXT-MILESTONE (but capture-only is tonight-cheap)**

Add `duration_ms` (prompt shown to graded) and `given` (the symbol picked on identification misses) to the answer event, the POST body, and the answers table. Additive schema change; SQLite needs a tiny migration step since the schema is `CREATE TABLE IF NOT EXISTS`. Surface later: a per-item "instant / slow / stalled" tag next to accuracy, and a most-confused-pairs list computed from `given`.

**Rationale:** The core value statement is "know instantly what notes to play, without stopping to think." Accuracy measures knowing; latency measures fluency, and they diverge exactly at this user's stage (classical pianist who can derive anything given 10 seconds). Without timing data the app literally cannot see the thing it exists to train. Capturing early matters because history is the asset: every week of answers recorded without timing is a week FSRS and fluency stats can never use. The `given` column additionally turns the confusion contrast (#3) into longitudinal data.

**Dependencies/conflicts:** None with tonight's builds. Feeds #7 (FSRS can grade on latency: fast correct = Easy, slow correct = Hard) and strengthens #5. Requires a server redeploy (docker compose per project memory).

### 7. Real spaced repetition with ts-fsrs

**Effort: M/L** | **Verdict: NEXT-MILESTONE**

Adopt `ts-fsrs` (already in the recommended stack, not yet installed). Each (item, kind) becomes a card; binary drill grades map to Again/Good (or Again/Hard/Good/Easy once #6 latency exists). Card state lives server-side next to the raw events; the drill session draws due cards first, then new cards from the gated pool. The end card (#4) reports "12 due tomorrow."

**Rationale:** This is the endgame the persistence layer was explicitly built for (db.ts comment: raw events are "the substrate for future v1.x spaced repetition"). FSRS schedules reviews at the point of near-forgetting, which is the most data-efficient known way to build durable recall of a large item set, and 96+ chord cells is exactly a large item set. Fluency across ALL keys (not just the comfortable ones) will not happen from uniform random practice.

**Dependencies/conflicts:** Supersedes the interim weakness weighting of #2 (keep the deep link). Must be reconciled with tonight's hybrid level gating: gating controls which cards can be INTRODUCED, FSRS controls when known cards RETURN; these compose cleanly if introduction order defers to the gate. Do #1/#2 now anyway; they are 5% of the effort for maybe 40% of the benefit and validate the UX.

### 8. Shell voicings: root, 3rd, 7th

**Effort: M** | **Verdict: NEXT-MILESTONE**

A voicing mode for 7th-chord construction drills: the prompt asks for the left-hand shell, copy: "Play the shell for Cm7: root, 3rd, 7th." `matchChord` gets a target built from the root/third/seventh roles only (the roles are already tagged on every `SpelledNote`), so the matcher change is small. Pair with a short theory lesson: why the 5th is disposable, why shells are the standard jazz LH starting point. Rootless A/B voicings stay out of scope until shells are fluent.

**Rationale:** This is the single biggest gap between the app's current pedagogy and actual jazz piano practice. Four-note closed-position chords in the left hand below middle C sound muddy and are not what anyone plays from a lead sheet; every jazz method (Levine's Jazz Piano Book onward) starts the left hand with 3-note shells or guide tones. The app currently trains a fingering the user will have to partially unlearn at the instrument. Shells also lighten load: three notes to recall instead of four, with the two that carry the chord quality (3rd and 7th) kept.

**Dependencies/conflicts:** Strongly synergizes with tonight's intervals-everywhere (the shell IS "root + 3rd + 7th" as intervals) and with the song builder (shells are what you would actually comp with). Level gating could introduce shells as a late level. Phase 4 MIDI makes this land hardest: playing real shells on the real piano.

### 9. ii-V-I progression drills (roman numeral awareness)

**Effort: M/L** | **Verdict: NEXT-MILESTONE**

Given a key, drill the ii-V-I: "In F major, what is the ii chord?" (identification with choices), then "Build the ii-V-I in F, one chord at a time" (three chained construction questions). Theory content: the ii-V-I as the unit jazz harmony moves in, and why lead sheets are full of it. tonal's `Progression`/`RomanNumeral` modules can derive the chords; the drill UI reuses the existing chained construction flow.

**Rationale:** Chord-symbol fluency is the v1 goal, but the reason it matters is reading progressions in real tunes, and 80% of jazz standards are ii-V-I chains. Practicing chords inside a functional context also builds a second retrieval path (Gm7 as "the ii of F") which measurably strengthens recall versus isolated-item practice, and it converts theory (scale degrees) into something with immediate musical payoff.

**Dependencies/conflicts:** Overlaps tonight's song builder presets (presets will likely include ii-V-I patterns): coordinate so the song builder teaches BY EXAMPLE and this drills BY RETRIEVAL, same data, two directions. Benefits from Phase 6 scales (knowing the key's notes) but does not strictly require it if framed shape-first.

### 10. Ear training: name the quality by sound

**Effort: M** | **Verdict: NEXT-MILESTONE**

A third drill kind: the app plays a chord (root randomized and hidden), the user picks the QUALITY from the existing 2x2 choice grid, copy: "What quality is this?" No absolute pitch involved, quality recognition only. Reuses tonight's sampled piano, the choice UI, and `recordAnswer` with a new kind.

**Rationale:** Hearing m7 vs maj7 vs 7 is the auditory twin of the visual discrimination the drills already train, and it feeds directly into playing from lead sheets (you hear whether what you just played matches the symbol). PROJECT.md lists ear training as "later", but the marginal cost collapses tonight once realistic playback exists, and quality-recognition is the one slice of ear training with direct chord-symbol payoff.

**Dependencies/conflicts:** Depends on tonight's sampled piano (a synth blip makes 7th qualities genuinely hard to hear, which would test the audio, not the user). Should be a low level in the gating scheme or opt-in, so it never blocks the visual path on muted devices.

### 11. Chord vocabulary expansion: 6, 9, sus4, 7b9, alt

**Effort: M** | **Verdict: NEXT-MILESTONE**

Extend `QUALITY_SUFFIXES` and the reference matrix beyond the v1 eight: first 6, m6, sus4, 9, maj9, m9, then 7b9/7#9/alt as a later tier. tonal parses all of these; the work is the reference-chart test matrix, the interval-role mapping for extensions (9ths need a new role color decision, extending the fixed 4-color language carefully), and gating tiers.

**Rationale:** Real charts do not stop at m7b5: any standards fake book page has 6ths, 9ths and sus chords on it, and the app's promise is "see a symbol in real sheet music and know what to play". The current 8 qualities are the right training wheels, but the ceiling arrives fast for someone practicing from actual lead sheets.

**Dependencies/conflicts:** Slots directly into tonight's hybrid level gating as later levels (this is the strongest argument for the gating being built well). Requires a design decision for extension colors, which touches the DESIGN-02 fixed interval color language: do it deliberately, not tonight.

### 12. Offline-first: precache the app shell with a service worker

**Effort: S/M** | **Verdict: NEXT-MILESTONE**

SvelteKit has first-class service worker support (`src/service-worker.ts` plus the `$service-worker` module); precache the static build and serve cache-first. The answer queue already tolerates offline (`src/lib/api/progress.ts` localStorage queue), so drills and lookup become fully functional with zero connectivity; only Progress needs the network, and it already has an error state.

**Rationale:** Practical, not pedagogical: the phone use case ("short sessions elsewhere") currently breaks on cold load without signal, and a PWA that is installed to the home screen but white-screens offline feels broken. The offline queue was built for exactly this; the shell cache is the missing half. Sampled piano assets complicate precaching slightly (lazy-loaded samples), so decide whether samples are cached or synth remains the offline fallback.

**Dependencies/conflicts:** Interacts with tonight's sampled piano (cache strategy for samples). Adds a deploy consideration: cache-busting is handled by SvelteKit's versioned service worker, but test the update path so a stale shell never sticks.

### 13. Print Shop After Dark: dark mode

**Effort: M** | **Verdict: NEXT-MILESTONE**

An inverted Print Shop palette (ink ground, paper text, same vermilion/mustard accents recalibrated for contrast) behind `prefers-color-scheme` plus a manual toggle. The interval color language must keep its identity and contrast on dark ground, which is design work, not just CSS variable swaps; the on-fill text pairings in `app.css` all assume light paper.

**Rationale:** Zero learning value, real usability value: evening practice at the piano is the app's prime time, and a bright cream screen in a dim piano room is genuinely unpleasant and kills night vision for reading actual sheet music beside it. This is the one purely cosmetic item that earns its place from the stated usage pattern.

**Dependencies/conflicts:** None functional. Touches every component visually, so schedule it as its own design-led phase (sketch first, per the project's sketch workflow), never as a side quest.

### 14. Streak insurance, practice reminders, XP and badges

**Effort: S-M** | **Verdict: SKIP**

Grace days for missed streaks, push-notification reminders, points, levels-as-decoration, confetti.

**Rationale for skipping:** This is gamification theater for a single-user tool whose user is also the developer. Push notifications via PWA are flaky on iOS and the user's sessions are anchored to piano practice, an existing physical habit that needs no phone nag. Streak grace mechanics have retention evidence in mass-market apps, but here a lost streak has an audience of one and the honest zero is fine (the streak copy already handles it gracefully). The stamp reward, streak, and tonight's level gating already cover the motivational layer; adding XP on top dilutes the Print Shop restraint that makes the app feel good. Revisit only if actual usage shows drop-off.

### 15. Inversion and voice-leading drills (now)

**Effort: L** | **Verdict: SKIP (for now, revisit after phases 4-6)**

"Build Cm7 with the 3rd on the bottom", or ii-V-I with minimal hand movement between chords.

**Rationale for skipping now:** Voice leading is a real and eventually essential skill (it is HOW you play ii-V-I chains without your left hand jumping around), but it is premature and expensive today. The whole input/matching/display stack is deliberately octave-agnostic (`matchChord` chroma sets, keyboard letter-based highlighting that survives octave-count changes), so inversion drills require octave-aware matching, octave-aware selection UI, and a keyboard that distinguishes E flat3 from E flat4: a real refactor across the most stable, tested layer of the app. Sequencing is also wrong: inversions pay off after shells (#8), intervals (tonight), and ideally MIDI (Phase 4), where playing an inversion on the real piano is natural and clicking one on a phone keyboard is fiddly. Park it; do not let it leak into tonight.

---

## Summary table

| # | Proposal | Effort | Verdict |
|---|----------|--------|---------|
| 1 | Warm-up: recent misses first | S | BUILD-TONIGHT-IF-CHEAP |
| 2 | Weakness-weighted draw + Drill these link | S | BUILD-TONIGHT-IF-CHEAP |
| 3 | Confusion-contrast feedback | S | BUILD-TONIGHT-IF-CHEAP |
| 4 | Fixed-length micro-sessions + end card | S/M | BUILD-TONIGHT-IF-CHEAP |
| 5 | Coverage stamp sheet (12 x 8) | M | NEXT-MILESTONE |
| 6 | Telemetry: response time + chosen answer | S/M | NEXT-MILESTONE (capture is tonight-cheap) |
| 7 | FSRS spaced repetition (ts-fsrs) | M/L | NEXT-MILESTONE |
| 8 | Shell voicings (root, 3rd, 7th) | M | NEXT-MILESTONE |
| 9 | ii-V-I progression drills | M/L | NEXT-MILESTONE |
| 10 | Ear training: quality by sound | M | NEXT-MILESTONE |
| 11 | Chord vocabulary expansion | M | NEXT-MILESTONE |
| 12 | Offline-first service worker | S/M | NEXT-MILESTONE |
| 13 | Dark mode (Print Shop After Dark) | M | NEXT-MILESTONE |
| 14 | Streak insurance, reminders, XP | S-M | SKIP |
| 15 | Inversion/voice-leading drills now | L | SKIP (revisit after 4-6) |

## Suggested sequencing note

Tonight's cheap picks (1-4) form one coherent theme: close the diagnosis-to-practice loop that v1 left open. They share plumbing (a seeded question queue in `/drills`) and none conflict with the six planned builds, provided the seeded draws respect the level gate. The next milestone's center of gravity should be #6 + #7 (telemetry then FSRS), because every week without captured timing/confusion data is training signal lost forever, with #8 shells as the highest-value pedagogy addition alongside Phase 4 MIDI.
