# Counting-Hint Grammar, Shape Legibility & Inversions

One shared visual grammar for "how many semitones / which third / where to land," reused
across name-it feedback (021), the new inversion drill (023), and the progression scaffold
(024). Session 7 (2026-07-26), from post-v2.2 on-device UAT.

## Design Decisions

### The shared counting-chip grammar (021, 023, 024)
The unit is a **tone chip + gap chip** row, read left→right as a stacked chord:
- **Tone chip** — a small box tinted by its interval role (root vermilion, third verdigris,
  fifth tan, seventh mustard — the LOCKED interval color language), holding the note name or
  role label.
- **Gap chip** between two tone chips — the interval to the next tone. Two visual states:
  - **minor third** → solid ink fill (`+m3` / `+3` semitones)
  - **major third** → outline only, no fill (`+M3` / `+4` semitones)
This fill-vs-outline pairing is the whole point: a beginner sees the *shape* (small-big-small =
m7) without reading letters. It replaces the old illegible grey mono line `M7: M3 · M3 · M3`.

### 021 — name-it feedback legibility (winner A)
After answering, the correct chord's third pattern renders as this chip row instead of grey
uppercase mono text. Each quality has a recognizable silhouette (m7 = m3·M3·m3, Maj7 =
M3·m3·M3, m7♭5 = m3·m3·M3). A short legend maps `+m3`=3 semitones / `+M3`=4 semitones.
**Why A won over B (glyph+strip) and C (vertical stack):** A reuses the exact Build-it chip
language the user already knows, so the pattern reads as one consistent grammar app-wide.

### 024 — progression on-ramp scaffold (winner A + beginner keyboard)
The earn-the-symbol progression drill (017) hard-blocked a beginner: roman numeral only, no
counting hints, no way to derive the chord. Fix = an **escalating optional hint ladder**
(the locked 010-A / 005 fading-scaffold pattern), rung by rung:
1. **the degree** — "ii de Si♭ majeur → fondamentale Do"
2. **quality + count** — the counting-chip row (R +3 +4 +3)
3. **show me** — ghost-hatched keys on the keyboard
The symbol stays hidden (earn-the-symbol payoff preserved); the ladder fades as the FSRS card
matures. **Beginner refinement:** the keyboard is reduced to the tonic's **one octave** (fewer
keys = less overwhelming), widening to two octaves as level rises — the live 2-octave span was
part of what made the first cold item overwhelming.

### 023 — inversion drill (winner B + 024-A hint graft)
New drill family: play a chord in a named inversion (Cm7 root / 1st / 2nd / 3rd). **B (one
inversion at a time)** won because it drops straight into the existing one-item hybrid queue;
the ladder (A) and slot-shift (C) are richer teaching views but need more surface. The bass
note is emphasized with an **ink ring + "B" badge**; role colors stay fixed across all
inversions (only the order changes) so the learner sees "same 4 notes, different bass." Grafted
with 024-A's escalating hint ladder (bass note → stack order from the bass → ghost keys) so the
user is guided early and it goes cold as the card matures.

## CSS Patterns

Role-tinted tone chips + fill/outline gap chips (the counting grammar):
```css
.tone-chip.root    { background: var(--color-root);    color: var(--color-on-root); }
.tone-chip.third   { background: var(--color-third);   color: var(--color-on-third); }
.tone-chip.fifth   { background: var(--color-fifth);   color: var(--color-on-fifth); }
.tone-chip.seventh { background: var(--color-seventh); color: var(--color-on-seventh); }
.gap-chip.m3 { background: var(--color-ink); color: var(--color-paper-bright); } /* minor: solid */
.gap-chip.M3 { background: var(--color-paper-bright); border: 2px solid var(--color-ink); } /* major: outline */
```

Ghost-hatched hint key (shared with SK-019 subtract treatment — "allowed, not required / land here"):
```css
.ghost { background: repeating-linear-gradient(45deg, transparent, transparent 4px,
         var(--color-faint) 4px, var(--color-faint) 5px);
         outline: 2px dashed var(--color-faint); outline-offset: -3px; }
```

Bass-note emphasis on an inversion keyboard:
```css
.bass-ring  { outline: 3px solid var(--color-ink); outline-offset: -3px; z-index: 4; }
.bass-badge { position: absolute; top: 2px; left: 2px; font: 700 8px var(--font-mono);
              background: var(--color-ink); color: #fff; padding: 1px 3px; }
```

Escalating hint ladder (stacked bordered rungs, richest content last — 010-A pattern):
```css
.rung { border: 1px solid var(--color-ink); border-top: none; padding: 10px 14px;
        background: var(--color-paper-bright); }
.rung:first-of-type { border-top: 1px solid var(--color-ink); }
.rung .tag { font: 700 10px var(--font-mono); text-transform: uppercase;
             letter-spacing: .08em; color: var(--color-muted); display: block; }
```

## HTML Structures

Counting-chip row (name-it feedback, progression hint, inversion hint all share this):
```html
<div class="chiprow">
  <div class="tone-chip root">Do</div><div class="gap-chip m3">+m3</div>
  <div class="tone-chip third">Mi♭</div><div class="gap-chip M3">+M3</div>
  <div class="tone-chip fifth">Sol</div><div class="gap-chip m3">+m3</div>
  <div class="tone-chip seventh">Si♭</div>
</div>
```

## What to Avoid
- **Grey uppercase mono for the shape line** (`M7: M3 · M3 · M3`) — the exact thing 021
  replaces. Illegible; no way to tell minor from major third at a glance.
- **Always-on inline hints** (024-C) — a permanent crutch that kills the earn-the-symbol
  payoff. Hints must be escalating + optional + fade with card maturity.
- **Full 2-octave keyboard for a cold beginner item** — overwhelming. Reduce to one octave
  until level rises.
- **Deriving a progression chord from a roman numeral with zero scaffold** — the original
  hard-block. Never leave a beginner with no rung to climb.
- **Recoloring notes across inversions** — role colors must stay fixed so "same notes,
  different bass" reads; only order changes.

## Non-visual follow-up (flagged, not sketched)
Hybrid-queue ordering (`composePracticeQueue`) should not lead a cold, low-mastery session
with a scaffold-heavy progression or inversion item — that was the real reason the drill
"popped first" and stalled the session.

## Origin
Synthesized from sketches: 021, 023, 024 (with 022's voicing simplification in
contextual-learning-metacognition.md).
Source files: sources/021-shape-pattern-chips/, sources/023-inversion-drill/,
sources/024-progression-scaffold/.
