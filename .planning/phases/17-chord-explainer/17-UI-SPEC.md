---
phase: 17
slug: chord-explainer
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-17
---

# Phase 17 — UI Design Contract

> Visual and interaction contract for the Recall hint ladder: an escalating, cumulative, in-place "Need a hint?" affordance that reveals plain-English family → formula chips → mini keyboard → full spelling, one layer per tap, without ever hiding the way the card is graded. This phase is design-complete at the decision level (17-CONTEXT.md D-01..D-06 are LOCKED; sketch 010 Variant A is the winner). This contract resolves the remaining copy/layout/timing/scope gaps the sketch and context left open, and flags two genuine ambiguities it resolves by explicit decision (marked "Resolution" below) rather than re-asking.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — hand-built "Print Shop" design system (no component-library registry; not applicable to this SvelteKit/Tailwind project) |
| Preset | not applicable |
| Component library | none (new `HintLadder.svelte` composed entirely from existing `ChordGlyph.svelte`, `IntervalScaffold.svelte`/`IntervalChip.svelte`, `PianoKeyboard.svelte`, `NoteLabel.svelte`, `SongHook.svelte`, `Button.svelte`) |
| Icon library | none (copy-only controls, no icons — matches every other control in this codebase) |
| Font | `--font-serif` (ChordGlyph inside the deepest layer), `--font-mono` (tier labels, the hint control), `--font-sans` (hint body copy) — all pre-existing, no new fonts |

This phase adds **zero new design tokens**. It reuses the Print Shop token contract (`src/app.css`) verbatim: palette, interval colors, spacing scale, type roles, and the shared `stamp-in` keyframe. No new keyframe is needed (unlike Phase 16, this phase does not add motion primitives — every hint layer's entrance reuses `stamp-in` exactly as `RecallSession.svelte`'s existing `.stamp` class already applies it).

---

## Spacing Scale

Declared values (existing project scale, multiples of 4 — unchanged):

| Token | Value | Usage in this phase |
|-------|-------|----------------------|
| xs | 4px | Gap between a note-letter box and its solfège tag in Layer 4's spelling row |
| sm | 8px | Gap between grouped elements inside a hint layer block (e.g. between the tier label and its body) |
| md | 16px | Padding inside each `.hint` block (matches sketch); gap between Layer 4's spelling boxes |
| lg | 24px | `mt-6` above the "Need a hint?" control, separating it from the answer/keyboard area above (D-02 placement) |
| xl | 32px | Not newly used here |
| 2xl | 48px | Not newly used here |
| 3xl | 64px | Not newly used here |

**Exceptions:**
- **`hint-stack-gap: 3px`** — the vertical gap between stacked, already-revealed hint blocks (`.hints { gap: 3px }`, verbatim from the sketch). Deliberately tighter than the 4px `xs` token so the stacked blocks read as one continuous "receipt" of escalating help, not discrete separated cards. **3px is an established raw micro-value in this hand-built design system, not a new token or an oversight:** `ScaleDegreeStrip.svelte` already uses `gap: 3px` for the identical tight-chip-row pattern, the `Button` letterpress motif is `box-shadow: 3px 3px 0`, and `ChordGlyph` uses `left: 3px`. The ×4 scale (`--spacing-*`) governs layout spacing; sub-token micro-gaps like this one intentionally sit outside it, consistent with existing components. (A generic "multiples of 4 only" lint flags this — accepted as a documented, codebase-consistent exception.)
- The existing 44px minimum touch target (`Button.svelte`'s `min-height`/`min-width: 44px`) applies unchanged to the "Need a hint?" control and the hear-name-only "Continue" button below — both are `Button` instances, so this is automatic.

---

## Typography

Reused verbatim — no new sizes or weights (project caps at 4 sizes / 2 weights):

| Role | Size | Weight | Line Height | Used for in this phase |
|------|------|--------|-------------|--------------------------|
| Body | 16px | 400 | 1.5 | Layer 1 (family) and Layer 2 (formula sentence) body copy |
| Label | 12px | 700 | 1.4 | Tier labels ("Hint 1 · the family"), the hint control's own text, Layer 4's per-note solfège tags |
| Heading | 20px | 700 | 1.2 | Not newly used (Layer 4 uses ChordGlyph's own `--text-display`, not `--text-heading`) |
| Display | 56px | 700 | 1.05 | `ChordGlyph` re-rendered inside Layer 4 (the deepest layer's "dossier" name), same size as every other `ChordGlyph` instance app-wide — no shrunk variant invented |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--color-paper` `#f2ecdd` | Page background (unchanged) |
| Secondary (30%) | `--color-paper-bright` `#faf6ea` | Each stacked hint block's surface (`.hint { background: var(--color-paper-bright) }`, matches the sketch and every other card surface in the app) |
| Accent (10%) | `--color-vermilion` `#c8502e` | Reserved for: nothing new in this phase. The hint control and the "Continue" fallback button are both `ghost`, never vermilion — hints are a secondary, optional path, not the primary grading action. Vermilion stays reserved for the existing primary `Button`/root interval-color fill only |
| Destructive | not applicable | No destructive action in this phase |

**Interval color language (DESIGN-02, fixed system, unchanged):** root `--color-root` `#c8502e`, third `--color-third` `#3e7d6b`, fifth `--color-fifth` `#a89a7f`, seventh `--color-seventh` `#f0c948`. Layers 2, 3, and 4 all fill notes/chips by these exact roles via `formulaFor`'s existing `role` field — this phase introduces no new color, only new places these four colors get reused (`IntervalScaffold`'s chips, `PianoKeyboard`'s lit keys, Layer 4's spelling boxes).

**Quiet control treatment (D-02 "quiet ghost control", not a new Button variant):** the "Need a hint?" control reuses `Button variant="ghost"` with a scoped local-CSS override — dashed `--color-faint` border and `--color-muted` text at rest, flipping to solid `--color-ink` border/text on hover/focus. This mirrors the codebase's existing precedent of overriding a `Button` visually via a wrapping scoped class/inline style rather than adding a new variant (see `RecallSession.svelte`'s `gradeButtonStyle` inline override for the Again button, and its `.mode-a-controls :global(.ps-button)` width override). No new Button variant is introduced.

```css
/* Scoped inside the new component, mirrors RecallSession's :global(.ps-button) precedent */
.hint-cta :global(.ps-button--ghost) {
	border-style: dashed;
	border-color: var(--color-faint);
	color: var(--color-muted);
	width: 100%;
}
.hint-cta:hover :global(.ps-button--ghost),
.hint-cta:focus-within :global(.ps-button--ghost) {
	border-style: solid;
	border-color: var(--color-ink);
	color: var(--color-ink);
}
```

---

## Copywriting Contract

All copy below follows the project's no-em-dash convention (periods/colons/commas only) and displays accidentals as ♭/♯ glyphs only (memory: avoid-em-dashes-in-app-copy).

### Layer 1 — family-line copy addition (D-05)

`mnemonicFor` (existing, `src/lib/copy/mnemonics.ts`) already covers `maj7`, `m7`, `7`, `m7b5`, `dim7`. The v1 chord catalog (`QUALITY_SUFFIXES` in `randomChord.ts`) has exactly **8** qualities: `''`, `m`, `dim`, `maj7`, `m7`, `7`, `m7b5`, `dim7`. That leaves exactly **3** qualities with no mnemonic today: `''` (major triad), `m` (minor triad), `dim` (diminished triad).

**Correction to 17-CONTEXT.md D-05's wording:** D-05 says "major / minor / diminished / augmented triads," but `augmented` is not a supported v1 quality (`QUALITY_SUFFIXES` has no `aug`/`+`). Only 3 new entries are needed, not 4. Treated as decided; flag back if an augmented quality is meant to enter the catalog before this phase ships.

Add a new exported function alongside `mnemonicFor` (same file, same "better none than cheesy" doc convention):

```ts
/** Beginner-plain family line for the 3 triad qualities with no structural mnemonic (D-05). */
export function familyLineFor(qualitySuffix: string): string | null { ... }
```

| Quality suffix | Family-line copy |
|---|---|
| `''` (major triad) | A bright major triad: root, major 3rd, perfect 5th. |
| `m` (minor triad) | A minor triad: root, minor 3rd, perfect 5th. Same shape as major, just a darker 3rd. |
| `dim` (diminished triad) | Diminished means tense and unstable. It's a chord that sounds like it wants to move somewhere. Built from two stacked minor thirds. |

The `dim` line is reused verbatim from sketch 010's own copy (the canonical worked example), not rewritten.

**Resolution order for Layer 1:** `mnemonicFor(qualitySuffix) ?? familyLineFor(qualitySuffix)`. Every one of the 8 v1 qualities now resolves to a non-null line; there is no remaining gap.

### Layer 2 — formula-sentence copy (generated, not hardcoded)

One sentence, generated from `formulaFor(chord)`'s entries beyond the root, each rendered via the existing `intervalFromShort(entry.label).long` (already used elsewhere for plain English, e.g. `phraseStep`'s underlying table):

- **Triad (2 tones beyond root):** `From the root, stack a {long1}, then a {long2}.`
- **Seventh chord (3 tones beyond root):** `From the root, stack a {long1}, then a {long2}, then a {long3}.`

Example outputs (never hardcoded per-chord, always generated):

| Chord quality | Generated sentence |
|---|---|
| `dim` (Cdim) | From the root, stack a minor 3rd, then a diminished 5th. |
| `m7b5` (Cø7) | From the root, stack a minor 3rd, then a diminished 5th, then a minor 7th. |
| `maj7` | From the root, stack a major 3rd, then a perfect 5th, then a major 7th. |

This reuses the exact plain-English diction already established by `BuildSession`'s construction-step instructions (BUILD-03), giving the Explainer and Build-it surfaces one consistent vocabulary for interval names.

### Tier labels (mono, uppercase via existing `text-label` CSS — write copy in this case, CSS uppercases)

**4-layer ladder** (`see-play`, `hear-name`):

| Depth | Tier label |
|---|---|
| 1 | Hint 1 · the family |
| 2 | Hint 2 · the formula |
| 3 | Hint 3 · on the keys |
| 4 | Hint 4 · full spelling |

**3-layer ladder** (`formula-build`, chip layer skipped — renumbered sequentially, never "Hint 1, 3, 4"):

| Depth | Tier label |
|---|---|
| 1 | Hint 1 · the family |
| 2 | Hint 2 · on the keys |
| 3 | Hint 3 · full spelling |

### The "Need a hint?" control label (D-02: label advances with depth, disappears at max depth)

**4-layer ladder:**

| Depth shown | Control label |
|---|---|
| 0 | Need a hint? |
| 1 of 4 | Show the formula |
| 2 of 4 | Show it on the keyboard |
| 3 of 4 | Show the full spelling |
| 4 of 4 | control is hidden entirely |

**3-layer ladder:**

| Depth shown | Control label |
|---|---|
| 0 | Need a hint? |
| 1 of 3 | Show it on the keyboard |
| 2 of 3 | Show the full spelling |
| 3 of 3 | control is hidden entirely |

**Rule:** exactly one control exists at a time (not the sketch's two-button pattern of a top CTA plus a separate inline "Still stuck" button). Its label is always "the name of the next layer to reveal," except the very first tap which is always "Need a hint?" regardless of ladder length.

### Closing line (shown once the deepest layer is revealed, replacing the control)

`That's the whole chord.` — small, muted, italic (the existing 12px `text-label` size, `--color-muted`, `font-style: italic`; 13px is not an established size in `src/app.css`, so the closing line uses the 12px label role rather than inventing a 5th size). Deliberately does NOT say "grade yourself below" (the sketch's line): not every mode has a visible manual grading row at this point (see Scope Resolution below), so the closing line stays universally true across all three eligible modes.

### `hear-name`'s "Continue" fallback control (new, resolves a timing conflict — see below)

`Continue` — standard `Button variant="ghost"` (solid border, not dashed; this is a real committed action, not a quiet nudge).

| Element | Copy |
|---------|------|
| Primary CTA (n/a for this phase) | not applicable — this phase adds no new primary CTA |
| Empty state | not applicable — the ladder only ever renders inside an already-populated reviewing card |
| Error state | not applicable — no new error path; `HintLadder` derives everything from an already-validated `currentFact.symbol`, matching `RevealInsight`'s total-function convention (never throws on bad input) |
| Destructive confirmation | not applicable — no destructive action in this phase |

---

## Scope Resolution (genuine ambiguity, resolved — not re-asked)

**Which modes/facts get the ladder.** HINT-01 says "every Recall card," but 17-CONTEXT.md's D-03 names exactly three modes (`see-play`, `formula-build`, `hear-name`) and never mentions the pre-existing `formula` mode (`SYMBOL → FORMULA`). Resolution:

- The ladder renders **only** for `factKind === 'chord-formula'` cards in modes `see-play`, `formula-build`, and `hear-name`.
- The ladder does **not** render for the `formula` mode (`SYMBOL → FORMULA`), and does **not** render for `interval-size` or `scale-degree` facts in any mode.
- **Why:** the `formula` mode's own core mechanic (tap "Show Answer" → the formula chips appear, then grade) already delivers exactly Layer 2's + Layer 4's content in one guaranteed step — layering a redundant hint ladder on top of a mode whose entire purpose is "reveal the formula" would duplicate the mode's own answer, not help before it. `interval-size`/`scale-degree` facts have no chord quality at all, so `mnemonicFor`/`familyLineFor` (both keyed by chord-quality suffix) and the "stack these intervals from the root" framing do not apply to them; sketch 010 and all three of its variants are chord-only.
- If a future phase wants the ladder to also cover the `formula` mode or non-chord facts, that is new scope, not a gap in this contract. Flag back if this exclusion is wrong; otherwise it is decided.

**`hear-name`'s auto-advance vs. a meaningful post-answer ladder.** D-03 says `hear-name`'s ladder "reveals only after an answer is committed." But the existing `hearNameAdvanceTimer` auto-advances the queue `HEAR_NAME_ADVANCE_MS` (650ms) after any answer — far too short to tap into, read, and escalate through even one hint layer, let alone four. Resolution:

- The moment the learner taps "Need a hint?" post-answer (i.e., `shownDepth` goes from 0 to 1), `RecallSession` must `clearTimeout(hearNameAdvanceTimer)` so the queue does not advance out from under an open ladder.
- Once the timer is cancelled this way, a **"Continue"** ghost `Button` appears (see Copywriting Contract) as the new, explicit way to advance — mirroring the manual-advance pattern every other mode already uses (`Next` for `see-play`, the grade buttons for `formula`). It reads honest and simple: "you opened help, now you decide when to move on."
- If the learner never taps "Need a hint?", nothing changes: the existing 650ms auto-advance fires exactly as it does today. Zero behavior change on the default (no-hint) path — this is the same "gated-prop compatibility" discipline the rest of this codebase already follows for opt-in props.
- This does not violate RECALL-02 ("never gates progress"): grading already committed the instant the multiple-choice answer was tapped (unchanged); only the QUEUE's advance-to-next-card timing is deferred while help is open, which is strictly about pacing, not about gating the grade itself.

---

## Ladder Structure & Layer Contract

**Cumulative, always (D-01).** Each tap appends one more layer below the ones already shown; nothing already revealed is ever hidden or replaced. The whole stack (however deep) stays visible until the queue advances to the next card.

**Per-layer composition:**

| Layer | Reused component(s) | Content |
|---|---|---|
| 1. Family | none (plain text) | `mnemonicFor(qualitySuffix) ?? familyLineFor(qualitySuffix)`, rendered as one `text-body` paragraph |
| 2. Formula | `IntervalScaffold` (`entries={formulaFor(chord)}`, `level="full"`) | The generated formula sentence (Copywriting Contract above) as a `text-body` paragraph, followed by `IntervalScaffold` unmodified (its own "This chord is" label stays, layered under the ladder's own tier label — the two labels answer different questions and both stay) |
| 3. Mini keyboard | `PianoKeyboard` (`notes={chord.notes}`, `octaves={1}`, `inspectable`) | Wrapped in a `max-width: 320px` local container (`.hint-keyboard`), matching the sketch's mini-keyboard footprint. `octaves={1}` is passed explicitly (not left to the component's own `ResizeObserver` measurement) — this is deliberately always a compact "mini" keyboard, never the responsive 1-or-2-octave board used elsewhere, regardless of how wide the surrounding card is. `inspectable` keeps the existing tap-to-hear affordance every other reveal keyboard already has (matches the `formula` mode's own reveal keyboard, `<PianoKeyboard notes={chord.notes} inspectable />`) |
| 4. Full spelling | `ChordGlyph` (static, no `stamped`/`pulseToken`) + `NoteLabel` (`highlighted`) per note + `SongHook` | See "Layer 4 Composition" below |

**Layer 4 Composition (folds in Variant C's dossier per D-06):**

1. `ChordGlyph` re-rendered at its default size, `stamped={false}`, no `pulseToken` — static. (Not re-stamped/re-pulsed: the wrapping hint block's own `stamp-in` is the only entrance motion for this layer; double-animating the same reveal moment would fight visually.)
2. A row of note boxes, one per `chord.notes[]` entry, reusing the exact existing pattern from `RecallSession`'s scale-degree reveal (`<div class="inline-block border-2 p-2" style="border-color: var(--color-ink); background-color: var(--color-{role}); color: var(--color-on-{role});"><NoteLabel letter={note.letter} solfege={note.solfege} highlighted /></div>`), one box per note, `gap: var(--spacing-md)` between boxes, wrapping on narrow viewports.
3. `SongHook` with `short` = the interval label of the entry whose `role === 'third'` (every v1 quality has a third, and both `m3`/`M3` have vetted hooks in `songHooks.ts` today, so this always renders for the current catalog). Renders nothing if a future quality's third has no hook (`SongHook`'s own existing no-empty-frame contract, unchanged).

---

## Placement & Mode Adaptation Contract

**Universal placement rule (D-02):** the "Need a hint?" control sits directly below the prompt/answer/keyboard area for that mode and directly above whatever that mode's own commit action is. The ladder's stacked layer blocks render between the control and that commit action once opened (control moves down below the newly-appended stack each time, staying the last element before the commit action).

**"The grading row stays present" — what that means per mode (HINT-02):**

| Mode | The card's own "commit action" (must never be hidden/covered by the ladder) | Ladder available |
|---|---|---|
| `see-play` (Mode A) | Pre-answer: `Check`/`Clear` row. Post-answer: `Next` button. | Only pre-answer. The ladder (control + any opened layers) unmounts the instant `modeAAnswered` becomes true — the feedback panel that appears at that point already shows the correct notes directly, so a parallel hint ladder is redundant once the real answer is on screen. |
| `formula-build` (Mode C, embedded `BuildSession`) | `BuildSession`'s own internal step/construction flow, ending in its `onComplete` callback. There is no separate manual grading row at the `RecallSession` level for this mode today. | Available for the entire time this card is current (mounts alongside `BuildSession`, in its own block directly above the `<BuildSession>` mount — never inside it, never touching its internal state). Disappears naturally when the queue advances past this card. |
| `hear-name` (Mode B) | The 4-choice multiple-choice grid (pre-answer), then either the existing auto-advance OR the new `Continue` button (post-answer, once a hint is opened — see Scope Resolution above). | Only post-answer (`hearNameAnswered === true`), per D-03. The control does not even mount before an answer is committed — not just disabled, absent — so it cannot spoil the ear test. |

**Non-goal:** this phase makes no change to the `formula` mode's existing 4-button `Again`/`Hard`/`Good`/`Easy` grading row (`GRADES`/`handleGrade`) — that mode is out of the ladder's scope per the Scope Resolution above, and its grading row is untouched.

---

## Component Contract Additions

| Component/module | New capability needed | Contract it must satisfy |
|---|---|---|
| `HintLadder.svelte` (new, `src/lib/components/`) | A self-contained component taking `symbol: string` (the fact's chord symbol) and a `layers: ('family' \| 'formula' \| 'keyboard' \| 'spelling')[]` (either the full 4-item array or the 3-item array with `'formula'` omitted, per the host mode). Owns all derivation internally (`spellChord`, `formulaFor`, `mnemonicFor`/`familyLineFor`, `songHookFor`, `intervalFromShort`), mirroring `RevealInsight`'s "component owns derivation, page only passes symbols through" convention. Owns its own `shownDepth` state, the control's label table, and the closing line. | Must reset `shownDepth` to 0 whenever the card changes. Simplest correct mechanism: the host wraps the mount in a `{#key cardKey(currentItem.factId, currentItem.mode)}` block (the same pattern already used for the embedded `BuildSession` mount), so a fresh `HintLadder` instance is created per card rather than the component tracking card identity itself. Must never call `recordGrade`/`advanceQueue`/any FSRS-adjacent function directly (D-04: hints never touch grading) |
| `mnemonics.ts` | New exported `familyLineFor(qualitySuffix: string): string \| null` per Layer 1's copy table above | Same "better none than cheesy" total-function contract as `mnemonicFor`: unknown input returns `null`, never throws, never invents filler copy |
| `RecallSession.svelte` | Mount `HintLadder` conditionally per the Scope Resolution + Placement table above; for `hear-name`, wire the `hearNameAdvanceTimer` cancellation + `Continue` button described in Scope Resolution | Must not alter `see-play`/`hear-name`/`formula-build`'s existing grading/advance behavior on the no-hint-opened path (zero behavior change when the learner never taps "Need a hint?") |

---

## Animation & Reveal Behavior

- Every newly-appended hint layer block reuses the **existing** shared `stamp-in` keyframe exactly as `RecallSession.svelte`'s own `.stamp` class already applies it (`animation: stamp-in 240ms ease-out;`) — no new keyframe, per the locked house rule of reusing one shared entrance beat for every reveal (memory: loved-lookup-glyph-and-stamp-in — "reuse serif ChordGlyph + stamp-in reveal for every chord reveal, not just lookup").
- Layer 4's re-rendered `ChordGlyph` does **not** receive its own `stamped`/`pulseToken` props — the wrapping hint block's `stamp-in` is the only motion for that layer; stacking a second animation on the same reveal moment would visually fight, exactly the collision Phase 16's UI-SPEC already documented and avoided for the pulse/stamp-in pairing.
- No `pulse-once` anywhere in this phase — that keyframe is reserved for Phase 16's audio-synced reveal moment (BUILD reveal, `see-play`'s existing correct/wrong feedback), not for hint-ladder layers, which have no audio tick to sync to.
- The "Need a hint?" control's label change (D-02) and the closing line's appearance are plain text swaps, not animated transitions — no new motion needed for those.

---

## Reduced Motion

No new CSS is added to the existing `@media (prefers-reduced-motion: reduce)` rule in `app.css` — this phase introduces zero new animation classes. The only motion this phase uses (`stamp-in` via `.stamp`) is already covered by that existing rule, so hint layers appear as an instant state change (no fade/scale) under reduced motion, identical to every other `.stamp`-using reveal in the app today.

---

## Mobile / Responsive

- Hint layer blocks stack in a single column (`flex-direction: column`) at every viewport width, matching the sketch exactly — no responsive layout change needed since the ladder is already a narrow, phone-first single-column stack by construction.
- Layer 3's mini keyboard stays capped at `max-width: 320px` and `octaves={1}` regardless of viewport, so it never competes for space with `see-play`'s own answer keyboard on `/recall`. NOTE: the Phase-15 fixed-bottom keyboard dock has been REMOVED (keyboards now render inline in each page's flow), so there is no docked/fixed keyboard to reason about. The two keyboards on a `see-play` card — the drill's inline answer keyboard and this compact inline hint keyboard — are visually distinct in size, both live in the card's normal scroll flow, and never overlap in the DOM.
- Layer 4's note-box row wraps (`flex-wrap: wrap`) on narrow viewports, matching every other note-box row in this codebase (e.g. the `formula` mode's own formula-chip reveal row already wraps identically).
- The "Need a hint?" / "Continue" controls are full-width (`width: 100%`) `Button` instances, matching the existing full-width primary/ghost button convention already used for `Show Answer`, `Check`, etc. on mobile.

---

## Empty-State / No-Hook Handling

- `SongHook` (Layer 4) renders nothing when `songHookFor(thirdEntry.label)` returns `null` — unchanged existing component behavior, explicitly preserved (no-empty-frames rule, matching `RevealInsight`'s own documented convention).
- `mnemonicFor(qualitySuffix) ?? familyLineFor(qualitySuffix)` is total across all 8 v1 qualities today, so Layer 1 never has an empty-body case in the current catalog; if a 9th quality is ever added without a mnemonic AND without a family line, `HintLadder` must render nothing for Layer 1's body (never a placeholder like "no hint available") — same total-function discipline as every other copy-lookup in this codebase.
- If `spellChord(symbol)` somehow returns `recognized: false` for a card's stored symbol (should never happen for a validated fact, but mirrors `RevealInsight`'s own defensive guard), `HintLadder` renders nothing at all rather than a broken partial ladder.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | not applicable (no shadcn in this project — plain Svelte/Tailwind, hand-built components) | not applicable |
| third-party | none declared | not applicable |

No component-library registry is in use anywhere in this codebase. `components.json` does not exist and shadcn does not target Svelte in this project's stack. This section is not applicable to Phase 17.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
