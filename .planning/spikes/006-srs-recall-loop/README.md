---
spike: 006
name: srs-recall-loop
type: build
validates: "Given a theory-fact deck, when reviewed on an FSRS schedule, then due cards surface and grading spaces them correctly"
verdict: VALIDATED
related: []
tags: [learning, srs]
---

# Spike 006 — FSRS spaced-repetition recall loop

## What This Validates

Given a deck of ~19 jazz-theory facts (chord formulas like `Cm7 = 1 ♭3 5 ♭7 / C E♭ G B♭`,
interval sizes like "minor 3rd = 3 semitones", scale degrees like "degree 5 of F major = C"),
when the user runs a daily recall session scheduled by FSRS, then:

- due-today cards surface,
- grading (Again / Hard / Good / Easy) reschedules each card at growing intervals,
- an "Again" card resurfaces within the same session,
- and the loop feels like a genuine memory tool, not rote re-reading.

The question behind the question: is `ts-fsrs` real enough, and does its scheduling actually
*space* facts, to be the backbone of the app's "smart practice" promise? Or is a rolling
accuracy log good enough?

## Research

### Why active recall + spacing beats re-reading (the learning science)

- **Testing effect / active recall.** Retrieving a fact from memory strengthens it far more
  than re-reading it. Meta-analyses (Roediger & Karpicke, and the Dunlosky 2013 review that
  rated practice-testing and distributed practice as the two *highest-utility* study techniques)
  consistently show retrieval practice beats re-study, even though re-reading *feels* more
  productive. The demo enforces this by making you commit to an answer (mentally) before the
  "Reveal answer" button — the effortful recall is the mechanism, not a UI nicety.
- **Spacing effect.** The same number of reviews spread out over time produces dramatically
  better long-term retention than massed reviews (cramming). The catch: you must review a fact
  *just before you would have forgotten it*. That "when" is exactly what a scheduler computes.
- **Desirable difficulties (Bjork).** Making retrieval slightly hard — longer gaps, no hints —
  lowers performance *during practice* but raises long-term retention. An SRS scheduler is a
  desirable-difficulty engine: it keeps pushing intervals out to the edge of what you can recall.

### FSRS vs SM-2

- **SM-2** (legacy Anki, 1980s) tracks an "ease factor" per card and multiplies the interval by
  it on each success. It is simple but crude: it has no explicit model of memory and wastes
  reviews (over- and under-scheduling).
- **FSRS** (Free Spaced Repetition Scheduler) models each card with three variables:
  - **Difficulty (D)** — how hard the material is for you,
  - **Stability (S)** — how many days until recall probability decays to the target retention,
  - **Retrievability (R)** — current predicted recall probability, a function of S and elapsed days.
  A rating updates D and S via a 17-19 weight vector (`w`) fit to real review data; the next
  interval is chosen so R lands at `request_retention` (default 0.90). This is strictly more
  data-efficient than SM-2 and is now the default scheduler *inside* modern Anki. For this app it
  means fewer wasted reps and intervals that actually track how well a chord is sticking.

### Real `ts-fsrs@5.4.1` API (verified against the shipped bundle + a Node harness)

```js
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({ enable_short_term: false }));
let card = createEmptyCard(new Date());   // state:New, due:now, stability:0, difficulty:0, reps:0

// Preview all four outcomes without committing (used for the button labels):
const preview = scheduler.repeat(card, new Date());   // RecordLog keyed by Rating
preview[Rating.Good].card;                            // the Card you'd get from a Good

// Commit a rating:
const result = scheduler.next(card, new Date(), Rating.Good);  // one RecordLogItem
card = result.card;   // updated Card (Date-typed due / last_review)
result.log;           // ReviewLog (audit trail; store if you want analytics)
```

- **`Rating`**: `Again=1, Hard=2, Good=3, Easy=4` (`Manual=0`). Grade = the four non-Manual values.
- **`State`**: `New=0, Learning=1, Review=2, Relearning=3`.
- **`Card` fields**: `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`,
  `lapses`, `state`, `last_review`.
- **Verified defaults** (extracted from the `esm.sh` v5.4.1 bundle): `request_retention: 0.9`,
  `maximum_interval: 36500`, `enable_fuzz: false`, **`enable_short_term: true`**.

## How to Run

Pure static file, no build step. Either:

```bash
# from repo root, using the existing preview tooling:
#   launch config "spike006" serves this dir on http://localhost:4806
python3 -m http.server 4806 --directory .planning/spikes/006-srs-recall-loop
# then open http://localhost:4806
```

or just open `index.html` directly in a Chromium/Firefox browser (it imports `ts-fsrs@5.4.1`
and `tonal@6.4.3` from `esm.sh`, so it needs a network connection on first load).

## What to Expect

1. All 19 cards start **New** and **due now** (Day 0).
2. Click **Reveal answer** (recall it first!), hear the notes/interval play, then grade
   Again / Hard / Good / Easy. Each button shows the interval it will schedule (e.g. Good = 3d).
3. Graded cards leave the session; the "due now" counter drops. The scheduling table shows each
   card's state, reps, lapses, stability, and next-due.
4. Grade a card **Again** and it comes back later in the *same* session (Anki-style).
5. **Jump +1 day** to fast-forward the virtual clock. Cards resurface exactly when their FSRS
   due date arrives (a Good'd card reappears on Day 3, an Easy'd one on Day 8).
6. Everything persists to `localStorage`, so a reload resumes where you left off. **Reset deck**
   wipes it.

## Investigation Trail

**Iteration 1 — confirm the API shape.** Fetched the ts-fsrs README/docs. Confirmed
`repeat()` (preview all ratings, returns a `RecordLog`) and `next()` (commit one rating, returns
a `RecordLogItem` with `.card` + `.log`). Confirmed `createEmptyCard`, `Rating`, `State`.

**Iteration 2 — the short-term-scheduler trap.** GitHub raw URLs 404'd for v5.4.1 source, so I
pulled the actual shipped bundle from `esm.sh/ts-fsrs@5.4.1` and grepped the minified defaults:
`enable_fuzz=false`, **`enable_short_term=true`**. That default matters enormously. I ran a Node
harness against the bundle to see real intervals:

```
DEFAULT (enable_short_term:true):
  New + Again: due in ~0.001d    New + Good: due in ~0.007d (~10 min)   New + Easy: 8d
  Good chain: 0.01 -> 2 -> 11 -> 46 -> 163 (days)   <- first step is sub-day

enable_short_term:false:
  New + Again: 1d   New + Hard: 2d   New + Good: 3d   New + Easy: 8d
  Good chain: 3 -> 14 -> 57 -> 196 -> 586 (days)     <- clean day-scale spacing
```

With the default, a new card graded Good is due again in ~10 minutes — sub-day "learning steps".
That is correct for a cram-in-one-sitting Anki flow, but it makes a "jump +1 day" simulation
meaningless and does not match a *once-a-day* recall app. **Decision: set
`enable_short_term: false`** for clean day-scale intervals. This is the single most important
config finding of the spike.

**Iteration 3 — build the loop + probe edge cases in Node** (before any UI), replicating the
exact queue/persistence logic:

- *All-new deck*: 3/3 due on Day 0. Pass.
- *Grade all Good*: 0 due Day 0, 0 due Day 1, 3 due Day 3 (3-day interval). Pass.
- *Rehydration*: after `JSON.stringify`/`parse`, `card.due` is a **string** and `.getTime()` is
  `undefined` — passing it straight back would silently break date math. Rehydrating to `Date`
  fixes it and `scheduler.next()` reschedules correctly. **Confirmed gotcha.**
- *Again resurfaces same session*: grading `a` Again pushed it to the end of the queue
  (`bca`); after `b` and `c` it reappeared. Pass.
- *Everything-due after a big jump*: 0 due Day 0 → 1 due Day 5 → 2 due Day 100. Pass.
- *Spacing actually grows*: Good chain `3 -> 14 -> 57 -> 196 -> 586` is monotonically increasing.
- *Again shrinks*: a lapse dropped stability `2.3 -> 0.64` and pulled the next review way in.

**Iteration 4 — real browser smoke test** (served on :4806, driven headless): no console errors;
`esm.sh` resolved both `ts-fsrs` and `tonal` sub-packages; 19 cards rendered due. Verified the
live flow: reveal shows `1 ♭3 5 ♭7 = C E♭ G B♭` (tonal-derived, glyph-formatted); grade buttons
read `Again 1d / Hard 2d / Good 3d / Easy 8d`; grading Cm7 Good dropped the count 19→18 and set
its row to `Review / reps 1 / stability 2.3 / 3d`; jumping to Day 3 brought Cm7 back to "due now";
`localStorage` persisted card state (`state:2, reps:1, stability:2.31`) and `dayOffset:3` across a
reload — with `due` stored as a string, exactly the rehydration case handled on load.

## Results

**Verdict: VALIDATED.**

### Evidence

- Real `ts-fsrs@5.4.1` drives the whole loop; no hand-rolled scheduling.
- Due-today surfacing, four-grade rescheduling, in-session "Again" resurfacing, day-jump
  resurfacing, and `localStorage` persistence all verified in a live browser (Iteration 4) and
  cross-checked in a deterministic Node harness (Iteration 3).
- Intervals genuinely space and grow (`3 -> 14 -> 57 -> 196 -> 586` days for repeated Good), and
  lapses genuinely contract (`stability 2.3 -> 0.64`). This is a real memory model, not a counter.
- It clearly beats the current rolling accuracy log: that log tells you *how* you did; FSRS tells
  you *what to review today and when next* — the actual job of a study tool.

### Surprises / gotchas (carry into the real build)

1. **`enable_short_term` defaults to `true`** and produces sub-day intervals for new cards. For a
   daily theory-recall app, set it to `false` (or embrace sub-day steps only if you also build a
   within-session "learning queue" UI). This flips the entire feel of the scheduler.
2. **Dates don't survive JSON.** `Card.due` / `Card.last_review` are `Date` objects; persisted to
   `localStorage`/IndexedDB they come back as strings. You must rehydrate to `Date` before calling
   `repeat()`/`next()`, or date math breaks silently (no throw). A Zod schema at the storage
   boundary should coerce these.
3. **Docs are v6, the pinned dep is v5.** The live README on GitHub/npm documents FSRS v6. The
   core API (`repeat`/`next`/`Rating`/`createEmptyCard`) is identical, but verify defaults against
   the *installed* version, not the docs. (v6 also adds first-class `learning_steps` arrays.)
4. **`repeat()` is a gift for UX.** Previewing all four outcomes lets each grade button show its
   resulting interval ("Good → 3d") for free. That transparency is a big part of why the loop
   feels like a tool and not a black box — worth keeping in the real UI.
5. `New + Again` graduates to `Review` state (not `Relearning`) with `enable_short_term:false`,
   and `lapses` only increments on a `Review -> Again` transition. Don't treat `lapses` as
   "total times wrong"; it's "times forgotten after graduating".

### Recommendation for the real build

- **Use `ts-fsrs`, drop the idea of hand-rolling SM-2.** It is the right backbone for "smart
  practice."
- **Config**: `fsrs(generatorParameters({ enable_short_term: false, request_retention: 0.9 }))`.
  Keep `enable_fuzz: false` for now (deterministic, easier to test); revisit fuzz later to avoid
  review pile-ups on the same day. Store `request_retention` as a user-tunable knob eventually.
- **What to store per card** (one record per theory fact): the raw FSRS `Card`
  (`due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review`)
  plus a stable `factId` and `factKind`. Optionally append each `ReviewLog` from `result.log` to a
  separate review-history table for future FSRS weight-optimization and analytics. This is exactly
  the query-by-due-date, growing-log workload the stack's **Dexie/IndexedDB** choice was made for
  — outgrows `localStorage`. **Rehydrate `Date` fields on read (Zod `.coerce.date()` at the
  boundary).**
- **Where the scheduler lives**: a thin pure module, e.g. `src/lib/srs/scheduler.ts`, wrapping
  `ts-fsrs` (init, `preview(card)`, `grade(card, rating)`), unit-tested with Vitest against the
  fixed-interval expectations above (`New+Good=3d`, monotonic Good chain, lapse contraction). Card
  *persistence* belongs in a `src/lib/srs/deck.ts` over Dexie; keep scheduling and storage
  separate so the math stays trivially testable (mirrors how `audio.ts` isolates its engine).
- **Facts are the deck.** Chord facts can be generated from `tonal` (`Chord.get(sym).notes`) so
  the deck stays in sync with the theory engine rather than being hand-transcribed. Seed a
  starter deck; let the SRS layer own scheduling state keyed by `factId`.
- **Session model**: due = `card.due <= now`. Keep an in-memory session queue and re-enqueue
  `Again` cards for the current session (independent of their FSRS due date) so a just-missed fact
  gets a second look today — this is what makes it feel like it's actively teaching you.
- **Per-device, for now.** State is local (localStorage in the spike → IndexedDB in the app),
  matching the single-user, local-first constraint. Cross-device sync stays a "later" concern; if
  it lands, sync the per-fact `Card` records + review log through a tiny KV/D1 store. No server is
  needed for v1.
