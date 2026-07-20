# Teaching & Hints

## Design Decisions

**Recurring pattern across all three sketches: escalating help, deepest rung holds the rich content.**

- **010 (Chord Explainer, winner A · Hint ladder):** on a Recall card (e.g. `Cdim`), a dashed `Need a hint?` CTA reveals hint tiers one tap at a time, each stamping in (0.18s ease, translateY). Tiers escalate: (1) plain-English family, (2) formula as interval-color chips, (3) notes lit on a mini keyboard, (4) full spelling. The user stops the moment it clicks and grades honestly — the grading row (Again/Hard/Good/Easy) is never replaced or hidden by the hint UI. Variant C's flip-dossier content (serif name, plain meaning, formula chips, lit keyboard, song hook) was **folded into the deepest hint rung** rather than kept as a separate flip — same "richest content lives at the bottom of the ladder" idea reused in 016.
- **012 (Interactive Theory, winner A · Guided steps):** a lesson is a vertical stack of small steps, each pairing one plain sentence with one keyboard action. Steps carry `data-state="locked|active|done"`; active has a vermilion left border, done has a verdigris left border + filled step-num badge. Only the active step is actionable; later steps are dimmed/inert until unlocked. Ends in a shared `.handoff` block (dark ink background, mustard button) bridging into a drill. Variant B's lesson-map (curriculum index of done/current/locked lesson rows) is **kept as the later container** once lessons multiply — A's linear steps are the unit **inside** a map row, not a replacement for it.
- **016 (Lookup Why-Panel, winner A+B composed):** two mechanisms fire at different moments, not one variant chosen over the others:
  - **B — disambiguation chips at input time**, but *only* when the casing is genuinely ambiguous (`Am7`/`AM7`/`am7`). Presents both readings as chips before showing any result, so the user picks intent instead of getting silently guessed at.
  - **A — "Pourquoi ces notes ?" expandable**, present on *every* lookup result (not just ambiguous ones), reusing the 010 hint-ladder tone: short numbered `.step` lines that explain the interval math, then the key-signature red herring ("the ♯ belongs to the scale, not the chord symbol"), then an escape-hatch chip to the sibling chord (`Voir Amaj7`).
  - **C's side-by-side duo** (Am7 / Amaj7 mini-dossiers with keyboards) was **folded into A's panel** as the deepest m-vs-maj content — identical fold-into-deepest-rung pattern as 010's flip-dossier-into-hint-rung. Do not build C as a standalone view.

**Cross-sketch takeaways:**
- Never let a teaching affordance interrupt or replace the primary action (grading, submitting an answer, reading the result) — it's additive, dismissible, and the user drives the depth.
- Richer/denser content (dossier, side-by-side comparison) is real and worth keeping, but demoted to the bottom of an escalation, not shown by default.
- Reuse the serif `ChordGlyph` display treatment and the `stamp-in` reveal animation for every new teaching surface — locked house reference (Session 4 constraint, MANIFEST.md).
- Only interrupt with an upfront choice (016-B) when the ambiguity is real (casing); otherwise teach after the fact via an expandable (016-A), never a modal or forced detour.

## CSS Patterns

Hint ladder reveal (010, winner A):
```css
.hint-cta {
  font: 700 var(--text-label)/1 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase;
  border: 2px dashed var(--color-faint); background: transparent; color: var(--color-muted);
  padding: var(--space-4); cursor: pointer; min-height: 44px; width: 100%; margin-top: var(--space-6);
}
.hint-cta:hover { border-color: var(--color-ink); color: var(--color-ink); }
.hints { margin-top: var(--space-4); display: flex; flex-direction: column; gap: 3px; }
.hint {
  border: 2px solid var(--color-ink); background: var(--color-paper-bright); padding: var(--space-4);
  animation: stamp 0.18s ease;
}
@keyframes stamp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.hint .tier { font: 700 10px/1 var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-muted); }
.hint .spell { font: 700 var(--text-heading)/1 var(--font-serif); letter-spacing: 0.06em; }
```

Guided step states (012, winner A):
```css
.step { border: 2px solid var(--color-ink); background: var(--color-paper-bright); padding: var(--space-4) var(--space-6); }
.step[data-state="locked"] { opacity: 0.4; }
.step[data-state="done"] { border-left: 8px solid var(--color-verdigris); }
.step[data-state="active"] { border-left: 8px solid var(--color-vermilion); }
.step-num { font: 700 var(--text-label)/1 var(--font-mono); border: 2px solid var(--color-ink); padding: 3px 7px; }
.step[data-state="done"] .step-num { background: var(--color-verdigris); color: #fff; }
```

Why-panel expandable + disambiguation chips (016, winner A+B):
```css
.why-btn { display:block; width:100%; margin-top:10px; border:2px solid var(--color-ink); background:none; padding:10px; cursor:pointer; }
.why-btn:hover { background:var(--color-ink); color:var(--color-paper); }
.why-panel { display:none; border-top:2px dashed var(--color-ink); margin-top:10px; padding-top:10px; font-size:14px; line-height:1.5; }
.why-panel.open { display:block; animation:stampIn 240ms ease-out; }
.disambig { border:2px solid var(--color-vermilion); background:var(--color-paper-bright); padding:10px; margin-top:12px; }
.chip { display:inline-block; font-family:var(--font-mono); font-size:13px; border:2px solid var(--color-ink); padding:6px 10px; margin:6px 6px 0 0; cursor:pointer; }
.chip:hover, .chip.sel { background:var(--color-ink); color:var(--color-paper); }
@keyframes stampIn { from { transform:scale(1.03); opacity:0; } to { transform:scale(1); opacity:1; } }
```

## HTML Structures

Hint ladder (010-A):
```html
<div class="recall-card">
  <p class="chord-glyph">Cdim</p>
  <p class="prompt">What notes? Play them, or tap for a hint.</p>
  <button class="hint-cta" id="hintCta">Need a hint?</button>
  <div class="hints" id="hintsA"></div>
  <p class="grade-label">Grade yourself</p>
  <div class="grade-row">
    <button class="grade-btn" data-g="again">Again</button>
    <button class="grade-btn" data-g="hard">Hard</button>
    <button class="grade-btn" data-g="good">Good</button>
    <button class="grade-btn" data-g="easy">Easy</button>
  </div>
</div>
```

Guided steps + handoff (012-A):
```html
<div class="steps" id="stepsA"></div>
<div class="handoff hidden" id="handoffA">
  <p class="reg">You just learned this</p>
  <h3>Now make it stick</h3>
  <!-- drill handoff CTA -->
</div>
```

Why-panel with escape hatch, and disambiguation chips (016-A+B):
```html
<div class="card">
  <div class="register">Accord trouvé — la mineur sept</div>
  <div class="glyph">Am7</div>
  <div class="notes">
    <span class="note n-root">A</span><span class="note n-third">C</span>
    <span class="note n-fifth">E</span><span class="note n-seventh">G</span>
  </div>
  <button class="why-btn" onclick="this.nextElementSibling.classList.toggle('open')">Pourquoi ces notes ?</button>
  <div class="why-panel">
    <p class="step"><b>m</b> = tierce <b>mineure</b> : 3 demi-tons au-dessus de A → C naturel, pas C♯.</p>
    <p class="step">Le C♯ à la clé appartient à la gamme de La majeur — la gamme n'impose rien ici.</p>
    <p class="step">Tu cherchais l'accord majeur avec C♯ ? C'est <b>Amaj7</b>. <span class="chip">Voir Amaj7</span></p>
  </div>
</div>

<!-- disambiguation, only for ambiguous casing (am7 / AM7) -->
<div class="disambig">
  <div class="register">« AM7 » est ambigu</div>
  <span class="chip" onclick="pickB(this,'min')">Am7 — la mineur 7</span>
  <span class="chip" onclick="pickB(this,'maj')">Amaj7 — la majeur 7</span>
</div>
```

## What to Avoid

- Do not build the flip-dossier (010-C) or the side-by-side duo (016-C) as standalone always-visible views — both were explicitly folded into the deepest rung of an escalating disclosure instead.
- Do not fire the disambiguation prompt (016-B) for every lookup — only on genuinely ambiguous casing (`am7`/`AM7`); unambiguous input goes straight to a result with the why-panel available.
- Do not let hint/teaching UI cover, disable, or replace the grading row or the primary action — it is always additive and dismissible.
- Do not dump all hint tiers at once (rejected: the all-at-once instinct behind 010-C); reveal one tier per tap so the user can stop early.
- Do not use a chat/tutor-Q&A pattern for in-place teaching (010-B, not the winner) — it added conversational overhead without being clearer than the metered ladder.

## Origin
Synthesized from sketches: 010, 012, 016
Source files available in: sources/010-chord-explainer/, sources/012-interactive-theory/, sources/016-lookup-why-panel/
