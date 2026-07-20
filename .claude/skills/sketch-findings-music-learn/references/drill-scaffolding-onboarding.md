# Drill Scaffolding & Onboarding

## Design Decisions

- **Interval scaffold is always-on during answering, not just on reveal**, and fades in three discrete levels — Beginner, Improving, Confident — driven by a single global level setting (not per-chord-type mastery). Winner: **005-A, formula strip**.
  - Beginner: full interval + note name per chip.
  - Improving: interval abbreviation only, note names dropped.
  - Confident: scaffold removed entirely (space collapses; no placeholder in production).
  - A sits above the keyboard rather than on the keys, which is the cheapest to build and reason about at each level, at the cost of one extra mental hop ("which chip maps to which key"). This tradeoff was accepted as the winner over B (ghost labels on keys — tighter coupling but harder to tune opacity) and C (interval recipe sentence — reads best as a spoken-teacher line, kept as a *pairing* idea, not the primary scaffold).

- **Famous-tune interval hooks are strictly opt-in, tap-to-reveal, never auto-shown.** Winner: **006-A, inline expand**.
  - Each interval is a full-width row with a color swatch; tapping opens a short italic strip beneath naming the tune; tapping again collapses it. Only one hook visible at a time per row.
  - The tune table is a **fixed, vetted list of 12 intervals (m2 through P8)** — do not extend it with invented associations.
  - Chosen over B (flip cards — better suited to a dedicated reference/browse page, not a linear lesson/drill list) and C (register-line integration — cheapest UI footprint, reuses the existing mono inspect register, but only surfaces one interval's hook at a time).

- **Beginner on-ramp moves the level picker onto the Drills page itself**, names tiers instead of numbering them, and keeps advanced tiers invisible until reached. Winner: **007-A, course stepper**.
  - A single "Your course" band shows the current tier name + one-line plain description + a big primary "Start practicing" button.
  - A muted "Next up" strip previews only the *immediately following* tier — nothing further ahead renders at all, not even as a locked placeholder.
  - Tier reads as a name and a reason to start (e.g. "White-key triads... start here"), never a bare number.
  - Chosen over B (progress ladder — full vertical list with done/current/future/locked states; strong as a *motivating progress view* once more tiers are reached, not as the calm first-time default) and C (two-choice on-ramp — "New here?" vs "Pick my level" cards; useful framing idea but adds a decision step A avoids).

## CSS Patterns

Formula strip chips (005-A), colored by chord degree, sized as a row above the keyboard:

```css
.strip { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); min-height: 54px; align-items: stretch; flex-wrap: wrap; }
.chip { border: 2px solid var(--color-ink); padding: var(--space-2) var(--space-4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 64px; }
.chip .iv { font: 700 13px/1 var(--font-mono); letter-spacing: 0.04em; }
.chip .nm { font: 400 11px/1 var(--font-mono); opacity: 0.85; }
/* degree colors reused from the drill keyboard */
.deg-root { background: var(--color-root); color: var(--color-on-root); }
.deg-third { background: var(--color-third); color: var(--color-on-third); }
.deg-fifth { background: var(--color-fifth); color: var(--color-on-fifth); }
.deg-seventh { background: var(--color-seventh); color: var(--color-on-seventh); }
```

Level picker (shared control, 44px min touch targets, pressed state via `aria-pressed`):

```css
.level-picker button { font: 700 var(--text-label)/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; border: 2px solid var(--color-ink); background: var(--color-paper-bright); cursor: pointer; padding: var(--space-2) var(--space-4); min-height: 44px; min-width: 44px; }
.level-picker button[aria-pressed="true"] { background: var(--color-ink); color: var(--color-paper-bright); }
```

Inline-expand tune hook (006-A) — collapsible strip via `max-height` transition, opened state on a `data-open` attribute:

```css
.itemA { border: 2px solid var(--color-ink); background: var(--color-paper-bright); }
.chipA { width: 100%; display: flex; align-items: center; gap: var(--space-4); min-height: 52px; padding: var(--space-2) var(--space-4); background: none; border: none; font: 700 var(--text-body)/1 var(--font-mono); cursor: pointer; text-align: left; }
.chipA .sw { width: 28px; height: 28px; border: 2px solid var(--color-ink); flex: none; } /* interval color swatch */
.chipA .car { font: 700 14px/1 var(--font-mono); transition: transform 0.15s ease; }
.itemA[data-open="true"] .car { transform: rotate(90deg); }
.expandA { max-height: 0; overflow: hidden; transition: max-height 0.18s ease; border-top: 0 solid var(--color-ink); }
.itemA[data-open="true"] .expandA { max-height: 80px; border-top: 2px solid var(--color-ink); }
.expandA-inner { padding: var(--space-2) var(--space-4) var(--space-4) calc(28px + var(--space-4) + var(--space-4)); font: 400 var(--text-body)/1.3 var(--font-serif); font-style: italic; }
```

Course stepper band (007-A) — eyebrow/name/description/CTA stack, plus a dashed-border "next up" preview that is the only look-ahead the page renders:

```css
.course-band { border: 2px solid var(--color-ink); background: var(--color-paper-bright); padding: var(--space-6); }
.course-eyebrow { font: 700 var(--text-label)/1 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-muted); margin: 0 0 var(--space-2); }
.course-name { font: 700 var(--text-heading)/1.2 var(--font-serif); margin: 0 0 var(--space-2); display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }
.course-name .tiernum { font: 700 var(--text-label)/1 var(--font-mono); border: 2px solid var(--color-ink); padding: 2px 8px; color: var(--color-muted); }
.course-desc { font-size: var(--text-body); margin: 0 0 var(--space-4); max-width: 46em; }
.start-btn { font: 700 var(--text-body)/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; background: var(--color-vermilion); color: #ffffff; border: 2px solid var(--color-ink); padding: var(--space-4) var(--space-6); cursor: pointer; min-height: 44px; }
.next-up { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 2px dashed var(--color-faint); display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
.next-up .lockchip { font: 700 10px/1 var(--font-mono); border: 2px solid var(--color-faint); color: var(--color-faint); padding: 3px 6px; }
```

## HTML Structures

Formula strip, one chip per interval, level controls chip contents (note name shown only at Beginner):

```html
<div class="strip">
	<div class="chip deg-root"><span class="iv">R</span><span class="nm">C</span></div>
	<div class="chip deg-third"><span class="iv">m3</span><span class="nm">E♭</span></div>
	<div class="chip deg-fifth"><span class="iv">P5</span><span class="nm">G</span></div>
	<div class="chip deg-seventh"><span class="iv">m7</span><span class="nm">B♭</span></div>
</div>
<!-- Confident level: strip container renders empty/collapsed, no dashed placeholder in production -->
```

Inline-expand interval row with opt-in tune hook:

```html
<div class="itemA" data-open="false">
	<button class="chipA" type="button">
		<span class="sw" style="background:var(--color-third);"></span>
		<span class="lbl">m3 &middot; Minor 3rd</span>
		<span class="car">&#8250;</span>
	</button>
	<div class="expandA">
		<div class="expandA-inner"><span class="tag">Sounds like</span>Greensleeves, opening</div>
	</div>
</div>
```

Course stepper band with capped look-ahead:

```html
<div class="course-band">
	<p class="course-eyebrow">Your course</p>
	<p class="course-name"><span class="tiernum">Tier 1</span> White-key triads</p>
	<p class="course-desc">Just the white-key major and minor chords: C D E F G A B. No sharps or flats yet. Start here.</p>
	<button class="start-btn" type="button">Start practicing &rarr;</button>
	<div class="next-up">
		<div>
			<p class="label">Next up</p>
			<p class="name">Tier 2 &middot; All-key triads</p>
		</div>
		<span class="lockchip">Not yet</span>
	</div>
</div>
<!-- Tiers beyond "next up" (e.g. tier 3+) are not rendered at all, not even as locked rows -->
```

## What to Avoid

- **005-B, ghost key labels**: interval labels printed faintly on the key faces themselves. Rejected as the primary pattern — tightest hint-to-action coupling but risks feeling like the app is handing over the answer at Beginner opacity, and needs fussy per-level opacity tuning to avoid clutter. Worth revisiting only as a secondary/advanced option, not the default.
- **005-C, interval recipe sentence** ("root (C) + minor 3rd (E♭) + ..."): rejected as the primary scaffold — reads well as a spoken-teacher line and pairs nicely with A or B, but alone is weaker than the formula strip for at-a-glance construction.
- **006-B, flip cards**: rejected for in-drill/lesson use — the flip interaction and grid layout suit a dedicated browse-the-whole-set reference page, not a linear teaching list where one hook at a time is being read in context.
- **006-C, register-line integration**: rejected as the primary reveal surface — cheapest to build (reuses the existing inspect register) but only shows one interval's hook at a time, so it doesn't scale to browsing or lesson flows. Keep in mind as a low-cost secondary surface elsewhere in the app.
- **Do not invent new tune associations** beyond the vetted 12-interval table (m2 through P8) captured in 006.
- **007-B, progress ladder**: not the first-time default — it's a full checklist/ladder of all tiers (done/current/future/locked) that suits a *returning, motivated* player, not a first-time beginner who should see the calmest possible page. Reuse it as the "progress" view, not the onboarding view.
- **007-C, two-choice on-ramp**: rejected as primary — the "New here? / Pick my level" fork is a reasonable framing but adds an extra decision beyond what A needs; A's stepper already defaults new users straight to Tier 1 without a choice screen.
- **Old level control** (six bare tier-number buttons, 1–6, buried in Progress page settings, tiers 5/6 permanently disabled): the explicit problem statement all three winners solve — don't reintroduce bare numbers or bury the picker off the Drills page.

## Origin

Synthesized from sketches: 005, 006, 007
Source files available in: sources/005-interval-scaffold/, sources/006-interval-song-hooks/, sources/007-beginner-onramp/
