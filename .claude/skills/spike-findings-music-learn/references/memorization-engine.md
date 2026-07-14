# Memorization Engine (SRS + multi-modal recall)

Synthesized from spikes 006 (FSRS recall loop) and 009 (recall modes). These two are one system: the multi-modal thesis IS the FSRS card model.

## Requirements (non-negotiable)

- **SRS card unit = (fact, mode), not fact.** `Cm7|see-play`, `Cm7|hear-name`, `Cm7|formula-build`, `Cm7|notes-symbol` are separate FSRS cards that share a `factId`. Each is an independent retrieval path with its own stability.
- **FSRS config `enable_short_term: false`.** The default `true` gives sub-day learning steps (New+Good due in ~10 min), which breaks a once-a-day recall app. With it off: New+Again=1d, Hard=2d, Good=3d, Easy=8d.
- **Rehydrate `Date` fields at the storage boundary.** `Card.due` / `Card.last_review` are `Date` objects and silently become strings through JSON/localStorage/IndexedDB. Passing a string back to `repeat()`/`next()` breaks date math with no throw. Coerce with Zod `.coerce.date()`.
- **Ear/notes -> symbol modes are multiple-choice only** against the canonical symbol, with same-root distractors. `Chord.detect` leaks inversions/enharmonics so never free-text grade it.
- **Mode B (name-chord-by-ear) never gates progress**; lowest rotation weight; pair with the always-on reveal sound as an ear-training on-ramp.
- Local-first: localStorage in spike, Dexie/IndexedDB in the real build (query-by-due-date, growing review log). Per-device for v1, no server.

## How to Build It

**Split scheduling from storage** (mirrors how `audio.ts` isolates its engine):

- `src/lib/srs/scheduler.ts` — pure wrapper over ts-fsrs, Vitest-tested against fixed intervals.
- `src/lib/srs/deck.ts` — persistence over Dexie; rehydrate Dates on read.

```js
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({
  enable_short_term: false,   // day-scale intervals (the load-bearing config)
  request_retention: 0.9,
  enable_fuzz: false          // deterministic tests; revisit later to spread same-day piles
}));

let card = createEmptyCard(new Date());          // state:New, due:now

// Preview all four outcomes without committing -> label the grade buttons ("Good -> 3d"):
const preview = scheduler.repeat(card, new Date());   // RecordLog keyed by Rating
preview[Rating.Good].card;

// Commit a rating:
const result = scheduler.next(card, new Date(), Rating.Good);   // RecordLogItem
card = result.card;   // updated Card (Date-typed due/last_review)
result.log;           // ReviewLog -> optional history table for weight-optimization
```

- `Rating`: Again=1, Hard=2, Good=3, Easy=4 (Manual=0). `State`: New=0, Learning=1, Review=2, Relearning=3.
- **Grade from elapsed answer time** (transfer the "R3" mechanic): wrong -> Again, slow-correct -> Hard, correct -> Good, fast -> Easy. This makes the scheduler surface the weak *path* per fact.
- **Store per card:** the raw FSRS `Card` (`due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review`) + stable `factId` + `factKind` + `mode`.
- **Generate facts from `tonal`** (`Chord.get(sym).notes`) so the deck stays in sync with the theory engine.
- **Session model:** due = `card.due <= now`; keep an in-memory queue and re-enqueue `Again` cards for the current session regardless of FSRS due date (Anki-style second look).

**Multi-modal rotation (from 009):**

- Modes: A recognition->production (symbol -> play notes) = the spine / product value; C formula->build (fading scaffold, see construction-mode.md); D notes->symbol (cheap reverse of A, multiple-choice); B ear->naming (multiple-choice, demoted).
- **Rotate per-fact when TEACHING a new chord** (A->C->D back-to-back on one chord makes multi-modal encoding felt and delivers interleaving). **Space per-mode when REVIEWING** known chords (back-to-back same-fact modes test working memory, not long-term recall).
- **Stagger mode introduction** so FSRS never gets four brand-new cards for one fact at once (overwhelm + expertise-reversal). Graduate A/C first, unlock D, then B.
- Don't drill every mode of every fact every session: pick 1-2 modes per encounter targeting the fact's weakest paths.

**The recall map** (fact x mode grid filling ✓✗✓✓) is a strong progress UI. It makes "multiple retrieval paths to one fact" legible and motivating. Keep it in the real app.

## What to Avoid

- Do NOT hand-roll SM-2. FSRS is strictly better and is the stack choice.
- Do NOT trust the ts-fsrs README defaults: docs are v6, dep is pinned v5.4.1. Core API (`repeat`/`next`/`Rating`/`createEmptyCard`/`State`) is identical but verify *defaults* against the installed version.
- Do NOT read `lapses` as "total times wrong" — it only counts `Review -> Again` transitions (forgotten after graduating). With `enable_short_term:false`, `New+Again` graduates to `Review`, not `Relearning`.
- Do NOT free-text grade ear/notes->symbol via `Chord.detect` (leaks `['Cm7','Eb6/C']` etc.).
- Do NOT let ear-naming gate progress or carry high rotation weight.

## Constraints

- `ts-fsrs@5.4.1`, Node >=20. `maximum_interval` default 36500.
- Repeated Good chain (short-term off): 3 -> 14 -> 57 -> 196 -> 586 days. A lapse contracts stability hard (2.3 -> 0.64).
- ear->name is a 4-way guess without sound even with MC; only fair when choices share the root (quality-by-ear, not root-by-ear).

## Origin

Synthesized from spikes: 006, 009
Source files: sources/006-srs-recall-loop/, sources/009-recall-modes/
