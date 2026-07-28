# Phase 34: Progression Scaffold & Beginner Keyboard - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 3 (1 modified component, 2 modified/new i18n + test surfaces implied)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/components/ProgressionDrill.svelte` (MODIFIED — inline hint ladder + beginner keyboard span added, no new file) | component (drill) | request-response (tap-driven reveal + chroma-graded play) | `src/lib/components/ShellVoicingDrill.svelte` (self-contained maturity read) + `src/lib/components/HintLadder.svelte` (escalating reveal interaction/CSS) | exact (composite: two analogs, each covering a different concern of the same file) |
| (no new `.svelte` file — ladder is inline markup per UI-SPEC §1, NOT an extension of `HintLadder.svelte`) | — | — | — | n/a |
| `src/lib/i18n/messages/progressions.ts` (MODIFIED — new keys) | config (i18n messages) | CRUD (static key/value) | itself, existing `progressions` domain object | exact |
| `src/lib/components/progressionDrill.test.ts` or equivalent (MODIFIED/EXTENDED test surface) | test | request-response (component interaction test) | `src/lib/components/shellVoicingDrill.test.ts` / `src/lib/components/hintLadder.test.ts` | exact |

Only one production file changes in this phase (`ProgressionDrill.svelte`), per the CONTEXT's REG-01 scope lock — the "file list" here is really "concerns within that one file," each best matched to a different existing analog.

## Pattern Assignments

### `src/lib/components/ProgressionDrill.svelte` — maturity-signal read (SCAF-01 fade thresholds + SCAF-02 span)

**Analog:** `src/lib/components/ShellVoicingDrill.svelte` (self-contained FSRS maturity read, Phase 33 precedent named directly in UI-SPEC §4)

**Imports pattern** (`ShellVoicingDrill.svelte` lines 1–23):
```svelte
import { untrack } from 'svelte';
import {
	fullStackNotes,
	optionalMarkers,
	rootlessNotes,
	seventhChordSymbols,
	shellNotes,
	voicingStageForChord,
	type VoicingStage
} from '$lib/practice/shellVoicing';
import { getAllCards, type CardRecord } from '$lib/srs/deck';
```
For `ProgressionDrill.svelte`, add:
```svelte
import { voicingStageForChord, type VoicingStage } from '$lib/practice/shellVoicing';
import { getAllCards, type CardRecord } from '$lib/srs/deck';
```
(`voicingStageForChord` is reused verbatim per UI-SPEC §4 — do not write a parallel maturity function.)

**Staleness-guarded async load pattern** (`ShellVoicingDrill.svelte` lines 72–100):
```typescript
let cards = $state<CardRecord[]>([]);
let cardsLoaded = $state(false);

async function loadCards(forSymbol: string) {
	cardsLoaded = false;
	const all = await getAllCards();
	if (forSymbol !== symbol) return; // stale response: a newer draw superseded it
	cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
	cardsLoaded = true;
}

$effect(() => {
	void loadCards(symbol);
});
```
**Adaptation for ProgressionDrill:** key the `$effect` off `currentBar.symbol` (or `cursor`) instead of a single `symbol` state var, since the "current chord" changes every bar advance, not just on a fresh draw. Guard the same way: compare the resolved bar's symbol against whatever bar is current when the promise lands, and drop stale responses. Gate all ladder/keyboard-span rendering behind `cardsLoaded` (mirrors `{#if cardsLoaded}` at `ShellVoicingDrill.svelte` line 318) so a fresh bar never flashes the previous bar's stage.

**Stage derivation** (`ShellVoicingDrill.svelte` lines 111–116, and `shellVoicing.ts` lines 90–94):
```typescript
const stage = $derived.by((): VoicingStage => {
	void metVersion;
	const derived = voicingStageForChord(cards);
	if (derived === 'meet' && hasVoicingMet(symbol)) return 'subtract';
	return derived;
});
```
```typescript
export function voicingStageForChord(cards: CardRecord[]): VoicingStage {
	if (cards.some((card) => card.state === State.Review)) return 'drill';
	if (cards.length === 0 || cards.every((card) => card.state === State.New)) return 'meet';
	return 'subtract';
}
```
**Adaptation:** ProgressionDrill has no `voicingMet`-equivalent "shown once" gate, so skip the `hasVoicingMet` override line entirely — just `const stage = $derived.by(() => voicingStageForChord(cards))`. Map `stage` to the UI-SPEC §4 table directly (`meet`→3 rungs/1 octave, `subtract`→2 rungs/1 octave, `drill`→0 rungs/2 octaves).

**Ghost-key marker derivation precedent** (`shellVoicing.ts` lines 63–78, `ShellVoicingDrill.svelte` lines 179–188):
```typescript
export function optionalMarkers(chord: ChordResult): OptionalMarker[] {
	const markers: OptionalMarker[] = [];
	for (const note of chord.notes) {
		if (note.role === 'root') markers.push({ letter: note.letter, marker: 'R' });
	}
	for (const note of chord.notes) {
		if (note.role === 'fifth') markers.push({ letter: note.letter, marker: '5' });
	}
	return markers;
}
```
```svelte
const KEYBOARD_BASE_OCTAVE = 4;
const ghostKeys = $derived.by(() =>
	optionalMarkers(chord).map((marker) => ({
		letter: marker.letter,
		octave: KEYBOARD_BASE_OCTAVE,
		marker: marker.marker
	}))
);
```
**Adaptation:** UI-SPEC §3 extends the marker vocabulary from R/5 to all four roles (R/3/5/7). Write this inline in `ProgressionDrill.svelte` rather than adding it to `shellVoicing.ts` (that module is chord-formula-drill-scoped, not progression-scoped) — a small local function over `spellChord(currentBar.symbol).notes`, mapping `role` (`'root'|'third'|'fifth'|'seventh'`) to marker text (`'R'|'3'|'5'|'7'`), pinned to a fixed base octave exactly like `KEYBOARD_BASE_OCTAVE` above. Only populate when the `ghost` rung has been revealed (empty array otherwise) — mirrors `ShellVoicingDrill`'s pattern of `ghostKeys` being a plain derived array that's simply empty when not applicable.

---

### `src/lib/components/ProgressionDrill.svelte` — escalating hint-ladder interaction/CSS (SCAF-01)

**Analog:** `src/lib/components/HintLadder.svelte` (interaction grammar + CSS to mirror, NOT to import — UI-SPEC §1 explicitly rejects grafting a 5th layer kind onto this shared component)

**Reveal-depth state + control pattern** (`HintLadder.svelte` lines 56, 93–96):
```typescript
let shownDepth = $state(0);

function reveal() {
	if (shownDepth === 0) onOpen?.();
	shownDepth = Math.min(shownDepth + 1, layers.length);
}
```
**Adaptation for ProgressionDrill:** local `let hintDepth = $state(0)` scoped so it resets to 0 whenever `cursor` changes (per UI-SPEC §1 — "wrap the ladder's local depth state... so a fresh bar starts closed again"). No `onOpen` callback needed (that was for cancelling RecallSession's auto-advance; ProgressionDrill has no such auto-advance). The rung set actually offered comes from `stage` (meet/subtract/drill), not a fixed `layers` prop — cap `hintDepth` at the current stage's rung count, not a static `layers.length`.

**Renumbered tier label pattern** (`HintLadder.svelte` lines 88–91):
```typescript
function tierLabel(index: number): string {
	return `${t('recall.hint.tier-prefix')} ${index + 1} · ${TIER_TITLE[layers[index]]}`;
}
```
**Adaptation:** same renumbering idea — tags always read "INDICE 1 · …" / "INDICE 2 · …" relative to whichever rungs are ACTUALLY offered at the current stage (UI-SPEC §2, "mirrors `HintLadder.svelte`'s own `tierLabel`/renumbering precedent exactly"), never the rung's fixed ordinal in the full 3-rung list.

**Markup shape to mirror (rung block + reveal CTA)** (`HintLadder.svelte` lines 99–154):
```svelte
<div class="hint-ladder" data-testid="hint-ladder">
	<div class="hints">
		{#each layers.slice(0, shownDepth) as layer, index (layer)}
			<div class="hint stamp" data-testid="hint-layer" data-layer={layer}>
				<p class="text-label text-muted font-mono uppercase">{tierLabel(index)}</p>
				<!-- per-layer content -->
			</div>
		{/each}
	</div>

	{#if shownDepth < layers.length}
		<div class="hint-cta mt-6" data-testid="hint-cta">
			<Button type="button" variant="ghost" onclick={reveal}>{controlLabel}</Button>
		</div>
	{:else}
		<p class="hint-closing-line text-label mt-6" data-testid="hint-closing-line">
			{t('recall.hint.closing')}
		</p>
	{/if}
</div>
```
**Adaptation:** rename `data-testid`s per UI-SPEC §1's `progression-` prefix convention: `progression-hint-ladder`, `progression-hint-cta`, `progression-hint-layer` (with `data-layer="degree"|"count"|"ghost"`), `progression-hint-closing-line`. Content per rung is the UI-SPEC §2 table (degree text / `<CountingChipRow>` / ghost instructional line), not `HintLadder`'s family/formula/keyboard/spelling set. Render this block ONLY when `step === 'play'` (UI-SPEC §1).

**CSS to copy verbatim** (`HintLadder.svelte` lines 156–205):
```css
.stamp {
	animation: stamp-in 240ms ease-out;
}
.hints {
	display: flex;
	flex-direction: column;
	gap: 3px; /* documented raw-px exception, not a new token */
}
.hint {
	background: var(--color-paper-bright);
	padding: var(--spacing-md);
}
.hint-closing-line {
	color: var(--color-muted);
	font-style: italic;
}
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
Copy this CSS block into `ProgressionDrill.svelte`'s `<style>` scope (scoped styles don't cross component files) with the same class names — this is the "reuse the exact dashed-quiet-control override" instruction from UI-SPEC §1.

---

### `src/lib/components/ProgressionDrill.svelte` — count rung (`CountingChipRow` embed)

**Analog:** `src/lib/components/CountingChipRow.svelte` (imported directly, not re-authored — single source of truth per UI-SPEC §2)

**Props contract** (`CountingChipRow.svelte` lines 30–43):
```typescript
interface Props {
	chord: ChordResult;
	showLegend?: boolean;
	ariaLabel?: string;
}
```
**Usage for the count rung** (per UI-SPEC §2):
```svelte
<CountingChipRow chord={spellChord(currentBar.symbol)} />
```
`showLegend` left at its component default (`true`). `spellChord` is already imported in `ProgressionDrill.svelte` (line 13) — no new import needed beyond `CountingChipRow` itself.

---

### `src/lib/components/ProgressionDrill.svelte` — ghost keys wired onto the live `PianoKeyboard`

**Analog:** `PianoKeyboard.svelte`'s existing `ghostKeys` prop (shipped Phase 25, consumed today by `ShellVoicingDrill.svelte`)

**Prop shape** (`PianoKeyboard.svelte` line 183):
```typescript
ghostKeys?: { letter: string; octave: number; marker: string }[];
```

**Current call site to extend** (`ProgressionDrill.svelte` line 258):
```svelte
<PianoKeyboard notes={[]} interactive {selected} onToggle={toggleKey} />
```
**New call site (additive only, per UI-SPEC §3):**
```svelte
<PianoKeyboard
	notes={[]}
	interactive
	{selected}
	onToggle={toggleKey}
	ghostKeys={hintDepth >= ghostRungIndex ? ghostKeysForCurrentBar : []}
	octaves={stage === 'drill' ? 2 : 1}
/>
```
`notes` stays `[]` (unanswered) — UI-SPEC §3 confirms no role-fill vs. ghost precedence conflict arises. `octaves` is passed explicitly (not left to self-measurement) per UI-SPEC §4's requirement that the 1-octave reduction hold regardless of viewport width.

**Octave-count derivation precedent** (`keyboardLayout.ts` lines 52–54, self-measure fallback at `PianoKeyboard.svelte` lines 235–258):
```typescript
export function octavesForWidth(availableWidthPx: number, minWhiteKeyPx = 44): 1 | 2 {
	return availableWidthPx >= 15 * minWhiteKeyPx ? 2 : 1;
}
```
This is the width-based auto-fallback `PianoKeyboard` uses when `octaves` is NOT explicitly passed (`PianoKeyboard.svelte` line 243: `if (octaves !== undefined) return;`). Per UI-SPEC §4, ProgressionDrill must NOT rely on this — it passes `octaves` explicitly, tied to `stage`, so the beginner span holds independent of viewport width.

**Tonic-anchoring note (flagged, do NOT implement):** `keyboardLayout.ts`'s `WHITE_LETTER_PATTERN` (line 31) is always C-anchored regardless of key; UI-SPEC §4 explicitly directs NOT to add tonic-relabeling — only toggle the `octaves` count. `assignNotesToKeys`'s existing wrap-around fallback (`keyboardLayout.ts` lines 163–190) already resolves every chord tone to a visible key within a 1-octave span for any tonic, so no new layout logic is needed.

---

## Shared Patterns

### Async maturity read — staleness guard
**Source:** `src/lib/components/ShellVoicingDrill.svelte` lines 82–100
**Apply to:** `ProgressionDrill.svelte`'s new `$effect`/`loadCards`-equivalent, keyed off the current bar's symbol instead of a single top-level `symbol`. Gate all ladder/span rendering behind a `cardsLoaded`-equivalent flag exactly as `ShellVoicingDrill.svelte` does (`{#if cardsLoaded}` wrapping the whole staged UI, line 318).

### Quiet "ghost" reveal control
**Source:** `src/lib/components/HintLadder.svelte` lines 190–204 (CSS) — reuse `Button variant="ghost"` with the scoped dashed-quiet override, do not invent a new `Button` variant.
**Apply to:** the single "Afficher un indice ▾" reveal control in `ProgressionDrill.svelte`.

### `stamp-in` reveal animation
**Source:** `app.css`'s shared `@keyframes stamp-in` (already used by `HintLadder.svelte`'s `.stamp`, `RecallSession`, `PianoKeyboard`, `ChordGlyph`)
**Apply to:** each newly-revealed rung block in `ProgressionDrill.svelte` (`class="... stamp"`), matching `HintLadder.svelte`'s own per-rung stamp-in.

### i18n Symbol Immunity + no-em-dash copy
**Source:** `src/lib/i18n/messages/progressions.ts` (existing domain, see e.g. lines 29–45 for the FR/EN key-pair shape) and `src/lib/copy/mnemonics.ts`'s `mnemonicFor`/`familyLineFor` (already imported by `HintLadder.svelte` for quality-word phrasing, per UI-SPEC's copywriting contract).
**Apply to:** all new rung copy — add keys to the existing `progressions` object (both `en`/`fr` blocks), never route chord symbols/roman numerals/note letters through `t()`.

### Role-tinted chip / ghost-hatch visual grammar (do not re-derive)
**Source:** `CountingChipRow.svelte` (tone/gap chip CSS) and `PianoKeyboard.svelte`'s `.piano-keyboard__key--ghost` treatment (referenced, not re-read in full — confirmed present via `ghostClass`/`ghostEntryFor` at lines 607–644).
**Apply to:** rung 2 (count) and rung 3 (ghost) content — both are pure prop-driven reuse, no new CSS needed in `ProgressionDrill.svelte` for these two rungs' visual treatment (only the rung-container/CTA CSS copied from `HintLadder.svelte` above is new to this file).

## No Analog Found

None — every new concern in this phase has a direct, named precedent in the codebase (per CONTEXT.md's explicit reuse mandate: `CountingChipRow`, `HintLadder`'s interaction grammar, `ShellVoicingDrill`'s maturity read, `PianoKeyboard`'s `ghostKeys`/`octaves` props, and `keyboardLayout.ts`'s existing wrap-around fallback all pre-exist and are reused rather than reinvented).

## Metadata

**Analog search scope:** `src/lib/components/` (ProgressionDrill, HintLadder, CountingChipRow, ShellVoicingDrill, PianoKeyboard), `src/lib/components/keyboardLayout.ts`, `src/lib/practice/shellVoicing.ts`, `src/lib/i18n/messages/progressions.ts`
**Files scanned:** 8 read in full or targeted range, plus a directory listing of `src/lib/components/`
**Pattern extraction date:** 2026-07-27
