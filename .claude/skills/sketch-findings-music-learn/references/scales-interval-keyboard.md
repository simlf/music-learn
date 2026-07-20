# Scales & Interval Keyboard

## Design Decisions

**002 — Scale tonic-anchored (winner B: degree strip).** The live `/scales` page rendered every scale on a fixed C-to-C two-octave span, so a non-C scale (E♭ major) started a third of the way in, wrapped its top degrees into the second octave, and left both ends blank — the tonic never anchored the eye. Variant A (anchored one-octave piano) fixed the wrap but left black-key tonics (E♭, A♭) as a narrow floating left edge, still awkward. Variant B drops piano geometry entirely: seven degree cells plus the octave, numbered 1–8, colored by degree role, each showing note + solfège. It reads as one clean run in every key, including black-key tonics, and directly teaches the 1–2–3–4–5–6–7–8 numbering that the scale drill (004) reuses. This has already shipped to the live page.

**003 — Interval distance badge (winner C for desktop, A as compact fallback).** Highlighted keys already carry interval-from-root as a background color; the ask was to also show the interval abbreviation (R, m3, P5, m7...) readable on the key. Variant B (badge stacked under the note label, inside the key) was rejected — needs vertical room and is cramped on black keys, especially with three lines of text. Variant A (corner tab pinned to the key top) is the most compact and works in the phone drill keyboard where vertical room is scarce, but shares the key face with the NoteLabel. Variant C (badge floats above the keyboard on a tick, one per highlighted note) gives the clearest read of the interval stack without ever crowding the key, at the cost of a reserved height strip above the keys — best where that headroom exists (desktop lookup view). Decision: use C where there's headroom, A as the compact fallback.

**004 — Scale drill ascending (winner A: degree ladder).** New "play the scale ascending" drill needed a way to show progress and cue the next expected note. Variant C (bare mono register line, "STEP 3 OF 8") matches existing drill chrome exactly but gives the least help. Variant B (ghost outline on the next expected key + step counter) is closest to playing a real instrument — least hand-holding, good for graduation once the shape is known. Variant A (a 1-to-8 ladder above the keyboard that fills vermilion as each degree is played, with the next rung outlined) makes both progress and target legible without reading the keys at all, and it reuses the degree-strip vocabulary from 002. Recommended arc: start on A for beginners, fade to B as mastery grows (mirrors the app's existing fading-scaffold pattern).

## CSS Patterns

Degree-strip cells (002-B) — abstract, no piano geometry, one row of equal-width cells:

```css
.strip { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3px; margin: var(--space-4) 0; }
.cell { border: 2px solid var(--color-ink); min-height: 96px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; }
.strip .cell.deg-root    { background: var(--color-root);    color: var(--color-on-root); }
.strip .cell.deg-second  { background: var(--color-second);  color: var(--color-on-second); }
.strip .cell.deg-third   { background: var(--color-third);   color: var(--color-on-third); }
.strip .cell.deg-fourth  { background: var(--color-fourth);  color: var(--color-on-fourth); }
.strip .cell.deg-fifth   { background: var(--color-fifth);   color: var(--color-on-fifth); }
.strip .cell.deg-sixth   { background: var(--color-sixth);   color: var(--color-on-sixth); }
.strip .cell.deg-seventh { background: var(--color-seventh); color: var(--color-on-seventh); }
.cell .big  { font: 700 var(--text-heading)/1 var(--font-serif); }
.cell .ring { font: 700 10px/1 var(--font-mono); letter-spacing: 0.1em; border: 1.5px solid currentColor; padding: 2px 5px; }
```

Floating interval badge (003-C) — reserve headroom, tick down to the key:

```css
.kbd { position: relative; }
.pad-top { padding-top: 34px; } /* room for floating badges above the keys */
.floater { position: absolute; top: 0; transform: translateX(-50%); display: flex;
  flex-direction: column; align-items: center; z-index: 5; }
.floater .cap  { font: 700 11px/1 var(--font-mono); letter-spacing: 0.08em;
  background: var(--color-ink); color: var(--color-paper-bright); padding: 3px 6px; }
.floater .tick { width: 2px; height: 12px; background: var(--color-ink); }
```

Corner-tab interval badge (003-A) — compact fallback, pinned to top of key, inverted on black keys:

```css
.badge-corner { position: absolute; top: 3px; left: 50%; transform: translateX(-50%);
  font: 700 10px/1 var(--font-mono); letter-spacing: 0.06em;
  background: var(--color-ink); color: var(--color-paper-bright); padding: 3px 5px; }
.bk .badge-corner { background: var(--color-paper-bright); color: var(--color-ink); }
```

Degree ladder (004-A) — progress fills vermilion, next rung gets an inset outline:

```css
.ladder { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3px; margin-bottom: var(--space-4); }
.rung { border: 2px solid var(--color-ink); min-height: 40px; display: flex; align-items: center;
  justify-content: center; font: 700 var(--text-body)/1 var(--font-mono);
  background: var(--color-paper-bright); color: var(--color-faint); }
.rung.done { background: var(--color-root); color: var(--color-on-root); }
.rung.now  { box-shadow: inset 0 0 0 3px var(--color-vermilion); color: var(--color-ink); }
```

Wrong-tap flash (004, all variants) — brief deep-gray flash, auto-clears:

```css
.wk.bad, .bk.bad { background: var(--color-wrong-deep); color: #fff; }
```
```js
keyEl.classList.add('bad');
setTimeout(() => keyEl.classList.remove('bad'), 320);
```

## HTML Structures

Degree strip markup (002-B) — one `.cell` per degree, 8 total (7 degrees + octave repeat of the root):

```html
<div class="strip">
  <div class="cell deg-root"><span class="ring">1</span><span class="big">E♭</span><span class="solf">Mi♭</span></div>
  <div class="cell deg-second">...</div>
  <!-- ... through degree 7 ... -->
  <div class="cell deg-root"><span class="ring">8</span><span class="big">E♭</span><span class="solf">Mi♭</span></div>
</div>
```

Floating badge markup (003-C) — one `.floater` per highlighted note, positioned by `left: <centerPct>%` matching the key's horizontal center:

```html
<div class="kbd pad-top">
  <div class="wk deg-root"><span class="note">C</span><span class="solf">Do</span></div>
  <div class="floater" style="left: 12.5%">
    <span class="cap">R</span>
    <span class="tick"></span>
  </div>
</div>
```

Degree ladder + keyboard together (004-A) — ladder sits above the keyboard, same column count as scale length:

```html
<p class="prompt">Play <span class="glyph">G</span> major, bottom to top</p>
<div class="ladder">
  <div class="rung done">1</div>
  <div class="rung now">2</div>
  <div class="rung">3</div>
  <!-- ... through 8 ... -->
</div>
<div class="kbd"><!-- tappable keys, .done added as each is played correctly --></div>
```

## What to Avoid

- **002-A (anchored piano alone, no degree numbers):** preserves real key geometry, but a black-key tonic (E♭, A♭) renders as a narrow floating key with nothing to its left — doesn't read as a clean anchored run. Superseded by B (degree strip) for the primary scale view; A's literal geometry is still fine as a secondary/detail view (see 002-C) but never as the anchor.
- **003-B (badge under the label, inside the key):** stacking interval badge below the note+solfège inside the key face needs three lines of vertical room per key — breaks down fast on black keys and on the phone's shorter keyboard. Rejected outright, not even kept as a fallback.
- **004-C (bare minimal register line only):** matches existing drill chrome most closely but gives zero visual progress/target cue beyond text — weakest for a beginner learning scale shapes cold. Only acceptable once a user has already graduated past needing the ladder (004-B is the intended next step down, not C).

## Origin

Synthesized from sketches: 002, 003, 004
Source files available in: sources/002-scale-tonic-anchored/, sources/003-interval-distance-badge/, sources/004-scale-drill-ascending/
