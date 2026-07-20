# Contextual Learning & Metacognition

Session 6 (2026-07-20), frontier pass from the v2.1 improvement backlog (I-02 progressions, I-04 voicings, I-05 confidence). Theme: move from isolated-chord drilling to real-music context, with all help staged by learner maturity.

## Design Decisions

### Progression drill = lead-sheet container + derive-then-play (017 synthesis, LOCKED)

The progression drill is NOT a new drill chrome; it is a lead-sheet measure grid as the container with the existing two-step drill inside each bar.

- **Sheet grid:** 4 measures per row, `border-left` bar lines, song title in serif italic with the ◈ from-my-songs provenance mark (011 pattern). Chord **symbols hidden until earned** (shown as `?`), **roman numerals always visible** under each bar.
- **Cursor bar:** vermilion 3px left edge + faint vermilion wash; played bars turn verdigris.
- **Per-bar two-step:** step 1 = name the chord from the numeral via multiple-choice chips (same-key distractors, e.g. for V of B♭: B♭7 / F7 / C7 / Fm7); step 2 = play it on the docked keyboard. Register slot tracks the step (`STEP 1: NAME THE V` → `STEP 2: PLAY IT` → `BAR 2 DONE · NEXT: I`).
- **Key banner:** mono uppercase strip `KEY: B♭ MAJOR` + progress, always above the prompt.
- Rejected as standalone: A progression rail (context without earning), pure B roman-first (no song context), pure C read-through (symbols given away, no derivation step).

### Shell voicings = help staged by FSRS card state (019 synthesis, LOCKED — "very good for beginners")

Extends the 005 fading-scaffold rule from label hints to voicing pedagogy. One flow, three stages keyed to the card's FSRS state:

1. **NEW (Meet):** C's compare card, shown once: root-position keyboard vs shell keyboard stacked, with when-to-use labels ("what you know" / "what players use").
2. **LEARNING (Subtract):** B's subtraction drain: full 4-note stack rendered, dock tap removes root + fifth to ghost hatch with the teach panel ("Drop what the symbol already tells you: root is named, fifth adds no color; keep the 3rd + 7th tritone").
3. **REVIEW (Drill):** A's cold drill: 3-position voicing selector (Root / Shell / Rootless A) above the prompt, shell answer = 2 notes.

- **Ghost-hatch = optional, not wrong:** unplayed-but-allowed notes render with the ink-hatch pattern at low opacity plus a tiny mono `R`/`5` marker on the key. Distinct from the gray ✕ "wrong extra" treatment (001).
- Step indicator: mono uppercase `1 Meet / 2 Subtract / 3 Drill` chips, current inverted ink.
- French risk noted: selector labels (FONDAMENTALE) need abbreviation per the 013 register rule.

### Confidence capture = optional inline dots (020-B, LOCKED)

- Three serif glyph buttons `?` (not sure) `~` (somewhat) `!` (certain), 44px square, zero radius, under the chord glyph in content flow, with a one-line mono legend.
- **Optional, never blocks Reveal.** Skipping logs the review as "unrated". Deliberate exception to the 014 docked-actions rule: rating is enrichment, not a required action, so it may live in scrolling content; Reveal itself stays docked.
- Rejected: A dock strip with a locked Reveal (guaranteed data but forced friction on 20+ due cards invites mindless mashing).
- **Payoff surface (020-C, companion not competitor):** /progress gets a confidence-vs-correctness view: 3-bar calibration chart with a vermilion `MISCALIBRATED` flag when certain-accuracy < somewhat-accuracy, plus a confident-but-wrong card list (serif symbol + mono meta `certain 3× wrong · see-play`) with a "Drill the danger cards" CTA. OPEN: bar chart vs denser 3x2 matrix (right/wrong × 3 confidence levels with cell captions lucky/learning/solid/aware/danger); decide at implementation.

## CSS Patterns

```css
/* Lead-sheet measure grid (017) */
.measures { display: grid; grid-template-columns: repeat(4, 1fr); }
.measure { border-left: 1px solid var(--color-ink); padding: 8px 6px 12px; min-height: 56px; position: relative; }
.measure.cursor { background: rgba(200,80,46,0.08); }
.measure.cursor::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--color-vermilion); }
.measure.played .msym { color: var(--color-verdigris); }
.measure.future .msym { color: var(--color-faint); }

/* Ghost-hatch "optional note" (019) — distinct from wrong-extra gray */
.k-ghost { background-image: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(34,30,23,0.15) 3px, rgba(34,30,23,0.15) 5px); }
.k-ghost::after { content: attr(data-ghost); /* "R" or "5" */ position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 8px; color: var(--color-faint); font-family: var(--font-mono); }

/* Voicing selector (019 stage 3) */
.voicing-row { display: flex; border: 1px solid var(--color-ink); }
.vchip { flex: 1; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; padding: 9px 2px; border-right: 1px solid var(--color-ink); }
.vchip.on { background: var(--color-ink); color: var(--color-paper-bright); }

/* Confidence dots (020-B) */
.conf-dot { width: 44px; height: 44px; border: 1px solid var(--color-ink); font-family: var(--font-serif); font-size: 20px; border-radius: 0; }
.conf-dot.picked { background: var(--color-ink); color: var(--color-paper-bright); }
```

## HTML Structures

- 017: `.sheet > .sheet-title + .measures*n`, then key banner, then the standard drill area (glyph or numeral, chips, docked keyboard + Check). Function reveal panel reuses the teach-panel pattern (ink border, paper-bright, vermilion mono kicker like `FUNCTION: DOMINANT`).
- 019: stage containers swapped by card state; the compare card reuses the lookup vcard pattern (`h4` mono label + `.use` right-aligned muted context + mini keyboard).
- 020: dots sit between prompt-line and content; grade buttons unchanged.

## What to Avoid

- Giving away chord symbols in the progression grid up front: earning them bar-by-bar is the drill.
- Forcing confidence rating before Reveal (dock-strip variant): rating fatigue produces junk data.
- Rendering optional voicing notes with the wrong-extra gray ✕: reads as an error, not permission.
- Showing the voicing compare intro on every encounter: once per NEW card only, then it is scaffolding to fade.

## Origin

Synthesized from sketches: 017, 019, 020
Source files available in: sources/017-progression-drill/, sources/019-shell-voicings/, sources/020-confidence-calibration/
