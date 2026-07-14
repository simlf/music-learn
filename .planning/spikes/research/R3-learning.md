# R3: Learning Design Research

Levels/tiers, unlock criteria, song-weighted scheduling, reveal sound, mnemonics, and other learning mechanics for Music Learn. Grounded in the existing code and in learning science (retrieval practice, spacing, interleaving, cognitive load, desirable difficulties, multisensory encoding).

## 0. What exists today (grounding)

- **Question generation** (`src/lib/drills/generateQuestion.ts`): uniform random draw over the proven 12 x 8 matrix in `src/lib/theory/randomChord.ts`: `ROOTS = [C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B]`, `QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7']` (96 items). 50/50 construction vs identification; identification gets 3 near-miss distractors.
- **Grading** (`src/lib/drills/matchChord.ts`): exact chroma-set equality. Octave, inversion, order, duplicates all ignored. Consequence: "root position only, then inversions" cannot be graded today; it needs a pitch-aware match mode (lowest played note = required bass). Inversion drilling is therefore a variation for a later slice, not a config flag.
- **Progress data** (`src/lib/api/progress.ts`, `server/src/stats.ts`): every graded answer is POSTed as `{ item, kind, correct, clientDate }` and stored as raw `AnswerRow[]`. The server derives per-item `attempts`, `accuracy`, `needsPractice` (attempts >= 3 and accuracy < 0.7) and a weakest-5 shortlist. `stats.ts` explicitly keeps the raw substrate for "later spaced-repetition work to reweight however it needs". Unlock criteria below are computable from this substrate with no schema change; one field addition (`elapsedMs`) is recommended.
- **Audio** (`src/lib/audio/playChord.ts`): Tone.js PolySynth, ascending root-position voicing, must run inside a user gesture. Sampled piano is planned separately (spike 002).
- **ts-fsrs**: in the recommended stack but NOT used anywhere (no dependency, no imports). See section 6.

---

## 1. Level tier design

Jazz pedagogy sources converge on the same spine: triads for quality recognition first, then the five seventh-chord types (major 7, minor 7, dominant 7, half diminished, diminished), organized by function around the ii-V-I, with shell voicings and extensions after that. The refinement over the naive tier sketch: dominant 7 belongs WITH maj7/m7 (the ii-V-I is unplayable without it), and half diminished earns its own tier with dim7 because the minor ii-V (iiø7 - V7 - i) is the next structural unit, and it is exactly what Autumn Leaves needs.

| Tier | Name | Roots | Qualities | Items | Engine impact |
|------|------|-------|-----------|-------|---------------|
| 1 | White-key triads | C D E F G A B | maj, m | 14 | none |
| 2 | All-key triads | all 12 | maj, m, dim | 36 | none |
| 3 | The big three sevenths | all 12 | maj7, m7, 7 | 36 | none |
| 4 | Minor ii-V colors | all 12 | m7b5, dim7 | 24 | none |
| 5 | Sixths and sus | all 12 | 6, m6, sus4, 7sus4 | 48 | extend `QUALITY_SUFFIXES` + reference tests |
| 6 | Extensions and alterations | all 12 | 9, maj9, m9, 7b9, 7#5, 13 | 72 | extend `QUALITY_SUFFIXES` + reference tests |

Notes:

- Tiers 1 to 4 map exactly onto the existing 96-item proven matrix. Nothing new to spell or test. Tier gating is a filter over `ROOTS x QUALITY_SUFFIXES`, not a new question engine.
- Tier 1 is deliberately tiny (14 items). The user is a classical pianist: triads are recognition practice and symbol-reading practice, not new material. Expect Tier 1 to last one or two sessions; that is fine, it seeds the progress data and the habit without overwhelm.
- Tier 3 is the core value tier ("see Cm7, play it"). The diatonic white-key anchor (Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5, all white keys) is the recommended lesson framing for its intro.
- Tier 4 before sus/6 because Autumn Leaves and every minor-key standard needs ø7 immediately, and dim7 is one edit away from it. Sus and 6 chords are common but structurally undemanding; they slot in later without blocking song practice (section 3 handles early song access).
- Interleaving rule inside every tier: unlocking tier N does not retire tiers < N. The active pool is all unlocked tiers, weighted (see section 3). Blocked practice feels better and tests worse; mixed pools force the quality discrimination that is the actual skill.

### Easiest variations inside a tier (difficulty ladder)

Within any tier, difficulty steps up along these axes, in order of introduction:

1. **Guided construction**: symbol shown with its interval formula and spelled notes visible; user plays them (worked example, near-zero retrieval demand).
2. **Identification, multiple choice**: existing 4-option format (recognition, ~25% guess floor).
3. **Construction, hint on demand**: formula hidden behind a "Show formula" tap; taking the hint marks the answer as assisted (does not count toward unlock accuracy).
4. **Construction, cold**: the transfer task. This is what unlock criteria measure.
5. **(Later slice) Inversions**: requires the pitch-aware matcher noted above; when it lands, apply the same ladder with "root position only" as step 0.

New material (a new tier, or an above-tier song chord) always enters at step 1 or 2 and fades scaffolding as accuracy accrues (fading worked examples: high guidance for novices, removed quickly as expertise grows, per the expertise-reversal literature).

---

## 2. Unlock criteria (concrete and computable)

All computable from the existing raw `AnswerRow[]` substrate server-side (a new `GET /unlock?tier=N` endpoint keeps the D-02 rule that the client never re-derives stats).

A tier N+1 unlock is **suggested** when ALL of the following hold for tier N's item set:

| Criterion | Value | Rationale |
|-----------|-------|-----------|
| Rolling accuracy over last 30 tier answers | >= 85% | Mastery-learning practice sits at 80 to 90%; maintenance research favors the higher end, but the MC guess floor inflates raw accuracy, so 85% with the per-quality floor below is the honest middle. 30 answers is reachable in 2 or 3 short sessions yet large enough that 85% is signal, not streak. |
| Minimum lifetime attempts in tier | >= 40 | Prevents unlocking off a single hot 30-answer window; guarantees the rolling window is preceded by real practice. |
| Per-quality floor | every quality in the tier has >= 8 attempts and >= 75% accuracy | Stops easy qualities (major triads) from carrying hard ones (dim) into an unlock. |
| Distinct practice days | >= 2 | In-session performance overestimates learning; requiring retrieval across at least one sleep cycle is the cheapest spacing guarantee (desirable difficulty). Uses `clientDate`, already stored. |
| Assisted answers excluded | hint-taken answers do not count | Unlock should measure cold retrieval, not recognition of a shown formula. |

**Suggest-unlock interaction (non-nagging):**

- Check runs at natural boundaries only: drill page load and end of a 10-question round. Never mid-question.
- When criteria pass, show one dismissible card: "Tier 3 looks ready. Your last 30 answers are 87% correct across 3 days. Unlock seventh chords: maj7, m7, 7?" with buttons "Unlock Tier 3" and "Not yet".
- "Not yet" snoozes the suggestion for 3 practice days (days with >= 1 answer). It re-appears at most once per snooze period, and only if criteria still pass.
- Passive progress is always visible on the Progress page ("Tier 3 unlock: 26 of last 30 correct, need 26+; dim triads at 71%, need 75%") so the suggestion never surprises and the user can self-serve.
- Manual override in Settings: a plain tier picker that can unlock or re-lock any tier, no confirmation friction, one line of copy: "Unlocking early is fine. The drill mixes in scaffolding for new chord types."

---

## 3. Song-weighted scheduling

### Song model

A song is an ordered chord list typed from the user's actual sheet (duplicates allowed and meaningful: a chord that appears 4 times in the form gets natural extra weight). Example preset, Autumn Leaves (Em real-book changes): `Am7 D7 Gmaj7 Cmaj7 F#m7b5 B7 Em Em` (the user's arrangement key wins; the builder just takes symbols).

### Bucket mix

Each question draws a bucket first, then an item within the bucket:

| Bucket | Weight (song active) | Weight (no song) | Item selection |
|--------|---------------------|------------------|----------------|
| SONG | 0.60 | 0 | weighted by need = `(1 - recentAccuracy)` with Laplace smoothing (unseen items treated as 0.5), capped at 35% share per item so one weak chord cannot monopolize |
| TIER (all unlocked tiers) | 0.25 | 0.80 | uniform over unlocked items, with an interleaving constraint: never 3 consecutive questions of the same quality |
| REVIEW | 0.15 | 0.20 | server `weakest` shortlist plus items unseen for > 7 days from lower tiers (maintenance so retired tiers do not decay) |

All three weights live in one tunable config object (types below). 60% song is the user's requested default emphasis; it also matches the motivation literature: practicing material with a visible personal payoff sustains the habit that all the other mechanics depend on.

### Above-tier song chords: bypass with scaffolding

Song chords are trainable from day one regardless of tier (user requirement), but they enter through the difficulty ladder from section 1, tracked per symbol:

1. **Exposures 1 to 2, formula first**: show the card (symbol, interval formula, spelled notes), play the sound, then guided construction with target keys outlined. Worked example: near-zero retrieval load, maximal encoding.
2. **Exposures 3 to 5**: identification MC, or construction with the hint available. Hint-assisted answers marked assisted.
3. **After 5 cold correct constructions**: the chord graduates to a normal item.

Overwhelm guards:

- At most 2 unfamiliar qualities (qualities from tiers above the current one) may be in scaffolding at the same time. If Autumn Leaves introduces both `m7b5` and `maj7` above the user's tier, `maj7` starts first (higher song frequency wins), `m7b5` waits until `maj7` graduates or the user unlocks.
- Above-tier song answers count toward the song's own stats but never toward tier unlock computations (those are defined over the tier's item set, so this falls out naturally; state it as an invariant anyway).
- If a song chord is inside the current tier, it simply lives in both buckets: no special case.

### Selection sketch

```
pickQuestion(state):
  bucket = weightedDraw({ song: 0.6, tier: 0.25, review: 0.15 })   // renormalize if bucket empty
  if bucket == song:
    item = needWeightedDraw(activeSong.chords)                      // cap 0.35 per item
    if aboveTier(item) and scaffold(item).stage < graduated:
      return scaffoldedQuestion(item)                               // ladder step per exposures
  if bucket == tier:
    item = uniformDraw(unlockedItems, constraint: quality != lastTwoQualities)
  if bucket == review:
    item = draw(weakestList ∪ staleItems(>7 days))
  return generateQuestionFor(item)                                  // reuse existing kind/distractor logic
```

This wraps the existing `generateQuestion.ts` machinery: only the symbol draw changes; distractor generation and kinds are reused as-is.

---

## 4. Answer reveal + sound

**Recommendation: play the chord on every reveal, correct answers included.** The MANIFEST already locks "answer reveal ALWAYS plays the chord sound"; this section supplies the rationale and one refinement.

- **Multisensory encoding**: pairing the visual reveal (keyboard highlight, interval colors) with the auditory chord creates a dual-coded trace; audiovisual training drives stronger plasticity than unimodal training in the music-learning literature. The sound is feedback AFTER retrieval, so it enriches encoding without contaminating the retrieval test itself.
- **The sound IS the curriculum**: chord-symbol fluency for a pianist ultimately means symbol -> hands -> sound. Hearing Cm7 every time it is answered builds the symbol-to-sound association for free, seeding future ear training at zero extra UI cost.
- **On correct**: play the chord immediately. It doubles as the reward signal; correct-answer audio keeps the loop satisfying and keeps encoding symmetrical (otherwise wrong answers get richer encoding than right ones, which is backwards).
- **On incorrect**: play the CORRECT chord with the reveal (the diff view already shows missing/extra keys). Optionally offer a "Hear yours" tap for contrast; do not autoplay the wrong chord, one percept per reveal keeps load low.
- Keep it short (the existing `4n` duration is right), reuse `playChord`'s gesture-safe path, and add a single mute toggle in Settings.

---

## 5. Mnemonics: candidates with verdicts

Quality bar per the user: structural insight beats cutesy phrase; better none than cheesy; no em dashes in copy. Verdicts:

| # | Candidate | Verdict | Why |
|---|-----------|---------|-----|
| 1 | White-key anchor: stacking sevenths on the C major scale gives Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5, all white keys | KEEP | One hand position teaches four qualities plus their diatonic roles; the single best Tier 3 lesson framing |
| 2 | dom7 = major triad + b7 (a whole step below the octave) | KEEP | Structural, works on all 12 roots, composes with #3 |
| 3 | maj7 = major triad + 7 one half step below the octave; the half-step vs whole-step contrast under the octave separates maj7 from 7 instantly | KEEP | Turns the most-confused pair into one binary check |
| 4 | m7 = minor triad + b7 | KEEP | Completes the system: triad quality + seventh size names the chord |
| 5 | The 5-quality grid: (maj / min / dim triad) x (7 / b7 / bb7) generates all five seventh types | KEEP | Understanding one 2-axis grid replaces memorizing 60 chords |
| 6 | Tritone engine: every dom7 hides a tritone between 3 and b7; that instability is why V7 pulls home | KEEP | Explains function, not just spelling; standard jazz pedagogy |
| 7 | m7b5 = m7 with the 5 lowered one half step | KEEP | One-edit distance from a chord the user already owns |
| 8 | Relative-major shortcut: Xm7 = the major triad of its b3 played over X (Am7 = C triad over A) | KEEP | Directly leverages this user's classical triad fluency |
| 9 | dim7 = a stack of minor thirds; fully symmetric, so only 3 distinct dim7 pitch sets exist | KEEP | Collapses 12 chords into 3; genuinely used by jazz players |
| 10 | Notation key: ø keeps a plain b7 (half diminished), ° flattens it again to bb7 (fully diminished); "half" refers to the seventh | KEEP | Resolves the single most confusing symbol pair in real sheets |
| 11 | Function tags with sound: maj7 rests, 7 pushes, m7 travels | KEEP, only paired with playback | Aural function labels are standard pedagogy; without the sound they read as filler |
| 12 | Letter-phrase mnemonics for chord tones ("Every Good Boy..." style) | CUT | Does not transfer to roots with accidentals; rote, not structural |
| 13 | Pop-culture sound-alikes (dreamy chord, horror chord, James Bond chord) | CUT | Style-dependent, ages badly, fails the cheese bar; #11 covers the aural need |
| 14 | Sus imagery ("the chord is waiting for the elevator") | CUT | The structural version (4 replaces 3 and wants to fall to it) is Tier 5 content; keep only that phrasing when Tier 5 ships |
| 15 | dim7 = rootless 7b9 | CUT for now | True and valuable, but above Tier 4; reintroduce with Tier 6 alterations |

Placement: hooks 2 to 5 belong on the formula/scaffold card for their chord types; 1 belongs in the Tier 3 intro lesson; 6, 9, 10 belong in tier intro copy; 7, 8 belong on the m7b5 and m7 cards respectively.

---

## 6. Other high-value mechanics, ranked

1. **Warm-up review queue**: the first 3 to 5 questions of a session are drawn from yesterday's misses and the `weakest` shortlist. Pure retrieval-practice-plus-spacing win, nearly free to build (the data already exists server-side).
2. **Record `elapsedMs` per answer now**: the product goal is "know instantly", and accuracy alone cannot measure it. One optional field on `AnswerEvent` today unlocks fluency thresholds later (e.g. correct in < 3s = fluent) and better FSRS grading. Cheapest future-proofing in this document.
3. **Adopt ts-fsrs for per-item scheduling (currently NOT used, verified)**: map wrong -> Again, correct-but-slow -> Hard, correct -> Good, fast-correct -> Easy; desired retention 0.9 (the standard default). Feed its due-dates into the REVIEW bucket. Worth adopting once the unlocked pool passes roughly 60 items; before that, the need-weighted buckets above are sufficient and simpler. The raw `AnswerRow[]` substrate was explicitly kept re-weightable for this.
4. **Micro-session structure**: 10-question rounds with a small end screen (accuracy, streak, unlock progress). Matches the stated usage pattern (short sessions around piano practice) and gives the unlock suggestion its natural, non-nagging moment.
5. **Delayed retry on miss**: re-queue a missed item 2 to 4 questions later in the same round, not immediately. Immediate retry tests only short-term memory; a short gap makes the retry a real retrieval event.
6. **Construction bias after Tier 1**: shift the 50/50 kind split to roughly 65/35 construction/identification once past Tier 1. Construction is the transfer task; identification remains as the easier interleaved variant and the scaffolding entry point.

---

## 7. Data model sketches

```ts
// ---- Tiers ----------------------------------------------------------------
type TierId = 1 | 2 | 3 | 4 | 5 | 6;

interface TierDef {
  id: TierId;
  name: string;
  roots: string[];        // subset of ROOTS (randomChord.ts)
  qualities: string[];    // subset of (extended) QUALITY_SUFFIXES
  needsEngineWork: boolean; // true for tiers 5 and 6 (new suffixes + reference tests)
}

interface LevelState {
  currentTier: TierId;            // highest tier the user drills by default
  unlockedTiers: TierId[];        // manual override can create gaps
  suggestionSnoozedUntil?: string; // local YYYY-MM-DD (matches localDateString)
  lastSuggestedTier?: TierId;
}

interface UnlockCriteria {
  rollingWindow: number;           // 30
  rollingAccuracyMin: number;      // 0.85
  minLifetimeAttempts: number;     // 40
  perQualityMinAttempts: number;   // 8
  perQualityAccuracyMin: number;   // 0.75
  minDistinctDays: number;         // 2
}

// Server-computed (new GET /unlock?tier=N), client never re-derives (D-02)
interface UnlockCheck {
  tier: TierId;
  eligible: boolean;
  rollingAccuracy: number;
  rollingCount: number;            // answers in window so far
  lifetimeAttempts: number;
  distinctDays: number;
  perQuality: { quality: string; attempts: number; accuracy: number; passing: boolean }[];
}

// ---- Songs ----------------------------------------------------------------
interface Song {
  id: string;
  name: string;                    // "Autumn Leaves (my arrangement)"
  chords: string[];                // ordered as in the sheet; duplicates allowed = natural weight
  isPreset: boolean;
  active: boolean;                 // one active song at a time keeps the mix simple
}

interface ScaffoldState {
  symbol: string;                  // e.g. "F#m7b5"
  exposures: number;               // formula-first count
  coldCorrectConstructions: number; // graduation at scaffoldGraduation
}

// ---- Mixing ---------------------------------------------------------------
interface MixConfig {
  songWeight: number;              // 0.60 (0 when no active song; renormalize)
  tierWeight: number;              // 0.25 (0.80 with no song)
  reviewWeight: number;            // 0.15 (0.20 with no song)
  maxItemShare: number;            // 0.35 cap inside the song bucket
  maxScaffoldingQualities: number; // 2 unfamiliar qualities at once
  formulaFirstExposures: number;   // 2
  scaffoldGraduation: number;      // 5 cold correct constructions
  maxSameQualityRun: number;       // 2 (interleaving constraint)
  staleDays: number;               // 7 (maintenance review of old tiers)
}

// ---- Answer event extension (additive, backward compatible) ---------------
interface AnswerEventV2 {
  item: string;
  kind: 'chord' | 'scale';
  correct: boolean;
  elapsedMs?: number;              // fluency signal (mechanic #2)
  assisted?: boolean;              // hint taken; excluded from unlock accuracy
  source?: 'song' | 'tier' | 'review';
}
```

---

## Sources

- [PianoGroove: 7th Chords for Jazz Piano](https://www.pianogroove.com/jazz-piano-lessons/7th-chords/) and [C Major Triads and 7th Chords](https://www.pianogroove.com/jazz-piano-lessons/c-major-triads-7th-chords/): the five seventh-chord types as the core set; triads before sevenths.
- [Earl MacDonald: Triads and 7th Chords](https://www.earlmacdonald.com/jazz-piano-lessons/triads-and-7th-chords/): root-position triads across all keys for fast quality recognition before voicing variety; organize sevenths into families by function; ii-V-I in all keys as the practice spine.
- [Learn Jazz Standards: 7th chords](https://www.learnjazzstandards.com/blog/play-7th-chords-on-piano-guitar/) and [FreeJazzLessons: basic jazz piano chords](https://www.freejazzlessons.com/basic-jazz-piano-chords/): pedagogical ordering corroboration.
- [Optimizing Music Learning: blocked vs interleaved practice (PMC4989027)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4989027/): interleaved schedules beat blocked repetition in music learning; in-session fluency is a poor indicator of long-term learning.
- [CIRL: Retrieval practice, spaced practice and interleaving](https://cirl.etoncollege.com/strategies-for-making-learning-last-retrieval-practice-spaced-practice-and-interleaving/) and [The Effortful Educator: Desiring Difficulties](https://theeffortfuleducator.com/2020/05/22/desiring-difficulties/): testing effect, spacing, desirable difficulties grounding.
- [A Preliminary Analysis of Mastery Criterion Level (PMC5843573)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5843573/) and [Structural Learning: Mastery Learning](https://www.structural-learning.com/post/mastery-learning): 80% is the most common practitioner criterion; higher criteria maintain better, motivating 85% plus per-quality floors.
- [ts-fsrs docs](https://open-spaced-repetition.github.io/ts-fsrs/) and [fsrs4anki tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md): rating scale (Again/Hard/Good/Easy), desired retention 0.9 default.
- [Training-induced plasticity in multisensory brain structures (PMC3343004)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3343004/): audiovisual music training drives stronger plasticity than unimodal training; supports playing the chord on every reveal.
