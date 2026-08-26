# Design: the guided path

**Status:** design, ready to execute. Written to be executed by an agent that has not read the brief.
**Scope:** how an ordered, stateful, 14-unit music-theory curriculum coexists with the existing FSRS practice hub.
**Date:** 2026-07-28
**Copy rule for everything specified here:** no em dashes in user-facing strings. Periods, colons, commas.

---

## 1. Recommendation

Make `/learn` the path. Do not add a fifth hub. A "unit" is a pure data record in a new `src/lib/path/` module that **orders and gates facts but never owns a card**, and a unit's completion is **derived** from the FSRS cards the user already has (`deriveCellState(...) === 'mastered'`, `src/lib/srs/deck.ts:350-377`) plus a tiny `music-learn:path` localStorage record holding only "I read this" markers and synthetic-drill proof counts. That single choice answers the two hardest questions at once: there is **no Dexie schema change** (the DB stays `version(1)`, `src/lib/srs/deck.ts:105-107`) and there is **no migration**, because the owner's existing review history *is* the path's progress, so on first open several units are already complete. Gating is **soft**: everything is reachable, exactly one unit is marked "Next". The real hard ordering happens invisibly, in the deck: `introduceNewCards` stops walking the catalog array and starts walking a path-derived order, which is a one-line change at `src/lib/srs/deck.ts:232` and fixes the bug where all 96 chord spellings are introduced before the first interval fact. The tier ladder (`src/lib/practice/tiers.ts`, `src/lib/practice/levelState.ts`) is **deleted**, not reused: it is already a no-op control, and its ordering is a chord-quality ordering that the concept ordering subsumes. Lesson-to-drill handoff keeps the existing localStorage one-shot mechanism (`src/lib/practice/drillSeeds.ts`) but widens its payload from `string[]` of chord symbols to a discriminated union that can express any of the six practice families. A path lesson never occupies a slot in the bounded 12-question daily round: reading is a separate act on `/learn`, the proof drill is prepended ahead of the day's composed cards (seeds lead and are held out of the daily slice, section 7.3), and `/practice` advertises a new unit with exactly one self-hiding line.

---

## 2. Ground truth: what the code actually does today

Every claim below was read. Line references are to the state of `main` in this worktree unless a branch is named.

### 2.1 The four hubs

| Route | Owns | File |
|---|---|---|
| `/` | Chord lookup, "Drill it" handoff (`setDrillSeeds`) | `src/routes/+page.svelte:189-191`, `:340` |
| `/practice` | One "Start practice" button over a hybrid FSRS + synthetic queue, six families | `src/routes/practice/+page.svelte` |
| `/learn` | Flat unordered scroll: `TheoryLessons` + `ScaleExplorer exploreOnly` + a 5-quality interval reference | `src/routes/learn/+page.svelte:43-77` |
| `/progress` | 3 tabs: stats/streak, Recall (Review + Map), Songs | `src/routes/progress/+page.svelte:20-64` |

Nav renders from one array, used by both the desktop masthead and the phone bottom tab bar: `src/routes/+layout.svelte:22-27` (`navLinks`), reused verbatim as `bottomTabLinks` at `:63`. A dev-only guard at `:79-87` throws if a nav link has no `TAB_ICONS` entry, so adding a hub means adding an icon too.

### 2.2 `/learn` has no order and no state

`src/routes/learn/+page.svelte` renders three sections in source order with no index, no progress mark, no completion notion, and no prerequisite. `TheoryLessons.svelte` is seven `<section>` blocks (`:85-217`): the interactive thirds lesson, then symbol, sevenths, anchor (diatonic sevenths of C), dominant, diminished, solfege. Measured prose volume: about 370 words of long strings in `src/lib/i18n/messages/theory.ts` (en) plus about 58 in `src/lib/i18n/messages/learn.ts` (en), plus the four thirds-lesson steps. It is short, and most of it is good.

The one interactive lesson holds **no persisted state at all**: "no props, no persisted state (resets on reload, per the deferred cross-session persistence decision)", `src/lib/components/InteractiveLesson.svelte:27`. Its steps are hardcoded: `const steps = THIRDS_LESSON` at `:31`. Its audio and keyboard are hardcoded to a C root (`playChord(['C', thirdLetter])` at `:107`). Its handoff writes chord symbols only, at `:179` (`setLessonSeeds(THIRDS_LESSON_DRILL_SEEDS)`, which is `['C', 'Cm']`, `src/lib/lessons/thirdsLesson.ts:142`).

The `LessonStep[]` shape was deliberately built generic for exactly this expansion: "future lessons (triads, sevenths, and beyond) can be added as additional `LessonStep[]` arrays without changing the component's rendering or grading logic. Only the thirds lesson ships this phase; the extensibility is structural, not yet exercised by a second lesson." (`src/lib/lessons/thirdsLesson.ts:8-12`). That promise is real and cashable: the only blocker is that `InteractiveLesson.svelte` hardcodes the array and the C root.

### 2.3 The introduction-order bug is exactly as described

`src/lib/srs/facts.ts:101-105` builds the catalog as `[...buildChordFormulaFacts(), ...buildIntervalSizeFacts(), ...buildScaleDegreeFacts()]`, that is 96 chord, then 12 interval, then 84 scale-degree, 192 total. `introduceNewCards` walks `allFacts()` in that order and breaks at the limit: `for (const fact of allFacts()) { if (factsTouched >= limit) break; ... }` (`src/lib/srs/deck.ts:232-234`). The daily cap is 10 new facts (`MAX_NEW_CARDS_PER_DAY = 10`, `src/lib/srs/introBudget.ts:24`). So the first interval fact appears around day 10 or 11 and the first scale degree around day 12, behind the 96 chords they are prerequisites for. Confirmed, not inferred.

A second, worse consequence nobody has named: `familyForCard` returns `null` for `scale-degree` and `scale-formula` (`src/lib/practice/practiceQueue.ts:142-150`), and `cardsToQueueItems` drops null-family cards (`:164-186`). So all 84 scale-degree facts are introduced into the deck and then **never appear in the Practice hub at all**. They are only reviewable on `/progress` > Recall > Review (`src/lib/components/RecallSession.svelte:1067-1072`). The daily habit loop cannot reach a third of the catalog.

### 2.4 The tier ladder is a control that does nothing

`src/lib/practice/tiers.ts:32-82` defines 6 tiers, with 5 and 6 `available: false` (`:70-81`). Live importers of `tiers.ts`: `src/lib/components/LevelPicker.svelte:3` and `src/lib/components/ProgressStats.svelte:24`. Live importers of `levelState.ts`: the same two files. `LevelPicker.svelte` has **zero** importers outside its own test (`src/lib/components/levelPicker.test.ts`), so the tier UI is unmounted. `ProgressStats.svelte:399-425` does render a tier picker inside the "Practice Settings" card, and `selectTier` (`:198-200`) writes `music-learn:level` through `setCurrentTier`. **Nothing reads that value to filter practice.** The only consumer was `src/lib/practice/pool.ts` (`itemsForTiers` at `:24, :154, :242, :266`), and `pool.ts` has no importers outside its own test and one stale comment (`src/lib/drills/generateQuestion.ts:132`).

`checkUnlock` (`src/lib/practice/levelState.ts:145-207`) is additionally unusable offline: it reads server `StatItem[]`, and with `stats: null` every per-quality check fails (`:158`, `:163-176`), so `eligible` is always `false` (`:189-195`). The optional Fastify backend is often unreachable. A gate that cannot open offline is not a gate.

`DIFFICULTY_LADDER` (`tiers.ts:99-120`) has no importer at all outside `tiers.test.ts:6`.

Concurrent branch `claude/t2-dead-code` already deletes `LevelPicker.svelte`, `levelPicker.test.ts`, `pool.ts`, `scaffold.ts`, and `BottomSheet.svelte`. After that lands, `tiers.ts` + `levelState.ts` exist solely to feed a picker in Practice Settings that changes nothing.

### 2.5 What already exists and is better than the audit implies

- **Both interval directions ship.** `generateIntervalQuestion` already produces `identification` (two notes shown, name the interval, 4 choices) and `construction` (root shown, tap the note a m3 above C), `src/lib/drills/generateIntervalQuestion.ts:16-31`, rendered by `src/lib/components/PracticeIntervalDrill.svelte`. What is missing is a **spelling-aware** direction, because the distractor picker deliberately excludes semitone-identical names (`:58-59`, `if (candidate.semitones === correct.semitones) continue;`) and `DRILL_INTERVALS` (`src/lib/theory/interval.ts:124-137`) contains only 12 simple intervals with no enharmonic pair (`A4` is there, `d5` is not; `M2` is there, `A2` is not). So "C to E♭ is a minor third, C to D♯ is an augmented second" is currently unaskable.
- **The scale-construction drill is fully built and unreachable.** `createScaleConstruction` (`src/lib/practice/construction.ts:151-161`) plus `BuildSession`'s scale branch (`src/lib/components/BuildSession.svelte:225-232`, `:244-247`) produce the app's only statement of W-W-H-W-W-W-H, and they render only when `embedFact` is absent (`:49-64`). Both mount sites pass `embedFact`: `src/routes/practice/+page.svelte:623-626` (`{kind: 'chord'}`) and `src/lib/components/RecallSession.svelte:1037`. The `scale-formula:{tonic}` card shape already persists and round-trips through the Zod boundary, proven by `src/lib/srs/deck.test.ts:443-454`. Making unit 2's drill reachable is a prop change plus a seed kind, nothing more.
- **The progression engine already knows harmonic function and roman numerals.** `RomanFunction = 'tonic' | 'subdominant' | 'dominant'` per bar (`src/lib/practice/progressions.ts:21`), the diatonic seventh qualities per degree (`:76-85`), the minor-mode borrowed V7 convention with its own documented rationale (`:85-95`), and a `major-ii-V-I` template (`:104-112`). Units 8, 9, 10, 13 need copy, not engine.
- **The mastery criterion and its visualisation exist.** `masteryDayCount >= 2` across distinct local days gates `'mastered'` (`src/lib/srs/deck.ts:318-327`, `:367-368`), and `RecallMap.svelte` renders every fact by mode in four states.

### 2.6 One piece of shipped theory that is wrong

`src/lib/i18n/messages/voicings.ts:45-46`, key `voicings.subtract.teach`: "Drop what the symbol already tells you: root is named, fifth adds no color; keep the 3rd + 7th tritone." The 3rd and 7th form a tritone only in a dominant 7 and a m7♭5. In `Cmaj7` they are E and B (a perfect fifth); in `Cm7` they are E♭ and B♭ (a perfect fifth). The sentence is false for two of the five qualities the drill teaches, and the framing is subtraction ("drop the root and fifth") rather than voice leading ("the 7th becomes the next chord's 3rd"). Unit 11 owns fixing this.

### 2.7 Concurrent work this design must sit on top of

Six sibling worktrees are editing `src/` right now. Two matter to this design:

- **`claude/t3-daily-session`** adds `src/lib/practice/dailySession.ts` with `DAILY_TARGET = 12`, a `music-learn:daily-session` ledger (`today` + `previous` day summaries, `answered`/`correct`/`streak`/`bestStreak`/`missed`/`done`), `remainingDailyTarget()`, `markDoneToday()`, and adds `sliceRound(queue, target)` plus a delayed in-session retry option to `advanceHybridQueue` in `src/lib/practice/practiceQueue.ts`. **This design assumes those land.** If they do not, substitute "the whole due queue" for "the 12-question round" everywhere below; nothing else changes.
- **`claude/t5-curriculum-core`** already rewrites the thirds lesson to teach number + quality in half steps rather than a keyboard recipe, with an explicit prohibition in the source comment against "that black key is a minor third". Unit 1 and unit 4 build on that, they do not redo it.

`claude/t2-dead-code` removes `LevelPicker` and `pool.ts` (see 2.4). `claude/t4-false-theory-copy` fixes the Lookup "Why these notes?" third explanation.

---

## 3. The decision: IA

### 3.1 `/learn` becomes the path

`/learn` is rewritten from a flat scroll into an **ordered list of 14 units**, each a collapsed row carrying: an index, a title, the one idea in a single line, and a status mark. Exactly one row is marked "Next". Tapping a row expands or navigates to that unit's lesson surface. Below the ordered list, a clearly separated **Reference** section keeps the non-sequential material that is genuinely reference and not curriculum: the scale explorer (`ScaleExplorer exploreOnly`) and the 5-quality interval reference.

The path is the whole of `/learn`. There is no "Learn vs Path" distinction to explain, no second tab, no new icon, no fifth slot in `navLinks`.

`/practice` gets exactly one new element: a single line above the "Start practice" button when a unit is newly available and unread. It links to `/learn`. It self-hides otherwise. It never occupies a queue slot and never auto-navigates.

### 3.2 Rejected: a fifth hub `/path`

Loses on three counts.

1. It costs a bottom-tab slot and a new `TAB_ICONS` entry (`src/routes/+layout.svelte:43-51`). The app deliberately collapsed 10 routes into 4 one milestone ago and deleted the "More" sheet precisely so no overflow affordance would be needed. Five tabs is not fatal at 56px slots, but it reverses a decision that was made on purpose.
2. It forces the user to answer "what is the difference between Learn and Path?" every time he opens the app. There is no honest answer, because the path *is* the curriculum. Two surfaces holding one concept means content duplication and drift.
3. The only genuine argument for a hub is discoverability, and the one-line cue on `/practice` buys that for a fraction of the cost, in the place the habit already lives.

### 3.3 Rejected: the front door of `/practice`

Fatal. The practice hub is a 90-second drill loop. Putting a reading gate in front of it makes every session longer, which the brief names as a regression by definition. It also confuses the two concerns this design exists to separate: `/practice` is a *review* surface driven by FSRS due dates, and a curriculum is an *introduction* surface driven by prerequisites. Keeping them on different routes keeps that boundary legible in the code as well as the UI.

---

## 4. The decision: data model

### 4.1 A unit orders and gates facts. It never owns a card.

New pure module, no DOM, no Dexie, no Svelte, matching the house purity convention in `src/lib/theory/` and `src/lib/practice/`:

```
src/lib/path/units.ts       the 14 UnitDefs (pure data)
src/lib/path/introOrder.ts  the path-derived fact introduction order
src/lib/path/status.ts      pure unitStatus() over CardRecord[] + PathRecord
src/lib/path/pathState.ts   the music-learn:path localStorage seam
```

```ts
// src/lib/path/units.ts
export type UnitId =
  | 'half-steps' | 'major-scale' | 'degrees' | 'interval-naming'
  | 'triads' | 'sevenths' | 'symbol' | 'diatonic'
  | 'function' | 'ii-V-I' | 'guide-tones' | 'inversions'
  | 'minor' | 'chart-vocabulary';

/**
 * A card-shaped identity, deliberately looser than srs/facts.ts's Fact union
 * so a predicate can also match a factId the catalog does not contain
 * (scale-formula:{tonic} is created by BuildSession but is intentionally not
 * a catalog Fact, src/lib/srs/facts.ts:120-130).
 */
export interface FactRef { factId: string; factKind: FactKind; }

export interface ProofSpec {
  /** Which cards prove this unit. Total, pure, no storage access. */
  selects(ref: FactRef, mode: Mode): boolean;
  /** How many distinct selected facts must reach 'mastered'. */
  masteredTarget: number;
  /**
   * For units whose only drill is a synthetic (non-carded) family, the
   * number of completed rounds that counts as proof instead. Exactly one of
   * masteredTarget / syntheticRounds is non-zero per unit.
   */
  syntheticRounds: number;
  syntheticFamily?: PracticeFamily;
}

export interface UnitDef {
  id: UnitId;
  order: number;                 // 1..14, the display and introduction order
  titleKey: MessageKey;
  /** The one idea, one sentence. Rendered on the collapsed row. */
  ideaKey: MessageKey;
  requires: UnitId[];
  /** What this unit's lesson surface is. */
  lesson: LessonRef;
  /** The proof handoff written to the seed channel by "Prove it". */
  seeds: PathSeed[];
  proof: ProofSpec;
  /**
   * The curated factIds this unit puts at the FRONT of the deck's
   * introduction order. A small, hand-picked subset of what `proof.selects`
   * matches (4 to 12 ids), never the whole space.
   */
  introduces: string[];
}

export const UNITS: readonly UnitDef[] = [ /* 14 entries */ ];
```

`LessonRef` is a discriminated union so a unit can point at whatever surface it needs without the path module importing any component:

```ts
export type LessonRef =
  | { kind: 'interactive'; lessonId: 'thirds' | 'interval-naming' | 'degrees' | ... }
  | { kind: 'prose'; sectionId: 'symbol' | 'sevenths' | 'dominant' | 'diminished' | ... }
  | { kind: 'explorer'; explorer: 'scale' };
```

The `/learn` host maps `LessonRef` to a component. `units.ts` stays pure data.

### 4.2 Relationship to `Fact` / `Mode` / `CardRecord`: order and gate, never own

- **Order.** `introOrder.ts` exports `introductionOrder(): Fact[]`. It is `[curated ids from UNITS in unit order, resolved via factById] ++ [every remaining allFacts() entry in catalog order]`. Unknown ids are skipped, never thrown on (totality convention). `introduceNewCards` iterates this instead of `allFacts()`: one changed line at `src/lib/srs/deck.ts:232`, one added import. The teach cluster, the retrofit second pass, the budget, and the return-count semantics all stay byte-identical.
- **Gate.** `status.ts` exports a pure `unitStatus(unit, cards, path, now): UnitStatus`. It reads `CardRecord[]` (the host already fetches these via `getAllCards()`) and the `PathRecord`. It writes nothing.
- **Never own.** No unit adds a field to `CardRecord`, a value to the `factKind` enum, or a row to the catalog. The one exception is unit 3, which adds a `Mode` value (section 6.3) and unit 4, which adds three `interval-size` facts inside the existing kind (section 6.4). Neither is a Dexie migration.

### 4.3 The only new persistence

```ts
// src/lib/path/pathState.ts
export const PATH_KEY = 'music-learn:path';

export interface PathRecord {
  /** Unit ids whose lesson reached its last step. Never a progress claim. */
  read: UnitId[];
  /** Completed synthetic-drill rounds per unit (units 9,10,11,12,13). */
  proofCounts: Partial<Record<UnitId, number>>;
}
```

Defensive read (corrupt or absent parses as `{read: [], proofCounts: {}}`), write failures degrade to a no-op. Copy the exact idiom from `src/lib/srs/introBudget.ts:41-73`, which is the house pattern: `isBudgetRecord` shape guard, `try`/`catch` around both directions, availability over durability.

Nothing in this record can lose review history. If `music-learn:path` is wiped, the user loses "I read unit 4" and a handful of synthetic round counts, and every carded unit's proven state reappears immediately because it is derived from Dexie.

---

## 5. The decision: completion and gating

### 5.1 Completion is two independent marks, and it is derived

```ts
export type UnitStatus =
  | 'locked-soft'   // prerequisites not complete. Still openable.
  | 'next'          // the single recommended unit
  | 'reading'       // opened, not finished
  | 'read'          // lesson finished, proof not met
  | 'complete';     // read AND proven
```

- `read` comes from `PathRecord.read` (localStorage).
- `proven` is derived. For a carded unit: count the distinct facts matched by `proof.selects` whose card in one of the unit's modes satisfies `deriveCellState(card, now) === 'mastered'`, and compare to `masteredTarget`. **Reuse `deriveCellState` verbatim.** Do not extend it, do not add a fifth `CellState`, do not add a second criterion. It already encodes the successive-relearning rule the project chose deliberately (`src/lib/srs/deck.ts:361-368`).
- For a synthetic-only unit (9, 10, 11, 12, 13): `proofCounts[unitId] >= syntheticRounds`.

`next` is the lowest-`order` unit that is not `complete` and whose `requires` are all `complete`. Exactly one unit ever carries it.

### 5.2 Gating is soft. Argue it, do not assume it.

**Everything is reachable. One thing is recommended.** A `locked-soft` unit that the user opens renders one line at the top: "This one leans on unit {N}, {title}. Read that first if it feels thin." Nothing is disabled, nothing is hidden, no padlock glyph.

Four reasons, in order of force:

1. **The mastery criterion makes hard gating arithmetically hostile.** `masteryDayCount` increments at most once per local calendar day (`src/lib/srs/deck.ts:318-327`) and `'mastered'` needs 2. A hard chain of 14 units therefore takes a *minimum* of 14 calendar days before unit 14 is even visible, and realistically far more because a unit needs several facts mastered, not one. That is not a curriculum, it is a drip feed. Soft gating lets a strong day carry the user forward.
2. **Hard gating creates an unrecoverable dead end in a single-user app with no support channel.** If a proof drill has a bug, or a criterion is unreachable for any reason, the owner is locked out of the *entire remaining curriculum* with no override and nobody to ask. Soft gating degrades to "the recommendation is wrong today", which costs nothing.
3. **The learner is a competent adult who reads Beethoven.** He already hears the difference between a major and a minor third; what he lacks is the vocabulary. Refusing to show him unit 12 because unit 5 is not "mastered" contradicts what the app knows about him. He is also the sole author of this app: gating him out of his own content is absurd.
4. **The anti-guilt discipline.** The streak badge self-hides at zero (`src/lib/components/StreakBadge.svelte:9`), and `zeroStreak` copy "never mentions a count and never scolds" and reads identically for a first visit and a lapsed 40-day run (`src/lib/copy/streak.ts:11-16`). A grid of padlocks is the single most scolding surface a learning app can render. It is out of character for this codebase.

The one place hard ordering *is* correct is invisible to the user: the deck's introduction order (section 4.2). The user is never told "you may not learn this yet"; the deck simply teaches prerequisites first.

### 5.3 What is deliberately not reused

`checkUnlock` / `UNLOCK_CRITERIA` (`src/lib/practice/levelState.ts:22-30`, `:145-207`) is not reused for anything. It needs the server, it fails closed offline, and its criteria (rolling 30-answer window, per-quality lifetime accuracy) are about chord-quality difficulty, not about concepts. It dies with the tier ladder.

---

## 6. Unit table

Status legend: **has** = ships and is correct; **partial** = something ships but the idea is not stated or is incomplete; **lacks** = not present as instruction.

| # | Unit | The one idea | Prereq | Proof drill | Status | Needs |
|---|---|---|---|---|---|---|
| 1 | Half steps and whole steps | Every distance in music is counted in half steps. A whole step is two of them. | none | Interval drill on `m2` and `M2`, both existing directions | partial: `claude/t5-curriculum-core` teaches the unit inside the thirds lesson, but there is no unit that owns it | new lesson (`LessonStep[]`). No new FactKind. No schema change. |
| 2 | The major scale is the ruler | Seven notes, W W H W W W H, the same shape in all 12 keys. | 1 | `BuildSession` scale mode seeded for a tonic; `ScaleKeyboardDrill` as the softer rung | built but unreachable (`src/lib/components/BuildSession.svelte:225-232` gated off by `embedFact`) | wiring only: a `build-scale` seed kind and `embedFact={{kind:'scale', tonic}}`. `scale-formula:{tonic}` already round-trips (`deck.test.ts:443-454`). No new FactKind, no schema change. |
| 3 | Scale degrees, and why numbers beat letters | 1 3 5 is the same shape in every key, so you learn one shape instead of twelve. | 2 | Scale-degree drill, **both** directions: degree to note (exists) and note to degree (new) | partial: 84 facts exist, the why is never stated, the inverse direction does not exist, and scale-degree cards never reach `/practice` at all (`practiceQueue.ts:142-150`) | new lesson; **new `Mode` value** `'degree-name'` in the Zod enum at `src/lib/srs/deck.ts:82`; a practice render branch; make scale-degree cards routable into the practice queue. No Dexie version bump. |
| 4 | Interval = number + quality | The number counts letter names, the quality counts half steps. That is why C to E♭ is a minor third and C to D♯ is an augmented second. | 1 | Interval drill, **new `spelling` direction**: two spelled notes in, the full name out | lacks. Highest-value single addition in the whole plan. | new lesson; new question direction in `generateIntervalQuestion.ts`; three new `interval-size` facts (`A2`, `d5`, `d7`) inside the existing FactKind; update the catalog-size pin in `src/lib/srs/facts.test.ts`. No new FactKind, no schema change. |
| 5 | Triads: root, third, fifth | The third is the mood switch. The fifth is the frame. | 4 | name-it and build-it on the 6 white-key triads (existing) | drilled from day one, taught nowhere. The perfect fifth is introduced nowhere. | content only. |
| 6 | Seventh chords: one more third | Which triad, times which seventh. | 5 | name-it and build-it on `maj7`/`m7`/`7` (existing) | **has**. The app's best work. `CountingChipRow` shape grammar and `mnemonics.ts` both live here. | re-shelve only. Do not touch the copy. |
| 7 | Reading the symbol | Root, then quality, then extras. | 6 | Lookup, then name-it | **has** | re-shelve only. |
| 8 | Which chords live in a key | Harmonise the scale and the qualities fall out in one fixed order: maj7 m7 m7 maj7 7 m7 m7♭5, the same in every key. Learn seven numbers, not 84 chords. | 3, 6 | Progression drill on `major-turnaround-I-vi-ii-V` | partial: one C-only paragraph (`theory.anchor.*`), numerals used but never defined | content, plus a roman-numeral strip reading the existing degree tables at `src/lib/practice/progressions.ts:76-85`. No engine work. |
| 9 | Function: tonic, subdominant, dominant | Chords have jobs. The pull you hear is a tritone resolving. | 8 | Progression drill, which already labels each bar's function (`progressions.ts:21`) | partial: the V7 lesson is excellent, the three words are revealed by a drill but never defined | content only. Synthetic proof counter. |
| 10 | ii-V-I, the jazz sentence | Approach, push, arrive. The roots fall in fifths. | 9 | Progression drill seeded to `major-ii-V-I` (`progressions.ts:104-112`) | good drill, zero explanation | content, plus the `progression` seed kind. |
| 11 | Guide tones and voice leading | The 7th of one chord becomes the 3rd of the next, and it moves by a half step. That is why two notes sound like music. | 10 | Voicing drill, with its rationale corrected | drill exists, rationale is factually wrong (`src/lib/i18n/messages/voicings.ts:45-46`) | content, plus rewrite `voicings.subtract.teach` in en and fr. Synthetic proof counter. |
| 12 | Inversions and slash chords | Same notes, different bass. | 5 | Inversion drill (`InversionDrill.svelte`, engine at `src/lib/practice/inversions.ts`) | drilled cold, taught nowhere | content, plus the `inversion` seed kind. Synthetic proof counter. |
| 13 | Minor keys and the borrowed V7 | Jazz raises the 7th so V still pulls home in minor. That is where m7♭5 and °7 live. | 10 | Progression drill on the minor ii-V-i template | ships unexplained, though the engine already encodes the convention with a rationale comment (`progressions.ts:85-95`) | content only. Do not disturb the ø7-vs-°7 lesson, which is correct. |
| 14 | The rest of the chart vocabulary | 6, m6, sus4, add9, 9, 13, m(maj7), alt, and how to fake what you do not know. | 7, 11 | Shell voicing on an unfamiliar symbol; name-it only if the catalog grows | lacks entirely. `available: false` in `tiers.ts:70-81`. Directly blocks the core value on real charts. | **largest item, owner decision required (section 9.1).** Either grow `QUALITY_SUFFIXES` (`src/lib/theory/randomChord.ts:20`) plus the reference matrix in `src/lib/theory/reference-chords.test.ts`, or ship lookup-only plus a shell strategy. No new FactKind, no schema change either way. |

### 6.1 New-unit sketches

Only the units that need real content are sketched. Each is: the one idea, the interaction, the drill that proves it.

**Unit 1, half steps and whole steps.** Idea: a half step is the smallest move on the keyboard, black or white, and every other distance is counted in half steps. Interaction: a 4-step `LessonStep[]` on the existing `InteractiveLesson` shell. Step 1, tap the key one half step above C (C♯). Step 2, tap the key one half step above E (F, and the point is that there is no black key there, so a half step is not "a black key"). Step 3, hear the two. Step 4, tap a whole step above C (D) and read that a whole step is two half steps. Proof: `interval-size:m2` and `interval-size:M2` reach `mastered` in the existing interval drill. `masteredTarget: 2`.

**Unit 2, the major scale is the ruler.** Idea: seven notes, W W H W W W H, and the pattern never changes, only the starting note. Interaction: a two-part unit. Read a 3-line statement of the pattern with the step chips, then tap "Build C major", which seeds `{kind: 'build-scale', tonic: 'C'}` and lands in `BuildSession`'s scale mode on `/practice`, where the existing engine already asks for each note in turn and names each step as "whole step" or "half step" (`phraseStep(..., {asScaleStep: true})`, `src/lib/theory/interval.ts:255-265`). Proof: `scale-formula:C`, `scale-formula:G`, `scale-formula:F` cards in mode `formula-build` reach `mastered`. `masteredTarget: 2` of 3.

**Unit 3, scale degrees.** Idea: naming notes by number instead of letter is what lets one shape work in twelve keys. Interaction: read the numbering over the existing `ScaleDegreeStrip`, then two drills. Direction A already exists ("degree 5 of E♭ major is which note?"). Direction B is new and is a new `Mode`: "In E♭ major, G is which degree?", answered by tapping one of seven numbered chips. Proof: 8 of the 21 `scale-degree` facts for tonics C, G, F reach `mastered`, counting either mode.

**Unit 4, interval = number + quality.** Idea: two independent numbers name every interval. The Roman-alphabet distance (C to E is three letter names, so a third) gives the *number*; the half-step count (4) gives the *quality*. Interaction: a 5-step `LessonStep[]`. Steps 1 to 3 establish "count the letters, then count the half steps" on C to E and C to E♭ (this is the ground `claude/t5-curriculum-core` already prepared inside the thirds lesson, so unit 4 should *extend* that array rather than restate it). Step 4 is the payoff: tap D♯, note that it is the same *sound* as E♭ but the letters C, D are only two names, so it is a **second**, an augmented one. Step 5 states the rule in one line: same sound, different spelling, different name, and that is why `Cdim7` has a B♭♭ and not an A. Proof: the new `spelling` direction on 5 intervals including at least one enharmonic pair. `masteredTarget: 5`.

**Unit 8, which chords live in a key.** Idea: harmonising a scale produces the same seven qualities in the same order in every key, so seven numbers replace 84 chords. Interaction: a key selector plus a seven-slot strip showing `I maj7, ii m7, iii m7, IV maj7, V7, vi m7, vii m7♭5` in the chosen key, each slot tappable to hear it. Every value read from `MAJOR_DIATONIC_QUALITIES` (`progressions.ts:76-85`) and `transposeFrom`, no new tables. Then "Prove it" seeds a `major-turnaround-I-vi-ii-V` progression. Proof: 3 completed progression rounds.

**Unit 9, function.** Idea: three jobs. Home (tonic), away (subdominant), pulling home (dominant). The pull is a tritone resolving. Interaction: three labelled example chords in one key with a "hear the pull" control (reuse the existing `hearResolution` two-chord pattern from `TheoryLessons.svelte:60-66`, which is already excellent), then a one-line bridge to the progression drill that already prints the function label per bar. Proof: 3 completed progression rounds.

**Unit 10, ii-V-I.** Idea: the three-word sentence jazz says constantly. Approach, push, arrive. The roots fall by a fifth each time. Interaction: one worked ii-V-I in C with the root motion drawn as D to G to C, plus the same three bars transposed to two more keys so the *shape* is what is remembered. Then "Prove it" seeds `{kind: 'progression', templateId: 'major-ii-V-I', key}`. Proof: 3 completed `major-ii-V-I` rounds.

**Unit 11, guide tones and voice leading.** Idea: the 7th of one chord becomes the 3rd of the next and moves down a half step, which is why a two-note left hand sounds like music. Interaction: `Dm7` to `G7` to `Cmaj7`, showing only the 3rd and 7th of each, with the moving voice highlighted: C (the 7th of Dm7) becomes B (the 3rd of G7), a half step down; F (the 7th of G7) becomes E (the 3rd of Cmaj7), a half step down. This is a *reason*, where today's copy gives a *rule*. Then correct `voicings.subtract.teach`: the shell is the 3rd and 7th because those two notes carry the quality and they are the ones that move; the tritone claim belongs to the dominant lesson, not here. Proof: 3 completed voicing rounds.

**Unit 12, inversions and slash chords.** Idea: the same four notes with a different note on the bottom, and the symbol after the slash is only telling you what the bass plays. Interaction: `Cmaj7` shown four ways with the bass note changing, each tappable to hear, plus the slash notation for each. Then "Prove it" seeds `{kind: 'inversion', symbol, inversionIndex}`. Proof: 3 completed inversion rounds.

**Unit 13, minor keys and the borrowed V7.** Idea: natural minor's v chord is minor and does not pull, so jazz raises the 7th degree to get a dominant V7 that does. That single change is where m7♭5 (the iiø) and °7 come from. Interaction: the C natural-minor scale, the m7 v chord, then the raised 7th and the resulting G7, with a hear-the-difference control. Proof: 3 completed minor ii-V-i progression rounds.

**Unit 14, the rest of the chart vocabulary.** Idea: the remaining symbols are decorations on shapes you already own, and when you meet one you do not know, play the shell and move on. Interaction: a scannable table of 6, m6, sus4, add9, 9, 13, m(maj7), alt, each with one line saying what it adds or changes to a shape from unit 6, every row tappable to hear it. Then a short "faking it" card: identify the root, decide major or minor family, play root plus 3rd plus 7th, ignore the number. Proof: 3 completed voicing rounds on unfamiliar symbols, or (if the catalog grows, section 9.1) name-it mastery on 6 of the new qualities.

### 6.2 FactKind and schema impact, summarised

| Change | Kind of change | Migration needed |
|---|---|---|
| `introductionOrder()` replaces `allFacts()` in `introduceNewCards` | pure ordering, no data | none |
| Unit 2 reaches `scale-formula:{tonic}` cards | already-supported factId shape, already Zod-valid (`deck.ts:81`), already round-trip-proven (`deck.test.ts:443-454`) | none |
| Unit 3 adds `Mode` value `'degree-name'` | one value added to the Zod enum at `deck.ts:82`. Dexie store is `'[factId+mode], factId, mode, due'` (`deck.ts:105-107`), keyed and indexed on the *field*, not on its value set. Old records still parse; new records parse. | **none.** No `version(2)`. |
| Unit 4 adds `A2`, `d5`, `d7` to `DRILL_INTERVALS` | catalog grows 192 to 195, all inside the existing `interval-size` kind. `factId` shape unchanged. | none. Update the size pin in `facts.test.ts`. |
| Unit 14, if `QUALITY_SUFFIXES` grows | catalog grows by 12 per added quality, all inside the existing `chord-formula` kind | none. Needs `reference-chords.test.ts` matrix rows and a recall-map row-count review. |
| Synthetic proof counts | new localStorage key `music-learn:path` | none |

**Zero Dexie schema versions are added by this design.** That is a hard requirement of the plan, not a happy accident, and any implementation that finds itself writing `version(2)` has taken a wrong turn.

### 6.3 Note on the new `Mode` and the recall map

`RecallMap.svelte:31-38` enumerates exactly four mode columns. Adding a fifth `Mode` value without adding a column means a `degree-name` card exists in Dexie and is simply not displayed on the map. That is the correct trade for now: the map's four columns are a designed fading-scaffold sequence ("recall the formula, build it, play it, name it by ear", `RecallMap.svelte:18-20`) and `degree-name` does not belong in it. Flagged as a deliberate, small, visible gap, not an oversight. Revisit only if the owner notices.

---

## 7. The proof loop and the daily loop

### 7.1 Handoff mechanism: keep localStorage one-shot, widen the payload

The existing mechanism is correct and should not be replaced. Two independent one-shot channels write to `localStorage` "rather than a query string, keeping the prerendered /drills route clean and surviving the navigation on every device" (`src/lib/practice/drillSeeds.ts:1-13`). With `adapter-static` and every route prerendered, a query-string handoff would mean either a non-prerenderable route or client-side URL parsing on a page that must render identically at build time. localStorage is the right seam.

What is wrong is the **payload shape**. `setDrillSeeds(symbols: string[])` can only express chord symbols, and `/practice`'s consumer hardcodes the rest: `const factId = \`chord-formula:${symbol}\`` and `const mode: Mode = 'see-play'` (`buildSeededItems` in `src/routes/practice/+page.svelte`). So today a lesson can only hand off to the see-play card. Units 1, 2, 3, 4, 9, 10, 11, 12 all need something else.

Add a third channel in the same module, same defensive idiom:

```ts
export type PathSeed =
  | { kind: 'card';        factId: string; mode: Mode }
  | { kind: 'build-scale'; tonic: string }
  | { kind: 'progression'; templateId: string; key: string }
  | { kind: 'inversion';   symbol: string; inversionIndex: number }
  | { kind: 'voicing';     symbol: string };

export const PATH_SEEDS_KEY = 'music-learn:path-seeds';
export function setPathSeeds(seeds: PathSeed[]): void;
export function consumePathSeeds(): PathSeed[];   // read + clear, one-shot
```

Those five kinds map one-to-one onto the four `HybridQueueItem` shapes plus `BuildSession`'s scale embed. `/practice`'s `buildSeededItems` gains a branch per kind and returns `HybridQueueItem[]` instead of `CardedQueueItem[]`. Ordering, in the same spirit as the existing `buildSeededItems` comment in `src/routes/practice/+page.svelte`: all three channels are drained on every load and **all three are honoured** (concatenated in order, path seeds first, then lesson, then drill, deduped by `factId`), so nothing leaks into a later session and nothing the user explicitly asked for is destroyed by a channel "winning". A seed whose target does not resolve is skipped silently, matching the existing tamper guard at `:177`.

The two legacy channels are left completely untouched, so Lookup's "Drill it" and Progress's "Drill these" behave byte-identically.

### 7.2 Proof reporting

Carded units need no reporting: their proof is derived from the cards the drill already writes.

Synthetic units do. `/practice`'s `completeSynthetic` (`src/routes/practice/+page.svelte:528-540`) is the single place a synthetic family finishes a round. Add one call there: `recordUnitProof(item.family)`, which increments `proofCounts` for whichever unit declares that `syntheticFamily`. Note that a synthetic item completes only after a correct play (`:520-526` documents that the embedded components never gate to completion on a wrong answer), so the counter is honest by construction.

### 7.3 The bounded daily round: a lesson sits above it, a proof leads it

Assuming `claude/t3-daily-session` lands (`DAILY_TARGET = 12`, `remainingDailyTarget()`, `sliceRound()`):

- **Reading a unit costs zero practice slots.** It happens on `/learn`. It does not touch `music-learn:daily-session`.
- **The proof drill leads the round, and it is never cut.** Seeds lead the queue and are held OUT of the daily slice: `sliceRound` receives only the composed half, and the round's budget is widened by two questions per seed (the seed plus its retry), so the bound on composed cards is unchanged. This is not negotiable wiring, it is the fix for a real defect: the seed channels are one-shot and drained before composing, so a seed the slice dropped was destroyed, not deferred (see the drill-seed bullet in `AGENTS.md`).
- **A unit's proof therefore does grow the round, by exactly its own size.** A 12-question day that begins with 4 proof items is 4 proof plus up to 12 review. If that is wrong for path seeds specifically - if proving a unit should cost review slots the way it costs the user's minutes - that is a design decision to make when the path lands, and it must not be implemented by re-slicing the seeds away. `sliceRound` still reports `waiting` honestly for the pre-start card, and the pre-start register names the requested surplus on its own clause ("2 ON REQUEST").

**The screen on a day where a unit unlocks and 12 reviews are due.** `/practice`, above the existing pre-start card:

```
NEW IN LEARN
Unit 4: how intervals get their names. About 2 minutes.        [Read it]

12 due today
[Start practice]
```

One line, one link, no modal, no interstitial, no auto-navigation. If he taps Start, the round is exactly what it is today. If he taps Read it, he lands on unit 4, reads it, taps Prove it, and comes back to a round whose first items are the new interval questions, ahead of the day's 12.

The cue self-hides when there is no unread available unit, matching `StreakBadge`'s compact self-hide (`src/lib/components/StreakBadge.svelte:9`). Its copy must read identically for unit 1 on day one and unit 9 on day ninety: no "finally", no "you're behind", no count of unread units. One unit at a time, no backlog language. That is the `zeroStreak` discipline (`src/lib/copy/streak.ts:11-16`) applied to a new surface.

**Ninety-second budget check.** 12 questions at roughly 7 seconds each is about 84 seconds. A unit read is 60 to 120 seconds. The design must never put both in one required flow, which is precisely why the cue is a link and not a queue item, and why the path lives on a different route.

---

## 8. Phased delivery

Each phase ships something usable on its own. No phase depends on a later one. Sizes are relative: S is a sitting, M is a day, L is more.

### Phase 1 (M): the spine, headless

Build the curriculum as data and fix the introduction order. No UI at all.

- New: `src/lib/path/units.ts` (14 `UnitDef`s, with `requires`, `introduces`, `proof`, `seeds`, `lesson`), `src/lib/path/introOrder.ts`, `src/lib/path/status.ts`, `src/lib/path/pathState.ts`, and a test file per module.
- Changed: `src/lib/srs/deck.ts:232` iterates `introductionOrder()` instead of `allFacts()`, plus one import. Nothing else in that file moves.
- **Ships:** on any deck that is not yet fully introduced, prerequisites now arrive before the facts that need them. On a fresh install, day one teaches half steps, C's scale degrees, and the three intervals that build a triad, instead of ten chord spellings. Visible immediately, no UI work.
- Verify: a unit test asserting the first 10 entries of `introductionOrder()` and that it is a permutation of `allFacts()` (nothing dropped, nothing duplicated). An `introduceNewCards` test asserting the first day's facts.

### Phase 2 (M): `/learn` becomes the path

Re-shelve the existing content into the ordered list. Write no new lessons yet.

- Changed: `src/routes/learn/+page.svelte` rewritten as the ordered unit list plus a separate Reference section holding `ScaleExplorer` and the interval reference block.
- New: `src/lib/components/PathList.svelte`, `src/lib/components/UnitCard.svelte`, `src/lib/i18n/messages/path.ts` (registered in `src/lib/i18n/messages/index.ts`, both `en` and `fr` spreads).
- Changed: `src/lib/components/TheoryLessons.svelte` gains an optional `only?: SectionId[]` prop so a unit can render just its own section. Omitting the prop keeps today's full render byte-identical.
- Changed: `src/lib/components/InteractiveLesson.svelte` gains optional `steps` and `seeds` props defaulting to `THIRDS_LESSON` and `THIRDS_LESSON_DRILL_SEEDS`. Also parameterise the hardcoded C root at `:96-101` and `:107` so a future lesson can anchor elsewhere. Omitting the props keeps today's render byte-identical.
- Changed: `src/routes/learn.test.ts` updated (it currently asserts the three-section flat layout).
- **Ships:** the curriculum has an order, a "you are here", and a completion mark. Units 6 and 7 are already `complete` for the owner on first open, from his existing FSRS state, with no migration. This is the phase where the design becomes visible.
- Verify: en and fr parity (enforced automatically by `src/lib/i18n/coverage.test.ts:363-372`, which walks the whole merged catalog). No em dashes in rendered copy (`learn.test.ts` already has that assertion, keep it).

### Phase 3 (S): the proof handoff

- Changed: `src/lib/practice/drillSeeds.ts` gains the `PathSeed` union channel. The two existing channels untouched.
- Changed: `src/routes/practice/+page.svelte`: `buildSeededItems` handles all five seed kinds and returns `HybridQueueItem[]`; `completeSynthetic` reports a proof count; the one-line next-unit cue is added above the pre-start card; the `BuildSession` mount accepts a scale embed target.
- Changed: `src/lib/path/pathState.ts` gains `recordUnitProof`.
- **Ships:** every unit that already has a drill can hand off to it and be marked proven. Unit 2's scale construction becomes reachable for the first time. The path advertises itself in the daily loop.
- Verify: a seed of each kind builds the right family; all three channels drain on one load; a wrong-kind or unresolvable seed is skipped without breaking the round; the cue self-hides with nothing new.

### Phase 4 (S): remove the tier ladder

Deliberately its own phase so Phase 2's diff tells one story.

- Deleted: `src/lib/practice/tiers.ts`, `src/lib/practice/tiers.test.ts`, `src/lib/practice/levelState.ts`, `src/lib/practice/levelState.test.ts`. (`LevelPicker.svelte` and `pool.ts` are already deleted by `claude/t2-dead-code`; if that has not landed, delete them here too.)
- Changed: `src/lib/components/ProgressStats.svelte` loses the tier block at `:399-425` and the `getLevelState`/`setCurrentTier`/`TIERS` imports at `:23-24`. The sound and study-mode toggles in the same card stay.
- Changed: `src/lib/i18n/messages/progress.ts` loses `progress.settings.tierPrefix`, `progress.settings.tierBlurb`, `progress.settings.tiersComingLater`, and `progress.tier.{1..6}.{name,blurb}` in both locales. Fold the tier 5 and 6 quality lists into unit 14's copy, which is where they belonged.
- Changed: the `levelState` mocks in `src/lib/i18n/coverage.test.ts:123-138`, `tests/progress.e2e.test.ts:44`, `tests/hub-consolidation.e2e.test.ts:119`, `tests/progress-hub.e2e.test.ts:51`, and the stale comment at `src/lib/drills/generateQuestion.ts:132`.
- **Ships:** one curriculum instead of two, and a settings card with no fake controls in it.

### Phase 5 (M): unit 4, the interval naming system

The audit's highest-value single addition. Independent of phases 6 to 8.

- New: `src/lib/lessons/intervalNamingLesson.ts` (a `LessonStep[]`, extending rather than restating what `claude/t5-curriculum-core` established).
- Changed: `src/lib/theory/interval.ts:124-137` adds `A2`, `d5`, `d7` to `DRILL_INTERVALS`.
- Changed: `src/lib/drills/generateIntervalQuestion.ts` gains a `spelling` direction that draws two spelled notes and asks for number plus quality. Note that the existing distractor rule at `:58-59` excludes semitone-identical names, so the spelling direction must not reuse `pickIntervalDistractors` as-is: for an enharmonic question the near-miss *is* the distractor.
- Changed: `src/lib/components/PracticeIntervalDrill.svelte` renders the new direction.
- Changed: `src/lib/srs/facts.test.ts` catalog-size pin, and any test asserting `DRILL_INTERVALS.length`.
- **Ships:** the app finally states why `Cdim7` contains a B♭♭ and not an A, and can drill it.

### Phase 6 (M): units 8, 9, 10, 13, the key and its sentences

Content plus one small reference component. No engine work: `progressions.ts` already has everything.

- New: `src/lib/components/DiatonicStrip.svelte` (seven slots read from `MAJOR_DIATONIC_QUALITIES` and `transposeFrom`), four lesson bodies in `src/lib/i18n/messages/path.ts`.
- Changed: `/learn` unit rendering wires each to its progression seed.
- **Ships:** the roman numerals and the three function words the drills already use are defined, in the key of the user's choosing.

### Phase 7 (M): units 3, 11, 12

- Changed: `src/lib/srs/deck.ts:82` adds `'degree-name'` to the `Mode` Zod enum (no `version(2)`). `src/lib/practice/practiceQueue.ts:142-150` routes `scale-degree` cards into the queue as their own family, fixing the "84 facts never reach `/practice`" gap in 2.3.
- New: a small `PracticeDegreeDrill.svelte` for the note-to-degree direction (seven numbered chips), plus a unit 12 inversion lesson and a unit 11 guide-tone lesson.
- Changed: `src/lib/i18n/messages/voicings.ts:45-46` (`voicings.subtract.teach`) rewritten to a true rationale, en and fr.
- **Ships:** the degree system becomes bidirectional and reaches the daily loop; two more taught-nowhere concepts get taught; one false statement leaves the app.
- Caution: adding a practice family touches `composePracticeQueue`'s family weave and `CUE_LABELS` (`src/routes/practice/+page.svelte:407-416`). Keep the change additive and assert the existing weave tests still pass unedited.

### Phase 8 (L): unit 14, the rest of the chart

Last, largest, and gated on an owner decision (9.1). If the answer is "lookup plus shell only", this phase drops to S and is content plus a table.

- If the catalog grows: `src/lib/theory/randomChord.ts:20` (`QUALITY_SUFFIXES`), `src/lib/theory/reference-chords.test.ts` (new matrix rows, one per root per added quality), `src/lib/copy/mnemonics.ts` (only where a genuinely good hook exists, honour the module's own "NEVER invent filler" rule at `:1-14`), plus a review of `RecallMap`'s row count and of the introduction budget cost.
- Either way: the unit 14 vocabulary table and the "faking it" card.
- **Ships:** the last standing blocker on the core value for real sheet music.

---

## 9. What this removes

Explicit, and the owner authorised aggressive removal.

1. **The tier ladder, entirely.** `src/lib/practice/tiers.ts` (`TIERS`, `DIFFICULTY_LADDER`, `itemsForTier`, `itemsForTiers`, `tierForQuality`, `splitSymbol`, `availableTierIds`, `tierById`), `src/lib/practice/levelState.ts` (`getLevelState`, `setCurrentTier`, `snoozeSuggestion`, `isSnoozed`, `checkUnlock`, `UNLOCK_CRITERIA`), and both test files. Reason: it gates nothing (2.4), it cannot open offline, and the concept ordering subsumes its quality ordering. Its tier 5 and 6 vocabulary survives as unit 14 content.
2. **The tier picker in Practice Settings.** `src/lib/components/ProgressStats.svelte:399-425` and its `progress.settings.tier*` / `progress.tier.*` i18n keys in both locales. A control the user can press that changes nothing is worse than no control.
3. **`LevelPicker.svelte` and its test.** Already dead (no importers). Already being deleted by `claude/t2-dead-code`; this design endorses that and does not resurrect it.
4. **The flat `/learn` list as an information architecture.** The *content* survives, every section of it, reassigned to a unit. What is removed is the unordered scroll, the "three sections" framing in `src/routes/learn/+page.svelte:43-77`, and the footer "Go to Practice" button, which the next-unit cue replaces from the other direction.
5. **The hardcoded single-lesson assumption in `InteractiveLesson.svelte`.** Not a deletion so much as the removal of a constraint: `const steps = THIRDS_LESSON` at `:31` and the C-anchored audio at `:96-107` become props. The default keeps today's render identical.
6. **The false tritone claim** in `voicings.subtract.teach` (`src/lib/i18n/messages/voicings.ts:45-46`), in both locales.

### What is explicitly NOT removed or touched

- The dominant / tritone lesson (`TheoryLessons.svelte:164-182` plus `hearResolution` at `:59-66`). It is the best thing in the app. Unit 9 links to it, it does not rewrite it.
- `src/lib/copy/mnemonics.ts`, including its "NEVER invent filler: better none than cheesy" rule.
- The ø7-vs-°7 lesson (`TheoryLessons.svelte:184-199`), which is correct.
- `CountingChipRow.svelte` and its shape grammar (m3 solid ink, M3 outline, so `m7` reads small-big-small). Units 5 and 6 reuse it as-is; nothing in this design changes its `stackedThirdsFor` source of truth.
- The anti-guilt copy discipline. Every new string specified here obeys it.
- FSRS itself: `scheduler.ts`, the grading path, `recordGrade`, `deriveCellState`, `masteryDayCount`, `selectReviewCards`, `interleaveQueue`. The path reads these. It never rewrites them.

---

## 10. Migration

**There is nothing to migrate, and that is the point of the derived-completion decision.**

- **Dexie stays `version(1)`.** No store change, no index change, no upgrade function. The two enum widenings (`Mode` gains `'degree-name'`, and `factKind` gains nothing at all) are Zod-level and forward-compatible: `CardRecordSchema` (`src/lib/srs/deck.ts:79-98`) parses old records unchanged, and `masteryDayCount` already demonstrates the pattern with its `.default(0)` for pre-IMP-01 records (`:96-97`).
- **The owner's review history becomes the path's progress with zero work.** On first open of the new `/learn`, `unitStatus` reads his existing cards and marks units 5, 6, and 7 `read`-pending-or-complete according to what he has actually mastered. Nothing is reset, nothing is recomputed, nothing is discarded.
- **Two devices, two independent local states, and that is acceptable.** Dexie is per-device and always has been (the project accepted per-device divergence deliberately; the optional backend is stats and streak only). The path adds one more per-device key, `music-learn:path`, holding read markers and synthetic counts. Consequence: reading unit 4 on the phone does not mark it read on the laptop. That is a cosmetic divergence of the same kind the app already accepts for streaks, and it is strictly better than the alternative, which would be a server dependency on a tailnet host with a hand-pasted bearer token.
- **Every new localStorage read is defensive.** Corrupt, absent, or wrong-shape data reads as "fresh", never throws, never wipes. Copy `src/lib/srs/introBudget.ts:41-73` exactly.
- **The one loss scenario, stated plainly.** If `music-learn:path` is cleared (browser storage wipe, PWA reinstall), the owner loses "I read unit N" and the synthetic proof counts. Every carded unit's proven state returns immediately from Dexie. No review history is at risk under any circumstance, because the path never writes a card and never deletes one.
- **No `introduceNewCards` behaviour change for already-introduced facts.** Reordering the iteration changes only *which unseen fact is next*. The retrofit second pass (`src/lib/srs/deck.ts:272-290`) and the intro budget are untouched, so a returning user's partially-seeded facts still retrofit on their own separate budget exactly as documented at `:196-206`.

---

## 11. Risks and open questions

### 11.1 Needs the owner's decision

1. **Unit 14: grow the chord catalog, or teach without drilling it?** Adding 6, m6, sus4, add9, 9, 13, m(maj7), alt to `QUALITY_SUFFIXES` grows the catalog from 96 chord facts to roughly 192, which is about 10 extra days of introduction budget at 10 per day, and roughly doubles the recall map's rows. The alternative is to teach unit 14 as a **lookup-plus-strategy** unit: the vocabulary is fully explained and fully lookup-able on `/`, and the drilled skill is "play the shell and move on" rather than "spell a C13 from memory". My recommendation is the second, because the stated core value is *reading a symbol in sheet music*, and for a 13th chord the correct real-world answer genuinely is the shell. But this is the unit that most directly touches the core value, so it is his call.
2. **Should the Reference block (scale explorer, 5-quality interval reference) stay on `/learn`?** A reference belongs next to Lookup, arguably on `/`. I left it on `/learn` to keep Phase 2's diff to one route and to avoid a second concurrent-conflict surface, but if he wants `/learn` to be *only* the path, moving those two blocks to `/` is a small, separate change.
3. **Soft gating: is one hard gate wanted for the very first session?** I chose fully soft (section 5.2). A single hard gate on unit 1 to unit 2 would guarantee that a first-ever session starts with half steps. It is a one-line change to `status.ts` if he wants it. I recommend against it, for reason 2 in 5.2.

### 11.2 Decided here, no input needed

- The path lives at `/learn`. No fifth hub. No new tab, no new icon, no change to `navLinks`.
- Completion is derived from FSRS, not stored. No Dexie migration, ever, for this feature.
- Gating is soft; introduction order is hard and invisible.
- The tier ladder is deleted rather than reused.
- The localStorage one-shot seed mechanism is kept and widened, not replaced.
- Note-to-degree is a new `Mode`, not a new `FactKind`. A `Mode` is defined in this codebase as a retrieval direction on the same underlying fact, which is exactly what it is.
- Synthetic-only units are proven by a completed-round counter, not by carding the synthetic families. Carding them would reverse Phase 27's and Phase 35's deliberate "no persisted-schema change" decisions.

### 11.3 Real risks

- **Concurrent-worktree collision.** Phase 3 edits `src/routes/practice/+page.svelte`, which `claude/t3-daily-session` is also editing. Phase 4 edits `ProgressStats.svelte` and several test mocks that `claude/t2-dead-code` touches. Land the sibling branches first, then rebase; do not try to merge these designs' phases into a branch that has not seen `t2` and `t3`.
- **Phase 7 touches the practice queue's family weave.** Adding a `degree` family changes `composePracticeQueue`'s inputs and `CUE_LABELS`. `practiceQueue.test.ts` has detailed weave assertions (no family 3-in-a-row, same-symbol anti-adjacency, the low-mastery first-pick guard). Those tests must pass **unedited**; if they need editing, the change was not additive and should be reconsidered.
- **The proven criterion may be too slow to feel like progress.** `masteryDayCount >= 2` means a unit cannot go from untouched to `complete` in one day, by design. Combined with soft gating this is fine (the user can read ahead), but the *copy* on a `read` unit must not read as failure. Suggested framing: "Read. Coming back in your practice." Not "Not yet proven."
- **Unit 4's `spelling` direction is the riskiest single piece of new drill logic.** Enharmonic-distinguishing questions invert the existing distractor policy (`generateIntervalQuestion.ts:58-59` currently *excludes* the exact answer the new question needs as a distractor). Budget real test coverage for it, and prefer a construction-style single-answer interaction over 4-choice if the choice generation gets awkward.
- **`introductionOrder()` must be a total permutation.** If a curated `introduces` id is misspelled, the fact must simply fall into the tail bucket, not vanish. Assert "output is a permutation of `allFacts()`" as a property test, not just a spot check on the first ten.

### 11.4 Claims in this document that are inferred rather than verified

- That `claude/t3-daily-session`'s `DAILY_TARGET = 12` and `sliceRound` will land as written. Read from that branch, not from `main`.
- The estimate "12 questions at roughly 7 seconds each is about 84 seconds". Not measured; based on the drill interaction shape, not on telemetry.
- The estimate that growing `QUALITY_SUFFIXES` by 8 qualities costs "about 10 extra days of introduction budget". Arithmetic from `MAX_NEW_CARDS_PER_DAY = 10` and 12 roots per quality, not an observed figure.
- That the owner's existing deck already has units 5, 6, 7 mastered. Plausible from the app's age and his usage, but no deck was read.
