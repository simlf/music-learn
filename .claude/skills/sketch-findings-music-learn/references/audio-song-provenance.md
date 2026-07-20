# Audio & Song Provenance

## Design Decisions

- **Reveal audio auto-plays, synced to the stamp-in.** On BUILD reveal, `playChord(notes)` fires the instant the answer stamps in — no tap required. The four lit keys and the serif `ChordGlyph` pulse once together, in time with the strike. Zero friction: sound is just there. A `↺ Hear again` button replays on demand.
- **Arpeggio-then-block is kept as an optional "study" mode, not the default.** Rolling root→3rd→5th→7th (each key lighting in its interval color as it sounds, register line printing per-note) is the strongest way to map a heard pitch to a named note, but costs ~1.3s extra per reveal — too slow once the chord is known. Surface it as an explicit slower/study toggle alongside the default auto-play, not as the primary path.
- **Sound-OFF must never dead-end into silence-plus-nothing.** Every audio-reveal path — default auto-play and the study arpeggio — still pulses the keys and glyph visually and prints a muted register line (e.g. "♪ Cmaj7 — C E G B · (sound off, visual only)") when sound is off. The visual confirmation is the fallback contract, not an afterthought.
- **Tap-to-hear (silent reveal + explicit "Hear it" button) was rejected as the default.** It respects a quiet room and hands the user control, but a silent stamp-in reads as "the app forgot to do something." Not used; auto-play wins.
- **Song provenance is a mark that travels app-wide, not a new navigation surface.** Any chord chip/card that appears in a user's added song (from `/songs`) carries the same letterpress mono tag everywhere it's shown — Drills prompt, Recall card, Chord Lookup result. The mark is the same object regardless of surface.
- **Drills/Recall gain an opt-in "From my songs" filter toggle**, not an always-on restriction. Default is off (full pool); toggling on narrows practice to only chords found in the user's songs.
- **Multi-song chords collapse to a count with a distinguishing border style** (`border-style: double` via `.prov.mult`), e.g. "2 songs", rather than naming both songs inline — keeps the tag compact.
- **Song-first practice lane (pinned deck-per-song) and ambient SRS-weighting were both rejected as the primary mechanism.** The lane is strong intent-match but is a new nav surface with provenance only living there. Ambient weighting is lowest-friction but invisible — the user can't deliberately focus a session on one song. The mark+filter (Variant A) wins because it's explicit, controllable, and reaches every surface.

## CSS Patterns

Stamp-in reveal + single pulse (locked house reference — reused for both audio reveal and provenance-adjacent chord displays):

```css
.stamp { animation: stamp-in 240ms ease-out; }
@keyframes stamp-in {
	0% { transform: scale(0.96); opacity: 0; }
	60% { transform: scale(1.02); opacity: 1; }
	100% { transform: scale(1); }
}
.pulse { animation: pulse-once 360ms ease-out; }
@keyframes pulse-once {
	0% { transform: scale(1); }
	35% { transform: scale(1.06); filter: brightness(1.12); }
	100% { transform: scale(1); }
}
.glyph { font: 700 var(--text-display)/1 var(--font-serif); color: var(--color-ink); }
.glyph .sup { font-size: 0.5em; vertical-align: 0.55em; }
.glyph.pulse { transform-origin: left center; }
```

Provenance tag (letterpress mono, travels app-wide):

```css
.prov {
	display: inline-flex; align-items: center; gap: 5px;
	font: 700 10px/1 var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase;
	border: 2px solid var(--color-ink); background: var(--color-paper);
	color: var(--color-ink); padding: 3px 6px;
	white-space: nowrap;
}
.prov .note { font-size: 11px; }
.prov.mult { border-style: double; } /* multi-song chords */
```

"From my songs" filter toggle:

```css
.filterbar {
	border: 2px solid var(--color-ink); background: var(--color-paper-bright);
	padding: var(--space-2) var(--space-4); margin-bottom: var(--space-4);
	display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;
}
.toggle {
	font: 700 var(--text-label)/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;
	border: 2px solid var(--color-ink); background: var(--color-paper); color: var(--color-ink);
	padding: var(--space-2) var(--space-4); cursor: pointer; min-height: 44px;
	display: inline-flex; align-items: center; gap: var(--space-2);
}
.toggle[aria-pressed="true"] { background: var(--color-vermilion); color: #fff; border-color: var(--color-ink); }
.toggle .box { width: 14px; height: 14px; border: 2px solid currentColor; display: inline-block; }
.toggle[aria-pressed="true"] .box { background: #fff; }
```

## HTML Structures

Reveal head (glyph + auto-play, Variant A):

```html
<div class="reveal-head">
	<span class="glyph" id="glyphA">C<span class="sup">maj7</span></span>
</div>
<div class="readout"><p class="rline" id="readA">&nbsp;</p></div>
<div class="controls">
	<button class="replay-btn" id="revealA">Reveal answer</button>
	<button class="replay-btn" id="againA">&#8635; Hear again</button>
</div>
```

Muted register line on sound-off (visual-only fallback):

```html
<span class="rmuted">&#9834; Cmaj7 &mdash; C E G B &middot; (sound off, visual only)</span>
```

Provenance tag on a drill prompt:

```html
<div class="prompt">
	<p class="q chord">A&oslash;7</p>
	<p class="ask">What notes? Play them in your left hand.</p>
	<div class="provrow"><span class="prov"><span class="note">&#9834;</span> Autumn Leaves</span></div>
</div>
```

Same tag reused on a Chord Lookup result:

```html
<div class="lookup-result">
	<div class="head">
		<span class="name chord">A&oslash;7</span>
		<span class="prov"><span class="note">&#9834;</span> Autumn Leaves</span>
	</div>
	<p class="spell">A half-diminished seventh. Left hand: <b>A &middot; C &middot; E&flat; &middot; G</b>.</p>
</div>
```

Filter toggle:

```html
<div class="filterbar">
	<span class="lbl">Practice pool</span>
	<button class="toggle" id="filterA" type="button" aria-pressed="false">
		<span class="box"></span> From my songs
	</button>
</div>
```

## What to Avoid

- Don't ship a silent audio reveal with no visual fallback — sound-OFF must always still pulse keys/glyph and print a muted line.
- Don't make arpeggio-then-block the default reveal; it's an opt-in "study" mode only, gated behind extra latency the default path shouldn't pay.
- Don't build a separate provenance UI per surface (one style for Drills, another for Lookup) — the mark must be the same component everywhere it appears.
- Don't hard-restrict Drills/Recall to song-chords automatically; provenance + an opt-in filter beats an always-on song-first lane that fragments navigation and leaves provenance undiscoverable elsewhere.
- Don't name every song in a multi-song tag — collapse to a count (`2 songs`, double border) to avoid unbounded tag width.
- Don't let the tap-to-hear speaker button pattern creep back in as the default; it's a rejected variant, kept only as a reference for sound-respecting UI elsewhere if ever needed.

## Origin

Synthesized from sketches: 009, 011
Source files available in: sources/009-hear-the-chord/, sources/011-your-songs-chords/
