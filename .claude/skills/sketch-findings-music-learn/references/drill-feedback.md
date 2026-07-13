# Drill Feedback

## Design Decisions

**Merged feedback keyboard (Sketch 001, Variant A "Colors + Gray"):**

- After a wrong construction answer, the INPUT keyboard transforms in place on Check into the feedback view. This REPLACES the current two-keyboard layout (input keyboard + separate correct-answer keyboard) and can subsume the "You played: / Correct:" text diff.
- All correct chord notes fill with the locked interval colors (root vermilion `--color-root`, third verdigris `--color-third`, fifth tan `--color-fifth`, seventh mustard `--color-seventh`), each tagged with its letter name.
- Wrong extra notes the user played fill a warm gray and get a small `✕` tag:
  - white keys: `#b8b0a0` (sketch var `--color-wrong`)
  - black keys: `#8f877a` (sketch var `--color-wrong-deep`)
  - These grays are sketch-proposed values, NOT yet in app.css. Add as new tokens additively (e.g. `--color-wrong`, `--color-wrong-deep`) per the established convention.
- NO played-vs-missed distinction among correct notes. The answer is the message. (Variant B's solid/hollow distinction and Variant C's preserved hatch were rejected as busier without teaching more.)
- A one-line legend renders under the "not quite" headline: swatch + "The chord", swatch + "Your extra note".
- The existing stamp-in animation (240ms scale/opacity) fires on the transformed keys; respect `prefers-reduced-motion`.
- Feedback works at one-octave phone width (Phase 9 responsive-octaves rule): highlights wrap into the visible octave as pitch classes.

## CSS Patterns

Key fills on top of the existing PianoKeyboard classes:

```css
/* wrong-extra gray (new tokens to add to app.css) */
.key--wrong        { background-color: var(--color-wrong); }        /* #b8b0a0 */
.key--black.key--wrong { background-color: var(--color-wrong-deep); } /* #8f877a */

/* reveal animation reuses the app's stamp beat */
@keyframes stamp-in {
  0%   { transform: scale(0.96); opacity: 0; }
  60%  { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); }
}
.stamped { animation: stamp-in 240ms ease-out; }
@media (prefers-reduced-motion: reduce) { .stamped { animation: none; } }
```

Legend line (mono status register):

```html
<div class="legend">
  <span><span class="sw" style="background:var(--color-third)"></span>The chord</span>
  <span><span class="sw" style="background:var(--color-wrong)"></span>Your extra note</span>
</div>
```

## HTML Structures

State machine per key at reveal (pitch-class based, octave-agnostic):

```
inTarget            -> interval color fill + letter tag (e.g. "E♭")
!inTarget && played -> wrong gray fill + "✕" tag
otherwise           -> unchanged key
```

Controls swap on Check: Check/Clear row hides, feedback block (headline, legend, interval-formula chips, Next) shows. Next resets to a fresh question.

## What to Avoid

- **Variant B (hollow missed):** solid = played-correct, hollow colored outline = missed-correct. Rejected: extra visual grammar without enough added teaching value; outline treatment gets murky on black keys.
- **Variant C (hatch memory):** keeping the user's selection hatch under the reveal colors. Rejected: reads as noise over the interval-color language.
- Keeping two keyboards on screen after answering — wastes vertical space, splits attention, worst on phone.

## Origin

Synthesized from sketch: 001
Source file: sources/001-merged-feedback-keyboard/index.html (all 3 variants preserved, winner tab marked ★)
