<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import NoteLabel from './NoteLabel.svelte';
	import Button from './Button.svelte';
	import { playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import { getDockRegistry } from '$lib/keyboard/dockContext.svelte';
	import {
		createScaleKeyboardDrillState,
		expectedTarget,
		gradeScaleTap,
		placeAscendingScaleKeys,
		SCALE_DRILL_OCTAVES,
		type ScaleKeyboardDrillState,
		type ScaleKeyPlacement,
		type ScaleTarget
	} from '$lib/practice/scaleKeyboardDrill';
	import { whiteLettersForOctaves, blackKeysForOctaves } from '$lib/components/keyboardLayout';
	import type { SpelledNote } from '$lib/theory/types';

	/**
	 * Tonic-anchored 2-octave scale keyboard drill (SCALE-04). Replaces the
	 * retired degree-ladder Practice surface: the user taps a real keyboard
	 * ascending then descending, graded by pitch class (never letter-string
	 * equality) via the pure scale-drill state machine in $lib/practice. The
	 * tonic (degree 1) is always the leftmost highlighted key; the octave
	 * (degree 8) lands on a distinct higher key, placed by placeAscendingScaleKeys.
	 *
	 * Renders its own keyboard from the shared, pure keyboardLayout geometry
	 * (whiteLettersForOctaves/blackKeysForOctaves) rather than delegating to
	 * PianoKeyboard, since PianoKeyboard's assignNotesToKeys can collapse the
	 * returning octave onto the tonic key when the 7th degree is a black key
	 * (see 10-02-PLAN.md's recorded design decision) and its wrongLetters prop
	 * paints a permanent-per-reveal cross mark, not a momentary flash.
	 *
	 * Only the tappable key-strip docks with the shared keyboard dock
	 * (KBD-01, Scope Decision 6, Phase 15 Plan 04) - the degree register, the
	 * ascending/descending prompt, and the completion card stay in this
	 * component's own scrolling flow, never in the dock.
	 */
	type KeyKind = 'white' | 'black';

	interface Props {
		/** The seven spelled scale degrees, degree 1 first. */
		notes: SpelledNote[];
		/** The scale tonic (degree 1's letter). */
		tonic: string;
	}

	let { notes, tonic }: Props = $props();

	function freshState(): ScaleKeyboardDrillState {
		return createScaleKeyboardDrillState(notes);
	}

	let drill = $state<ScaleKeyboardDrillState>(freshState());
	/** Key currently flashing wrong; cleared after a short beat. */
	let wrongKey = $state<{ kind: KeyKind; keyIndex: number } | null>(null);
	let wrongTimer: ReturnType<typeof setTimeout> | undefined;
	let containerEl: HTMLDivElement | undefined = $state();

	/** The 8 ascending degree placements (degree 8 is the distinct octave key). */
	const placements = $derived(placeAscendingScaleKeys(notes));
	/**
	 * Keyed by the physical key actually tapped (`kind:keyIndex`), not by the
	 * degree's precomputed canonical placement: a 2-octave board always
	 * contains a second (sometimes third) key sharing every degree's pitch
	 * class, and grading accepts a correct tap on any of them (chroma-only,
	 * per SCALE-04) - so the fill must land on whichever key the user
	 * actually touched, or an accepted tap on a non-canonical duplicate would
	 * advance the drill while visibly filling a key nobody tapped.
	 */
	let filledMap = $state<Map<string, ScaleKeyPlacement>>(new Map());
	const tonicPlacement = $derived(placements[0]);
	/**
	 * Static (fill-independent) map from every physical key that IS one of
	 * the 8 canonical ascending placements to its scale degree - restores the
	 * degree semantics the retired ladder's `aria-label` carried (WR-04),
	 * without depending on tap/fill history (so a key's accessible name never
	 * changes mid-drill, keeping repeated lookups - e.g. the descending leg
	 * re-tapping the same keys - stable).
	 */
	const placementByKey = $derived.by(() => {
		const map = new Map<string, ScaleKeyPlacement>();
		for (const placement of placements) {
			map.set(`${placement.kind}:${placement.keyIndex}`, placement);
		}
		return map;
	});
	/** The canonical key for the currently-expected target, or undefined once done. */
	const expectedPlacement = $derived.by(() => {
		const target = expectedTarget(drill);
		return target ? placements[target.degree - 1] : undefined;
	});

	const register = $derived.by(() => {
		const target: ScaleTarget | null = expectedTarget(drill);
		if (!target) return '';
		return `DEGREE ${target.degree} OF 8 · ${target.direction.toUpperCase()}`;
	});

	// A new tonic/scale (or "Run it again") starts the drill over.
	$effect(() => {
		notes;
		tonic;
		reset();
	});

	function reset() {
		drill = freshState();
		filledMap = new Map();
		clearWrong();
		void tick().then(scrollTonicIntoView);
	}

	function clearWrong() {
		wrongKey = null;
		clearTimeout(wrongTimer);
		wrongTimer = undefined;
	}

	const dockToken = Symbol('scale-keyboard-drill-dock');
	const dockRegistry = getDockRegistry();

	/**
	 * Hands only the tappable key-strip (`keyStrip`) to the shared dock - no
	 * `register` snippet, since the degree register/prompt stay inline
	 * (Scope Decision 6). Cleared whenever the drill completes (`drill.done`)
	 * so a finished drill's dock shows no stray keys; `reset()` flips
	 * `drill.done` back to false, which re-registers on the next effect run.
	 */
	// Track only the `done` boolean, not the whole `drill` object: `drill` is
	// reassigned (`drill = result.state`) on every correct tap, so an effect
	// reading `drill.done` directly would re-run - and re-register a fresh dock
	// config object - on each tap, needlessly re-triggering KeyboardDock's
	// --dock-height effect. A $derived boolean only notifies the effect when its
	// value actually flips, so registration fires once per done<->not-done edge
	// (IN-02).
	const drillDone = $derived(drill.done);
	$effect(() => {
		if (drillDone) {
			dockRegistry?.clear(dockToken);
		} else {
			// inputRequired: tapping the key-strip IS the drill - the dock must
			// never hide it, even if collapse was persisted on a passive page (WR-01).
			dockRegistry?.register({ token: dockToken, keyboard: keyStrip, inputRequired: true });
		}
	});

	// If the component unmounts (e.g. switching back to Explore, or
	// navigating away) while a wrong-flash timer is pending, cancel it so
	// its callback never fires against an already-torn-down instance. Also
	// clears the dock registration so a stray key-strip never lingers once
	// Practice mode unmounts (T-15-03).
	onDestroy(() => {
		clearTimeout(wrongTimer);
		dockRegistry?.clear(dockToken);
	});

	function scrollTonicIntoView() {
		const el = containerEl?.querySelector('[data-tonic-key="true"]') as HTMLElement | null;
		el?.scrollIntoView?.({ inline: 'start', block: 'nearest' });
	}

	function handleTap(kind: KeyKind, keyIndex: number, letter: string) {
		const target = expectedTarget(drill);
		const result = gradeScaleTap(drill, letter);

		if (result.correct) {
			drill = result.state;
			clearWrong();
			// Canonical placement supplies this degree's role/letter/solfege and
			// the pitch to play, but the fill itself is keyed by the key the
			// user actually tapped (kind/keyIndex), which may be a different,
			// same-chroma duplicate key elsewhere on the board (CR-01).
			const canonical = target ? placements[target.degree - 1] : undefined;
			if (canonical) {
				playNote(toPitch(canonical.letter, canonical.octave));
				const next = new Map(filledMap);
				next.set(`${kind}:${keyIndex}`, canonical);
				filledMap = next;
			}
			return;
		}

		wrongKey = { kind, keyIndex };
		clearTimeout(wrongTimer);
		wrongTimer = setTimeout(() => {
			wrongKey = null;
		}, 320);
	}

	function handleKeydown(event: KeyboardEvent, activate: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			activate();
		}
	}

	function isTonicKey(kind: KeyKind, keyIndex: number): boolean {
		return tonicPlacement?.kind === kind && tonicPlacement?.keyIndex === keyIndex;
	}

	function roleClass(kind: KeyKind, keyIndex: number): string {
		const placement = filledMap.get(`${kind}:${keyIndex}`);
		return placement ? `key--${placement.role}` : '';
	}

	function wrongClass(kind: KeyKind, keyIndex: number): string {
		return wrongKey?.kind === kind && wrongKey.keyIndex === keyIndex ? 'key--wrong' : '';
	}

	/**
	 * Restores scale-degree semantics to the per-key label (WR-04): a
	 * screen-reader user can always tell which scale degree a key represents
	 * in the ascending sequence, not just its raw keyboard-key identity.
	 * Non-canonical duplicate keys (same pitch class, no assigned degree)
	 * keep the plain board-identity label.
	 */
	function ariaLabelFor(kind: KeyKind, keyIndex: number, letter: string, octave: number): string {
		const canonical = placementByKey.get(`${kind}:${keyIndex}`);
		return canonical
			? `${letter}${octave} key, scale degree ${canonical.degree}`
			: `${letter}${octave} key`;
	}

	/** Whether this key is the canonical key for the currently-expected degree. */
	function isExpectedKey(kind: KeyKind, keyIndex: number): boolean {
		return expectedPlacement?.kind === kind && expectedPlacement?.keyIndex === keyIndex;
	}

	/** Base octave of the keyboard's leftmost C (matches the audio voicing's octave 4). */
	const BASE_OCTAVE = 4;

	function whiteKeyOctave(index: number): number {
		return BASE_OCTAVE + Math.floor(index / 7);
	}

	function blackKeyOctave(afterWhiteIndex: number): number {
		return BASE_OCTAVE + Math.floor(afterWhiteIndex / 7);
	}

	interface RenderWhiteKey {
		index: number;
		letter: string;
		octave: number;
		leftPct: number;
	}

	interface RenderBlackKey {
		index: number;
		sharpLetter: string;
		octave: number;
		leftPct: number;
	}

	const whiteLetters = whiteLettersForOctaves(SCALE_DRILL_OCTAVES);
	const blackKeyPatterns = blackKeysForOctaves(SCALE_DRILL_OCTAVES);
	const whiteKeyWidthPct = 100 / whiteLetters.length;
	const blackKeyWidthPct = whiteKeyWidthPct * 0.6;
	const MIN_WHITE_KEY_PX = 44;

	const whiteKeys: RenderWhiteKey[] = whiteLetters.map((letter, index) => ({
		index,
		letter,
		octave: whiteKeyOctave(index),
		leftPct: index * whiteKeyWidthPct
	}));

	const blackKeys: RenderBlackKey[] = blackKeyPatterns.map(({ afterWhiteIndex, sharpLetter }, index) => ({
		index,
		sharpLetter,
		octave: blackKeyOctave(afterWhiteIndex),
		leftPct: (afterWhiteIndex + 1) * whiteKeyWidthPct - blackKeyWidthPct / 2
	}));
</script>

<div class="scale-keyboard-drill" data-testid="scale-keyboard-drill">
	{#if drill.done}
		<div
			class="border-ink bg-paper-bright complete mt-2 border-2 px-4 py-6"
			data-testid="scale-keyboard-complete"
		>
			<p class="msg">Voila. {tonic} major, up and down, clean.</p>
			<Button type="button" onclick={reset}>Run it again</Button>
		</div>
	{:else}
		<p class="text-body">Play {tonic} major ascending, then descending.</p>
		<p
			class="register text-label mt-2 font-mono uppercase"
			data-testid="scale-keyboard-register"
			aria-live="polite"
		>
			{register}
		</p>
	{/if}
</div>

{#snippet keyStrip()}
	<div
		class="scroll-wrap"
		bind:this={containerEl}
		role="group"
		aria-label={`Scale keyboard, ${tonic} major, two octaves`}
	>
		<div
			class="keys"
			style="min-width: {whiteLetters.length * MIN_WHITE_KEY_PX}px;"
		>
			{#each whiteKeys as key (key.index)}
				{@const placement = filledMap.get(`white:${key.index}`)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="key key--white {roleClass('white', key.index)} {wrongClass('white', key.index)}"
					style="left: {key.leftPct}%; width: {whiteKeyWidthPct}%;"
					role="button"
					tabindex="0"
					aria-label={ariaLabelFor('white', key.index, key.letter, key.octave)}
					aria-current={isExpectedKey('white', key.index) ? 'step' : undefined}
					data-tonic-key={isTonicKey('white', key.index)}
					onclick={() => handleTap('white', key.index, key.letter)}
					onkeydown={(event) => handleKeydown(event, () => handleTap('white', key.index, key.letter))}
				>
					{#if placement}
						<NoteLabel letter={placement.letter} solfege={placement.solfege} highlighted />
					{/if}
				</div>
			{/each}
			{#each blackKeys as key (key.index)}
				{@const placement = filledMap.get(`black:${key.index}`)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="key key--black {roleClass('black', key.index)} {wrongClass('black', key.index)}"
					style="left: {key.leftPct}%; width: {blackKeyWidthPct}%;"
					role="button"
					tabindex="0"
					aria-label={ariaLabelFor('black', key.index, key.sharpLetter, key.octave)}
					aria-current={isExpectedKey('black', key.index) ? 'step' : undefined}
					data-tonic-key={isTonicKey('black', key.index)}
					onclick={() => handleTap('black', key.index, key.sharpLetter)}
					onkeydown={(event) => handleKeydown(event, () => handleTap('black', key.index, key.sharpLetter))}
				>
					{#if placement}
						<NoteLabel letter={placement.letter} solfege={placement.solfege} highlighted />
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

<style>
	.scale-keyboard-drill {
		display: flex;
		flex-direction: column;
	}

	.scroll-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.keys {
		position: relative;
		height: 160px;
	}

	.key {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: var(--spacing-xs);
		touch-action: manipulation;
		-webkit-touch-callout: none;
		user-select: none;
		cursor: pointer;
		transition:
			transform 90ms ease-out,
			filter 90ms ease-out;
	}

	.key:active {
		transform: scale(0.96);
		filter: brightness(0.94);
	}

	@media (prefers-reduced-motion: reduce) {
		.key:active {
			transform: none;
			filter: none;
		}
	}

	.key--white {
		height: 100%;
		background-color: var(--color-paper-bright);
		border: 1.5px solid var(--color-ink);
		z-index: 1;
	}

	.key--black {
		height: 60%;
		background-color: var(--color-ink);
		z-index: 2;
	}

	/* Pre-tap cue marking the canonical tonic (degree 1) key: the fixed
	   2-octave board always contains at least one other same-pitch-class key
	   elsewhere, and grading accepts a correct tap on any of them, so without
	   this ring nothing distinguishes "the" expected tonic key from its
	   duplicates before the first tap lands. Stays visible after filling too
	   (an inset ring layers fine over a role fill color). */
	.key[data-tonic-key='true'] {
		box-shadow: inset 0 0 0 3px var(--color-verdigris);
	}

	.key--root {
		background-color: var(--color-root);
	}
	.key--second {
		background-color: var(--color-second);
	}
	.key--third {
		background-color: var(--color-third);
	}
	.key--fourth {
		background-color: var(--color-fourth);
	}
	.key--fifth {
		background-color: var(--color-fifth);
	}
	.key--sixth {
		background-color: var(--color-sixth);
	}
	.key--seventh {
		background-color: var(--color-seventh);
	}

	/* Declared after the role fills above so equal (single-class) specificity
	   lets the transient wrong flash win by source order, matching
	   PianoKeyboard's own wrong-fill convention: it overrides an
	   already-filled degree key during the descending leg, then reverts. */
	.key--wrong {
		background-color: var(--color-wrong);
	}

	.complete .msg {
		font: 700 var(--text-heading) / 1.2 var(--font-serif);
		color: var(--color-verdigris);
		margin: 0 0 var(--spacing-sm);
	}
</style>
