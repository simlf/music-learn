# Phase 1: Print Shop Foundation & Theory Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 1-print-shop-foundation-theory-core
**Areas discussed:** Fun & tone calibration, Error & empty-state personality, Showcase page extras

---

## Fun & tone calibration

### Overall playfulness level

| Option | Description | Selected |
|--------|-------------|----------|
| Warm & witty | Friendly, lightly humorous copy; charming print shop owner voice | ✓ |
| Full playground | Jokes, celebratory animations, mascot-level personality | |
| Subtle charm only | Neutral copy; fun only from tactile details | ✓ (combined) |

**User's choice:** "warm & witty + subtle charm can be a great combo"
**Notes:** Framing directive from command invocation: fun, not too serious, not conservatory-strict; the goal is to enjoy playing and come back.

### Uppercase mono status-bar register

| Option | Description | Selected |
|--------|-------------|----------|
| Keep style, warm the words | Uppercase mono stays; wording becomes friendly telegram | ✓ |
| Drop the uppercase register | Sentence case everywhere | |
| Mix by context | Uppercase for wins, sentence case for errors | |

### Motion baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Tasteful print effects | Stamp-in chord glyph, staggered key ink-fill, press-into-paper buttons, ≤300ms | ✓ |
| Minimal for now | Just hover/press transitions | |
| Go expressive | Richer cascades and flourishes | |

### French flavor

| Option | Description | Selected |
|--------|-------------|----------|
| Occasional French winks | English copy with sparing "Et voilà", "Bravo" | ✓ |
| Keep it all English | Full immersion, solfège labels only French | |
| Fully French UI | All copy in French | |

---

## Error & empty-state personality

### Unrecognized-symbol error tone

| Option | Description | Selected |
|--------|-------------|----------|
| Playful shrug + help | Shop admits it's stumped with charm; rotating hint variants; previous result stays | ✓ |
| Neutral + helpful | Straightforward but kind | |
| Assume & suggest | Fuzzy "did you mean?" matching | |

### Empty state feel

| Option | Description | Selected |
|--------|-------------|----------|
| Invitation with a starter | Warm nudge + 2–3 clickable example chords | ✓ |
| Show a chord by default | Page opens with a chord already rendered | |
| Simple friendly text | Warmer wording only, no examples | |

### Success/confirmation beat

| Option | Description | Selected |
|--------|-------------|----------|
| Stamp animation is the reward | No extra text or badge; the stamp is the delight | ✓ |
| Stamp + occasional wink | Adds occasional status-bar one-liner | |
| Just show it | Instant render, no beat | |

**Notes:** During this area the user separately instructed (side message): avoid em dashes in all user-facing app copy; rewrite with periods, colons, or commas. Recorded as persistent memory and as decision D-05 in CONTEXT.md.

---

## Showcase page extras

### "Surprise me" random-chord button

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add it | Ghost button, random supported chord; doubles as engine spot-check | ✓ |
| Skip for Phase 1 | Keep showcase minimal | |

### Audio playback

| Option | Description | Selected |
|--------|-------------|----------|
| Simple synth playback | "Hear it" action with plain Tone.js synth | ✓ |
| No audio in Phase 1 | Purely visual foundations | |
| Realistic piano sound | @tonejs/piano samples | |

### Info depth on showcase

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both, as specced | Alias line + interval-formula chips | ✓ |
| Add a one-line "shape hint" | Extra teaching sentence | |
| Trim to essentials | Chord + keyboard + notes only | |

### Keyboard diagram span

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Delegate span choice to research/planning | ✓ |
| Fixed two octaves | Always C to C to C | |
| One octave, wrapped notes | Pitch-class view | |

---

## Claude's Discretion

- Keyboard diagram span: pick what renders every v1 chord fully from its root without cramping mobile width.
- Theory engine internals, data model, and test strategy.

## Deferred Ideas

- Fuzzy "did you mean Cm7?" suggestions (possible Phase 2 lookup polish)
- Realistic sampled piano sound (@tonejs/piano) — later, if ear training arrives
- Shape-first explanation sentences on showcase — Phase 7 lessons
