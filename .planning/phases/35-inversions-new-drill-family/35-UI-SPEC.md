---
phase: 35
slug: inversions-new-drill-family
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-27
---

# Phase 35 — UI Design Contract

> Visual and interaction contract for the new inversion drill family (INV-01/02/03). Generated
> by gsd-ui-researcher from LOCKED design docs (sketch 023-B + 024-A graft +
> `counting-hint-grammar.md` §023), autonomous mode (user away). Every decision below is either
> directly locked by 35-CONTEXT.md, directly precedented by shipped code (Phase 32
> `CountingChipRow`, Phase 33/34 self-contained `voicingStageForChord` maturity read, Phase 34
> inline hint-ladder precedent in `ProgressionDrill.svelte`, Phase 25 `.ghost` hatch, Phase 27-03
> `PracticeChordDrill`/`PracticeIntervalDrill` one-shot embed-prop shape), or an explicit default
> chosen under 35-CONTEXT's "Claude's Discretion" grant, flagged clearly where genuinely open.
> No `AskUserQuestion` was used.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no `components.json` — hand-rolled "Print Shop" design system; shadcn not applicable) |
| Preset | not applicable |
| Component library | none — custom Svelte components (`Button.svelte`, `PianoKeyboard.svelte`, `CountingChipRow.svelte`, `ChordGlyph.svelte`, etc.) |
| Icon library | none — mono-glyph text/symbols only (✕, ▾, "B" badge, chip labels), never an icon font/SVG set |
| Font | `--font-sans` (body/UI), `--font-serif` (`ChordGlyph` — **used in this phase**, unlike Phase 34: this is not an earn-the-symbol drill, the chord symbol is shown up front per 35-CONTEXT), `--font-mono` (labels, tags, register lines, inversion-rotation strip, bass badge) — all pre-existing `src/app.css` tokens, no new font |

---

## Spacing Scale

Declared values (pre-existing tokens, reused verbatim — no new scale, no new values):

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | Chip/badge internal padding (inherited from `CountingChipRow`, bass badge) |
| sm | 8px | Chiprow gaps, rung-internal gaps, inversion-rotation strip cell gaps |
| md | 16px | Rung padding, gap between keyboard and Vérifier/Entendre row |
| lg | 24px | Space above the hint-ladder block (below Vérifier/retry line) |
| xl | 32px | not used by this phase's new surface |
| 2xl | 48px | not used by this phase's new surface |
| 3xl | 64px | not used by this phase's new surface |

Exceptions: none beyond the pre-existing raw-px hairlines already documented in
`HintLadder.svelte`/`ProgressionDrill.svelte`'s `.rung`/`.hints` gap (1px border, 3px stacked-rung
gap) — reused verbatim if this phase's rung markup copies that CSS shape, not a new exception.

---

## Typography

| Role | Size | Weight | Line Height | Usage in this phase |
|------|------|--------|-------------|------|
| Body | 16px | 400 | 1.5 | Prompt sentence ("Cm7 — 2ᵉ renversement, quinte à la basse."), rung prose, retry lines |
| Label | 12px | 700 | 1.4 | Rung tags, inversion-rotation strip cells, bass badge glyph, `CountingChipRow` legend (already this size), key-progress-style register text |
| Heading | 20px | 700 | 1.2 | Not introduced by this phase (no new heading) |
| Display | 56px | 700 | 1.05 | **`ChordGlyph`'s chord symbol at the top of the prompt** — this phase's one deliberate use of the display face, since the symbol is shown, not earned (contrast with Phase 34 where Display was forbidden) |

No new type role introduced. Tone/gap chips inside the hint ladder's stack-order rung reuse
`CountingChipRow`'s own existing type treatment verbatim.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--color-paper` (#f2ecdd) | Page/drill background (unchanged) |
| Secondary (30%) | `--color-paper-bright` (#faf6ea) | Each revealed rung block's background (mirrors `ProgressionDrill.svelte`'s `.hint` background verbatim), function/completion-style card chrome if this drill ever needs one |
| Accent (10%) | `--color-vermilion` (#c8502e) | Reserved for: the active inversion-rotation strip cell's fill (mirrors `progressions.invpick .on` background in the sketch and the existing `.measure--cursor`/`.retry` vermilion-accent convention), the wrong-answer retry line text. **This phase adds NO new vermilion usage beyond these two** — the hint-ladder reveal control and rung chrome stay neutral ink/faint (Phase 34 precedent), never vermilion, so the optional hint reads as quieter than the drill's own active-state/error chrome |
| Destructive | not applicable | No destructive action in this phase |

Accent reserved for: active inversion-rotation strip cell, wrong-answer retry text — **never**
the hint-ladder control, the bass ring/badge, or the ghost hatch (all three stay neutral ink,
per the LOCKED interval-color-language invariant below).

**LOCKED, never repurposed in this phase — the whole INV-01 teaching point depends on this:**
role colors stay fixed across every inversion. `--color-root` (vermilion tint, distinct token
from the `--color-vermilion` accent), `--color-third` (verdigris), `--color-fifth` (tan),
`--color-seventh` (mustard) always fill the SAME chord tone regardless of which inversion is
being drilled — only the note ORDER (bass position) changes, never the color-to-role mapping.
This is the literal thing the drill teaches ("same 4 notes, different bass"); recoloring notes
by inversion is an explicit anti-pattern from `counting-hint-grammar.md`.

**Bass emphasis (ink ring + "B" badge, LOCKED CSS from `counting-hint-grammar.md`):** neutral
ink, never a fifth color and never vermilion — it must read as "this is the bass," layered
ON TOP of whichever interval-role fill (or ghost hatch, or plain key) already occupies that key,
never replacing it:
```css
.piano-keyboard__key--bass-ring { outline: 3px solid var(--color-ink); outline-offset: -3px; z-index: 4; }
.piano-keyboard__key--bass-ring::after { /* "B" badge, mirrors --ghost's data-attribute + ::after pattern */
  content: attr(data-bass); position: absolute; top: 2px; left: 2px; z-index: 5;
  font-family: var(--font-mono); font-size: 8px; font-weight: 700;
  background: var(--color-ink); color: #fff; padding: 1px 3px; }
```

**Ghost-key hatch (hint rung 3):** reuses `PianoKeyboard`'s existing
`.piano-keyboard__key--ghost` treatment verbatim (`--color-faint` diagonal hatch + dashed
outline, `ghostKeys` prop, shipped Phase 25) — neutral, never role-colored, never vermilion. No
new ghost CSS.

---

## Copywriting Contract

All new copy lives in a new `inversions.*` i18n domain
(`src/lib/i18n/messages/inversions.ts`), registered in `messages/index.ts` exactly like every
prior domain file (`progressions.ts` is the closest structural precedent — mirror its
Symbol-Immunity comment block verbatim). **Symbol Immunity**: the chord symbol (e.g. `Cm7`), the
bass note letter, and role-shorthand markers (R/3/5/7) are NEVER routed through `t()` — only the
surrounding words are keyed. No em dashes anywhere (periods/colons/middots only, per project-wide
rule). French primary, English secondary (mirrors every other domain file's `fr`/`en` ordering
convention in this codebase, even though `en` is listed first in the source object per existing
file structure).

| Element | Copy (FR, primary) | Copy (EN) |
|---------|------|------|
| Prompt sentence (chord symbol via `ChordGlyph`, NOT keyed) | "{glyph} — {inversionName}, {bassRoleWord} à la basse." | "{glyph} — {inversionName}, {bassRoleWord} in the bass." |
| Inversion names (`{inversionName}`) | "fondamentale" (root) / "1ᵉʳ renversement" / "2ᵉ renversement" / "3ᵉ renversement" | "root position" / "1st inversion" / "2nd inversion" / "3rd inversion" |
| Bass-role word (`{bassRoleWord}`), keyed per role | root: "fondamentale" · third: "tierce" · fifth: "quinte" · seventh: "septième" | root: "the root" · third: "the third" · fifth: "the fifth" · seventh: "the seventh" |
| Inversion-rotation strip cell labels (passive, read-only — see Component Contract §2) | "Fond." / "1ᵉʳ renv." / "2ᵉ renv." / "3ᵉ renv." (abbreviated per the 013 fit rule; only as many cells as the chord has inversions — 3 for a triad, 4 for a seventh) | "Root" / "1st inv." / "2nd inv." / "3rd inv." |
| Check button | "Vérifier" | "Check" |
| Hear-it button (optional, always available, never gates — mirrors the app-wide Hear-It convention) | "Entendre" | "Hear it" |
| Retry, notes wrong (chord chroma mismatch) | "Pas tout à fait. Rejoue les bonnes notes." | "Not quite. Play the right notes." |
| Retry, notes right but bass wrong (the distinguishing feedback — see Component Contract §4) | "Les notes sont bonnes, mais la basse doit être : {bassRoleWord}." | "Right notes, but the bass must be: {bassRoleWord}." |
| Reveal confirmation line (after a correct play) | "Renversement correct. Même 4 notes, basse différente." | "Correct inversion. Same 4 notes, different bass." |
| Hint reveal control, depth 0 (mirrors the LOCKED Phase 34 exact copy) | "Afficher un indice ▾" | "Show a hint ▾" |
| Hint reveal control, depth 1→2 (next: stack order) | "Montrer l'ordre depuis la basse" | "Show the order from the bass" |
| Hint reveal control, depth 2→3 (next: ghost keys) | "Montre-moi" | "Show me" |
| Rung 1 tag | "INDICE {n} · LA BASSE" | "HINT {n} · THE BASS" |
| Rung 1 body | "{inversionName} → la basse est {bassArticle} {bassLetter} ({bassRoleWord})." | "{inversionName} → the bass is {bassLetter} ({bassRoleWord})." |
| Rung 2 tag | "INDICE {n} · L'ORDRE DEPUIS LA BASSE" | "HINT {n} · THE ORDER FROM THE BASS" |
| Rung 2 body (precedes the rotated `CountingChipRow`) | "À partir de {bassLetter}, empile l'accord :" | "Starting from {bassLetter}, stack the chord:" |
| Rung 3 tag | "INDICE {n} · MONTRE-MOI" | "HINT {n} · SHOW ME" |
| Rung 3 body | "Les touches en pointillé indiquent où jouer, la basse est cerclée. Joue-les, puis vérifie." | "The dashed keys show where to play, the bass is ringed. Play them, then check." |
| Closing note (ladder exhausted) | "L'indice s'estompe quand la carte mûrit." | "The hint fades as the card matures." |
| Empty state | not applicable — this phase has no list/empty-collection surface | — |
| Destructive confirmation | not applicable — no destructive action in this phase | — |

**French fit rule (013):** the inversion-rotation strip has the tightest budget (4 cells across
one row at phone width) — the abbreviated "Fond. / 1ᵉʳ renv. / 2ᵉ renv. / 3ᵉ renv." forms above
are the pre-abbreviated default; if the executor finds any of the rung/prompt copy still
overflows at 390px, abbreviate further per the existing 013 precedent, provided the meaning and
the "same notes, different bass" framing survive.

**`{bassArticle}` (rung 1 body):** French elision/gender for the bass role word ("la basse",
"le fondamentale" reads awkwardly — prefer "la {bassRoleWord}" uniformly since all four role
words above are feminine nouns in this app's existing vocabulary — "la tierce", "la quinte", "la
septième" — except "fondamentale" which is already a feminine adjective-as-noun in this app's
established usage (see `progressions.hint.degree.rootLabel` "Fondamentale :"). Use "la
fondamentale" for root-position consistency. No new grammar helper needed — a small literal
per-role article map alongside the bass-role-word map, matching `ProgressionDrill.svelte`'s own
local `ROMAN_TO_DEGREE`-style small local map precedent.

---

## Component Contract (phase-specific — beyond the generic template)

This phase's real design risk is component-level (a NEW drill family touching `PianoKeyboard`
and `composePracticeQueue`), not generic-dimension-level. The sections below are the load-bearing
part of this UI-SPEC — several resolve 35-CONTEXT's "Claude's Discretion" items with a concrete
recommended shape; where a question is genuinely open, it is flagged explicitly rather than
silently decided, mirroring 34-UI-SPEC's own precedent for the tonic-anchoring question.

### 1. New component: `InversionDrill.svelte`, hub-embedded only (no standalone route)

**Decision:** this is a NET-NEW component with no legacy flat route to preserve (unlike
`ShellVoicingDrill`/`ProgressionDrill`, which predate the v2.2 hub consolidation and kept their
own `/voicings`/`/progressions` routes as thin standalone wrappers). Since Inversions has no such
legacy surface, its shape should mirror `PracticeChordDrill.svelte`/`PracticeIntervalDrill.svelte`
(Phase 27-03) instead: a Practice-hub-only component, one-shot init props, no standalone page.

```ts
interface Props {
  /** The chord symbol this item drills (from the host's queue), e.g. "Cm7". */
  symbol: string;
  /** Which inversion to drill: 0 = root position, 1 = 1st inv., 2 = 2nd inv., 3 = 3rd inv. (7ths only). */
  inversionIndex: number;
  /** Fired exactly once, at the user's Next tap after the reveal (mirrors PracticeChordDrill/PracticeIntervalDrill). */
  onComplete: (correct: boolean) => void;
}
```

Both `symbol` and `inversionIndex` are read once at init via `untrack()` (mirrors
`PracticeChordDrill`'s own one-shot init-read precedent) — a fresh component instance per queue
item, not a reactive re-derivation.

### 2. Prompt & passive inversion-rotation strip

Layout, top to bottom (mirrors sketch 023-B exactly):
1. `<ChordGlyph>` at Display size, the chord's root+quality (the symbol IS shown — this is not
   an earn-the-symbol drill, 35-CONTEXT explicitly notes this).
2. Prompt sentence (Copywriting Contract row 1) naming the target inversion and its bass role.
3. The inversion-rotation strip: a row of `N` cells (`N` = 3 for a triad, 4 for a seventh chord —
   see §8), each a small bordered mono-label cell (`.invpick`-equivalent CSS from the sketch),
   the CURRENT target inversion's cell filled vermilion, the rest neutral ink-on-paper-bright.
   **This strip is PASSIVE/read-only** (the sketch's own caption: "the drill rotates through the
   4 inversions" — it is a progress/orientation indicator across the family's own draws, not a
   tappable inversion picker). No `onclick`, no `role="button"`, no `tabindex` on its cells.
4. The interactive `PianoKeyboard` (see §3/§4).
5. "Vérifier" (primary) + "Entendre" (ghost) button row.
6. Retry line (gated on the last check's outcome — see §4) or the reveal confirmation line.
7. The hint ladder (see §5), rendered only while unanswered.

### 3. Bass emphasis: new `bassHint` prop on `PianoKeyboard`

**Decision:** add one new additive prop, matching every existing gated-prop convention
(`ghostKeys`, `pendingKeys`) — chroma+octave matched, omission leaves every prior render
byte-identical:

```ts
/**
 * The single key that should carry the bass ink-ring + "B" badge (Phase 35,
 * INV-01): matched by CHROMA + octave, like ghostKeys, so an enharmonic
 * spelling still lands on the right key. UNLIKE ghostKeys/selectedClass, this
 * is NOT gated on `!role` — the bass ring must render whether the matching
 * key already carries an interval-role fill (reveal state), a ghost hatch
 * (hint state), or neither (rung-1-only hint state), since "which of the 4
 * already-colored notes is the bass" is exactly the thing being taught.
 * Omitting it (undefined/null) leaves rendering byte-identical to today.
 */
bassHint?: { letter: string; octave: number } | null;
```

New CSS (verbatim from `counting-hint-grammar.md`, adapted to the `data-bass`/`::after` idiom
already established by `ghostMarker`/`data-ghost`):
```css
.piano-keyboard__key--bass-ring { outline: 3px solid var(--color-ink); outline-offset: -3px; z-index: 4; }
.piano-keyboard__key--bass-ring::after {
  content: attr(data-bass); position: absolute; top: 2px; left: 2px; z-index: 5;
  font-family: var(--font-mono); font-size: 8px; font-weight: 700;
  background: var(--color-ink); color: #fff; padding: 1px 3px;
}
```

**Both the hint-ladder rung 1 AND the post-answer reveal use the SAME prop**, always pinned to
the chord's fixed base octave (`KEYBOARD_BASE_OCTAVE = 4`, the same constant
`ProgressionDrill.svelte` already uses for its `ghostKeysForCurrentBar`) — the bass letter is
just whichever of the chord's own 4 canonical spelled notes (`spellChord(symbol).notes`) has the
role matching the target inversion's bass role (see §8's role-to-inversion-index table), so no
new octave-tracking logic is needed: `{ letter: bassNote.letter, octave: KEYBOARD_BASE_OCTAVE }`.

### 4. Grading contract: chroma set + bass check (resolves 35-CONTEXT's discretion item)

**Recommended shape** (new pure module `src/lib/drills/matchInversion.ts`, mirroring
`matchChord.ts`'s existing file shape and JSDoc style):

```ts
export interface InversionMatchResult {
  correct: boolean;       // chordCorrect && bassCorrect
  chordCorrect: boolean;  // matchChord(...).correct, reused verbatim
  bassCorrect: boolean;
  missing: number[];      // from matchChord, unchanged
  extra: number[];        // from matchChord, unchanged
}

export function matchInversion(
  played: Set<number>,
  playedBassChroma: number | undefined,
  target: ChordResult,
  bassChroma: number
): InversionMatchResult { /* chordCorrect = matchChord(played, target).correct;
                              bassCorrect = playedBassChroma === bassChroma */ }
```

This composes `matchChord` rather than duplicating its chroma-set logic (per 35-CONTEXT's
explicit instruction), and gives the copywriting contract's two distinct retry lines a clean
boolean to branch on (`chordCorrect && !bassCorrect` → the "right notes, wrong bass" line;
`!chordCorrect` → the generic wrong-notes line).

**Open sub-question flagged for the planner (how `playedBassChroma` is derived):**
`PianoKeyboard`'s existing interactive `selected` state is letter-only and octave-agnostic
(`Set<string>`, D-03) — by design, so it survives an octave-count change. That means the
component alone cannot say which PHYSICAL key (and therefore which register) the user actually
pressed for a given letter when the same letter could be reached at two different rendered
octaves. **Recommended default:** thread the keyboard's EXISTING `onPress` callback (already
fires `(letter, octave)` on every interactive pointerdown, currently used only for
haptics/audio-hook purposes) into a second, parallel local map inside `InversionDrill.svelte`
(e.g. `pressedOctaveByLetter: Map<string, number>`, last-press-wins per letter) alongside the
existing `selected`/`onToggle` pair that already drives the visual hatch. At Check time, derive
`playedBassChroma` as the chroma of whichever selected letter has the LOWEST `(octave * 12 +
chroma)` value among `pressedOctaveByLetter`. This requires **zero changes** to
`PianoKeyboard`'s existing contract (`onPress` already exists and already reports real octave) —
purely additive local state in the new drill component. If the executor finds this reads as
unreliable in practice (e.g. a user toggling a key off/on across octaves mid-answer), flag it
back rather than inventing a new keyboard-selection mechanism mid-implementation, per the same
escape-hatch convention 34-UI-SPEC established for its own open question.

### 5. Hint ladder (3 rungs max, richest last — locked 010-A pattern, mirrors Phase 34 exactly)

Inline markup inside `InversionDrill.svelte` (NOT an extension of `HintLadder.svelte`, for the
same reason 34-UI-SPEC gave: that shared component's fixed layer-kind API doesn't fit these
rungs, and grafting a 6th layer kind onto a component also consumed by `RecallSession`/
`BuildSession` risks REG-01 outside this phase's scope). Reuses `HintLadder.svelte`'s proven
escalating-cumulative interaction grammar verbatim (one reveal control, cumulative reveal,
already-revealed rungs never collapse, `stamp-in` 240ms keyframe on each newly-revealed rung,
`Button variant="ghost"` with the same dashed-quiet-control override). `data-testid` prefix:
`inversion-` (`inversion-hint-ladder`, `inversion-hint-cta`, `inversion-hint-layer` with
`data-layer="bass" | "stack" | "ghost"`, `inversion-hint-closing-line`).

| Rung (`data-layer`) | Content | Notes |
|---|---|---|
| `bass` | Copywriting rung-1 body + `bassHint` set on an otherwise-plain (unanswered) `PianoKeyboard` — the ring/badge alone, no ghost hatch yet, no role fills yet | Depth-0→1 reveal |
| `stack` | Copywriting rung-2 body + a rotated `CountingChipRow` starting from the bass (see §6) | Depth-1→2 reveal |
| `ghost` | Copywriting rung-3 body; the actual ghost-hatched keys (all 4 chord tones) plus the SAME `bassHint` ring render on the live `PianoKeyboard`, not inside the rung text | Depth-2→3 reveal. Mirrors Phase 34's "the rung's content is the keyboard reacting" pattern |

Depth resets to 0 whenever a fresh queue item's `InversionDrill` instance mounts (a new
component instance per item per §1 — no cross-item depth leakage possible); depth does NOT reset
on a wrong Check within the same item (a wrong guess must not punish by hiding hints already
earned — same rule as Phase 34).

### 6. Rotated `CountingChipRow` for the stack-order rung (open component-API question, recommended resolution)

The stack-order rung must show the chord's tones **starting from the bass**, not the canonical
root-first order `CountingChipRow` always renders today (its `stackedThirdsFor(chord)` call is
root-anchored). Rotating a 4-note chord away from root position also breaks the tertian gap
pattern for at least one of the rotated gaps (e.g. Cm7's 2nd inversion from G: G→B♭ = m3, B♭→C =
M2, C→E♭ = m3 — a genuine non-third gap in the MIDDLE of the row, not just at the wrap edge).

**Recommended resolution:** extend `CountingChipRow` with one new optional prop rather than
building a second, parallel component — keeps the "one source of truth" goal 35-CONTEXT
explicitly asks for:

```ts
/** Rotates the tone/gap row to start at this role instead of the canonical root-first order (Phase 35, INV-02). Omitted keeps today's root-first render byte-identical. */
rotateFromRole?: IntervalRole;
```

When set, `CountingChipRow` rotates `chord.notes` to start at the tone whose role matches
`rotateFromRole`, then recomputes gaps between each CONSECUTIVE pair in the rotated order (real
semitone distance, not assumed thirds) — reusing whatever gap-interval helper `stackedThirdsFor`
already calls internally (per the existing precedent: "gaps derived via `intervalBetween` on
consecutive... pairs"), not a hand-rolled semitone calculation. The existing `gapModifier()`
function already has a neutral "other" state for any non-m3/M3 gap (shipped for WR-02's
sus4/6/9/13 case) — the rotated row's non-third gap(s) render through that SAME existing neutral
dashed treatment, no new visual state needed. Every existing call site (Phase 32 name-it
feedback, Phase 34 progression hint) omits `rotateFromRole` and is therefore byte-identical.

### 7. Maturity signal driving the hint-ladder fade (INV-02)

**Decision:** reuse `shellVoicing.ts`'s `voicingStageForChord(cards)` verbatim (Phase 33/34
precedent) — no new maturity metric. Read pattern mirrors `ProgressionDrill.svelte`'s own
self-contained, staleness-guarded `getAllCards()` call, filtered to the drilled `symbol`'s
inversion-family cards (whatever `factId`/`factKind` shape the planner settles on per
35-CONTEXT's FactKind discretion item — this UI-SPEC does not prescribe that storage shape,
only that its resulting `CardRecord[]` feeds `voicingStageForChord` exactly like every other
consumer).

| Stage | Ladder rungs offered |
|---|---|
| `meet` (no cards yet, or all `State.New`) | All 3: `bass`, `stack`, `ghost` |
| `subtract` (past New, not yet Review) | 2: `stack`, `ghost` (the `bass` rung is dropped — some exposure has already happened, mirrors Phase 34's exact drop-the-first-rung precedent) |
| `drill` (any card has reached `State.Review`) | 0 — no hint ladder rendered at all |

Unlike Phase 34 (SCAF-02), this phase has **no beginner-keyboard-span requirement** — INV-01/02
say nothing about reducing the keyboard to one octave. **Default:** leave `PianoKeyboard`'s
`octaves` prop unset (self-measuring responsive default), matching
`PracticeChordDrill`/`PracticeIntervalDrill`/`BuildSession`'s own default behavior, not
`ProgressionDrill`'s forced 1-octave-at-beginner-stage override (that override is SCAF-02-
specific and out of this phase's requirement scope).

### 8. Chord pool & per-quality inversion count (draws from the existing v1 matrix, no new symbols)

Per 35-CONTEXT: draw only from the app's existing `ROOTS × QUALITY_SUFFIXES` matrix
(`randomChord.ts`), never a new chord symbol. Triads (`''`, `'m'`, `'dim'` — 3 notes: root/
third/fifth) get 3 inversions; seventh chords (`'maj7'`, `'m7'`, `'7'`, `'m7b5'`, `'dim7'` — 4
notes: root/third/fifth/seventh) get 4. Bass role per inversion index:

| `inversionIndex` | Name (FR) | Bass role (triad or 7th) |
|---|---|---|
| 0 | fondamentale | root |
| 1 | 1ᵉʳ renversement | third |
| 2 | 2ᵉ renversement | fifth |
| 3 | 3ᵉ renversement | seventh (7th chords only — never drawn for a 3-note triad) |

This table is the single source both the prompt copy (§ Copywriting) and the bass-hint/grading
role lookups (§3/§4) should derive from — no parallel inversion-naming logic.

### 9. Practice-queue integration (visual implications only — INV-03's scheduling mechanics are non-visual)

Visually, an inversion item in the Practice hub queue behaves exactly like every other embedded
family today: the host renders `InversionDrill` inside the same carded-family session chrome
(family cue, FSRS grade commit, end-card) already used for `voicing`/`progression` synthetic
items or `name-it`/`build-it`/`interval` carded items — no new page chrome, no new session-level
visual treatment. This phase does NOT touch cold-session ordering (that is QUEUE-01, Phase 36,
reordering the same `composePracticeQueue` this phase's family addition extends) — a scaffold-
heavy inversion item may still lead a cold session after this phase ships; that is explicitly
deferred, not a regression to fix here.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (not applicable — no shadcn in this stack) | not required |

No third-party registry is declared or used. No registry vetting gate applies.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
