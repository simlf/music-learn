# Global Layout & Mobile Nav

## Design Decisions

**House rule: docked-actions pattern for phone pages.** Any page where a required next-step control (playable keyboard, reveal/grade actions) risks falling below the fold on a 390px phone gets a **pinned dock**, not an auto-scroll fix. Content scrolls freely underneath; the dock never leaves the viewport. This is now a repeatable pattern, proven twice:
- **008-A** — a 1.5-octave keyboard docked to the bottom of the viewport, above all page content, on every keyboard-bearing surface (Recall, Lookup, Scales, Drills, Theory). Guarantees playability by construction rather than by per-page discipline.
- **014-A** — the review action dock (Révéler → grade buttons) pinned directly above the tab bar. Same structural guarantee applied to the review loop: tap Révéler, then a grade, and nothing ever requires scrolling.

Both share one shape: `flex-direction: column` phone frame, a `flex: 1; overflow-y: auto` scroll region, and a `flex: none` dock docked at the bottom with a `border-top`. Treat this as the default answer whenever a "does this stay reachable on mobile" question comes up — don't reach for auto-scroll-into-view except as a stopgap (see What to Avoid).

**Language toggle lives in the header, not Settings.** 013-A: an `EN | FR` segmented control top-right of the app bar, on every page, always one tap away. Settings-only placement (013-B) was rejected — it turns language switching into a 3-tap detour and hides a control the user reaches for mid-drill.

**French copy must be audited per fixed-width slot, not assumed to wrap.** 013-C is the audit deliverable, not a UI to ship: it stacks every tight Print Shop string EN-above/FR-below inside real fixed slots so overflow is literal. The verdict: sentences and body prompts survive fine; the breakage is confined to **uppercase mono fixed-width slots** — register labels (FONDAMENTALE vs ROOT, 12 vs 4 chars), the 4-across grade row (A REVOIR, DIFFICILE), and nav labels (EXERCICES, THEORIE). Any new fixed-width mono slot must be checked against its longest French equivalent before shipping.

**Icon + micro-label wins the phone tab bar.** 015-B: 56px bar height (down from today's 64px), each tab an icon plus a 9px uppercase micro-label underneath. Icons-only (015-A, 48px) is more compact but risks unlearnable glyphs; abbreviated-text-only (015-C, 48px, e.g. RÉVIS., MORC.) needs no icon design but reads as clipped and undignified for the Print Shop tone. B is the one stable choice across an FR ⇄ EN toggle: the icon carries meaning language-independently, the micro-label teaches it, and truncation of the label alone (not the icon) is an acceptable, low-stakes failure mode.

## CSS Patterns

Docked bottom bar over a scrolling body (008-A / 014-A shape):

```css
.phone {
  position: relative; /* or use flex column, see 014 variant */
  border: 2px solid var(--color-ink);
  height: 560px; overflow: hidden;
}
.phone-scroll { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.phone-scroll.has-dock { padding-bottom: 176px; } /* reserve space so content never sits under the dock */

.dock {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 10;
  border-top: 2px solid var(--color-ink);
  background: var(--color-paper-bright);
  box-shadow: 0 -6px 0 rgba(34,30,23,0.06);
}
.dock-handle { /* optional collapse handle, ink-filled strip */
  width: 100%; min-height: 32px; border-bottom: 2px solid var(--color-ink);
  background: var(--color-ink); color: var(--color-paper-bright);
  font: 700 10px/1 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase;
}
```

Flex-column variant (014, simpler — no `position: absolute` needed):

```css
.phone { display: flex; flex-direction: column; height: 720px; overflow: hidden; }
.phone-scroll { flex: 1; overflow-y: auto; padding: 12px 12px 0; }
.action-dock { flex: none; border-top: 2px solid var(--color-ink); padding: 8px; display: flex; gap: 8px; }
.tabbar { height: 56px; flex: none; border-top: 2px solid var(--color-ink); display: flex; }
```

Header EN|FR segmented toggle (013-A):

```css
.seg { display: inline-flex; border: 2px solid var(--color-ink); }
.seg button {
  font: 700 var(--text-label)/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;
  min-width: 52px; min-height: 44px; border: 0; border-left: 2px solid var(--color-ink);
  background: var(--color-paper-bright); color: var(--color-ink);
}
.seg button:first-child { border-left: 0; }
.seg button[aria-pressed="true"] { background: var(--color-ink); color: var(--color-paper-bright); }
```

Icon + micro-label tab bar, 56px (015-B):

```css
.tabbar { background: var(--color-paper-bright); border-top: 2px solid var(--color-ink); display: flex; }
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  min-height: 44px; height: 56px; /* 56px, not today's 64px */
  border: none; border-right: 2px solid var(--color-ink);
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em;
}
.tab:last-child { border-right: none; }
.tab.active { background: var(--color-ink); color: var(--color-paper); }
.tab svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 2; flex: none; }
.tab .lbl { font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
```

Fixed-width register slot that must be i18n-audited (013):

```css
.reg-slot { border: 2px solid var(--color-ink); padding: var(--space-2); text-align: center; overflow: hidden; }
.reg-slot .role { font: 700 var(--text-label)/1.1 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
/* if the French label overflows this slot, it needs abbreviation or a wider/2-line slot — do not let it clip silently */
```

## HTML Structures

Docked keyboard bar above scrolling content (008-A):

```html
<div class="phone">
  <div class="phone-scroll has-dock">
    <div class="scrollpad">
      <!-- page content, e.g. Recall card -->
    </div>
  </div>
  <div class="dock" data-collapsed="false">
    <button class="dock-handle" type="button"><span class="grip"></span> Keyboard &middot; tap to collapse</button>
    <div id="kbd-slot"><!-- piano keyboard --></div>
  </div>
</div>
```

Action dock above tab bar (014-A):

```html
<div class="phone">
  <div class="phone-scroll">
    <h1 class="page">Révision</h1>
    <div class="card"><!-- prompt, glyph, reveal-zone / keyboard --></div>
    <!-- arbitrary-length scrolling content -->
  </div>
  <div class="action-dock" data-stage="reveal">
    <button class="btn primary">Révéler</button>
    <!-- after reveal, dock content swaps to grade buttons: Encore / Difficile / Bien / Facile -->
  </div>
  <div class="tabbar"><span>Recherche</span><span>Exercices</span><span class="active">Révision</span><span>Morceaux</span><span>Plus</span></div>
</div>
```

Header language toggle (013-A):

```html
<div class="phone-bar">
  <span class="brand">Music&nbsp;Learn</span>
  <div class="seg">
    <button data-lang="en" aria-pressed="false">EN</button>
    <button data-lang="fr" aria-pressed="true">FR</button>
  </div>
</div>
```

Icon + micro-label tab (015-B):

```html
<button class="tab active" aria-label="Révision">
  <svg viewBox="0 0 24 24"><rect x="4" y="5" width="13" height="16"/><rect x="8" y="3" width="13" height="16"/></svg>
  <span class="lbl">RÉVIS.</span>
</button>
```

## What to Avoid

- **Auto-scroll-into-view as the primary fix (014-C).** Scrolling the reveal/grade actions into view when they'd otherwise fall below the fold is the cheapest patch but the weakest guarantee — it depends on triggering correctly every time and can feel janky. Acceptable only as a **day-one micro-fix** before the real dock lands, never as the shipped pattern.
- **Shrinking content to force a no-scroll fit (014-B).** Compacting the card, glyph, and keyboard so everything fits one viewport avoids docking but degrades legibility (smaller chord glyph, shorter keyboard) and doesn't scale if any content block grows. Rejected in favor of the dock, which lets content be whatever size it needs.
- **Per-page keyboard discipline (008-B).** Relying on each surface to remember to include its own playable keyboard is not a structural guarantee — it depends on developer diligence rather than the layout enforcing it. Also multiplies sound-state toggles (one per keyboard) instead of one shared truth.
- **Floating summon FAB (008-C).** A persistent button that slides up a keyboard sheet keeps content full-height but costs an extra tap before every note played — acceptable as a pattern for something used occasionally, not for a keyboard that must be "immediately playable."
- **Settings-only language toggle (013-B).** Keeps the header clean but makes switching languages a 3-tap detour, which fights the goal of the toggle being reachable mid-drill.
- **Shipping fixed-width mono slots without a French-length check.** FONDAMENTALE (12 chars) vs ROOT (4 chars) is the canonical failure case — any new register/label slot must be checked against its French equivalent, not assumed to fit because the English fits.
- **Text-only abbreviated tab labels (015-C).** RÉVIS. / MORC. reads as clipped rather than intentional, and abandoning the icon loses the one FR/EN-stable visual anchor.
- **Icons with no label at all (015-A).** Most compact (48px) but risks glyphs that don't teach themselves — no micro-label to disambiguate an icon a first-time user hasn't learned yet.

## Origin
Synthesized from sketches: 008, 013, 014, 015
Source files available in: sources/008-keyboard-everywhere/, sources/013-french-fit-test/, sources/014-mobile-review-flow/, sources/015-icon-tab-bar/
