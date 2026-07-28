<script lang="ts">
	import { untrack } from 'svelte';
	import { Note } from 'tonal';
	import { spellChord } from '$lib/theory/chord';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { getAllCards, type CardRecord } from '$lib/srs/deck';
	import { voicingStageForChord, type VoicingStage } from '$lib/practice/shellVoicing';
	import {
		bassNoteFor,
		bassRoleForIndex,
		inversionCountFor,
		inversionVoicing,
		INVERSION_BASE_OCTAVE
	} from '$lib/practice/inversions';
	import { matchInversion } from '$lib/drills/matchInversion';
	import type { IntervalRole } from '$lib/theory/types';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import CountingChipRow from './CountingChipRow.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Practice-hub render component for the new inversion drill family
	 * (Phase 35, INV-01/INV-02). Mirrors PracticeChordDrill's one-shot
	 * embed-prop init shape and ProgressionDrill's interactive-keyboard
	 * grading + escalating hint-ladder shape, over the pure 35-01
	 * inversions.ts engine and matchInversion grading.
	 *
	 * One chord, one target inversion at a time: the symbol is shown up
	 * front (not earned), the passive strip is a read-only progress
	 * indicator across the family's own draws (never a picker), and grading
	 * checks both the chroma set and the required bass note - a wrong play
	 * retries with one of two distinct lines and never gates.
	 *
	 * SYNTHETIC family: the maturity read reads the drilled chord's own
	 * chord-formula card(s) via voicingStageForChord, exactly like
	 * ProgressionDrill/ShellVoicingDrill - no dedicated card kind for this
	 * family.
	 */
	interface Props {
		/** The chord symbol this item drills (from the host's queue), e.g. "Cm7". */
		symbol: string;
		/** Which inversion to drill: 0 root, 1 third-in-bass, 2 fifth-in-bass, 3 seventh-in-bass (7ths only). */
		inversionIndex: number;
		/**
		 * Fired exactly once, at the user's Next tap after the reveal.
		 *
		 * A wrong play retries and never gates, so every completion here is
		 * eventually correct - which is precisely why the host cannot read
		 * "completed" as "right". `firstTry` reports whether the reveal was
		 * reached with no wrong Check at all (B3), so the round's accuracy
		 * figure means the same thing for this family as for the carded ones.
		 * The pedagogy is untouched: a wrong play still just retries.
		 */
		onComplete: (firstTry: boolean) => void;
	}

	let { symbol, inversionIndex, onComplete }: Props = $props();

	/**
	 * One-shot init reads (fresh component instance per queue item, mirrors
	 * PracticeChordDrill/ProgressionDrill's own untrack precedent): the
	 * drilled chord, its target inversion index, bass role/note/chroma, and
	 * its inversion count never change across this instance's lifetime.
	 */
	const target = untrack(() => spellChord(symbol));
	const drilledIndex = untrack(() => inversionIndex);
	const bassRole = untrack(() => bassRoleForIndex(drilledIndex));
	const bassNote = untrack(() => bassNoteFor(target, drilledIndex));
	const bassChroma = untrack(() =>
		bassNote ? Note.chroma(toAsciiAccidentals(bassNote.letter)) : -1
	);
	const bassLetter = bassNote?.letter ?? '';
	const count = untrack(() => inversionCountFor(symbol));
	const quality = target.symbol.slice(target.root.length);
	const stripIndexes = Array.from({ length: count }, (_, i) => i);
	/** Pinned to the fixed base octave (matches ProgressionDrill's KEYBOARD_BASE_OCTAVE convention), so bassHint/ghost keys always land on the keyboard's rendered span. */
	const bassHintEntry = bassNote ? { letter: bassNote.letter, octave: INVERSION_BASE_OCTAVE } : null;

	let selected = $state<Set<string>>(new Set());
	/** Last-press-wins per letter (35-UI-SPEC section 4's recommended shape): fed by the keyboard's existing onPress(letter, octave) hook, purely additive local state. */
	let pressedOctaveByLetter = $state(new Map<string, number>());
	let answered = $state(false);
	let retryKind = $state<'none' | 'notes' | 'bass'>('none');
	/**
	 * Sticky for this instance (B3): set by ANY wrong Check, never cleared by a
	 * later correct one. `retryKind` is transient (it resets as soon as the play
	 * is right), so it cannot answer "was this item earned on the first try" -
	 * which is what the host needs to grade the item honestly.
	 */
	let missedOnce = $state(false);

	function toggleKey(letter: string): void {
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	function handlePress(letter: string, octave: number): void {
		const next = new Map(pressedOctaveByLetter);
		next.set(letter, octave);
		pressedOctaveByLetter = next;
	}

	/**
	 * The chroma of whichever selected letter sits at the lowest absolute
	 * pitch (octave*12 + chroma), using pressedOctaveByLetter (defaulting to
	 * the base octave for a letter toggled without ever registering a press).
	 * Undefined when nothing is selected.
	 */
	function lowestPlayedBassChroma(): number | undefined {
		let lowestScore: number | undefined;
		let lowestChroma: number | undefined;
		for (const letter of selected) {
			const octave = pressedOctaveByLetter.get(letter) ?? INVERSION_BASE_OCTAVE;
			const chroma = Note.chroma(toAsciiAccidentals(letter));
			const score = octave * 12 + chroma;
			if (lowestScore === undefined || score < lowestScore) {
				lowestScore = score;
				lowestChroma = chroma;
			}
		}
		return lowestChroma;
	}

	/** Check: grades via matchInversion. Wrong chord notes or right notes/wrong bass both retry gently and never gate; only a correct voicing (bass lowest) reveals. */
	function checkPlay(): void {
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const playedBassChroma = lowestPlayedBassChroma();
		const result = matchInversion(playedChroma, playedBassChroma, target, bassChroma);
		selected = new Set();
		pressedOctaveByLetter = new Map();

		if (!result.chordCorrect) {
			retryKind = 'notes';
			missedOnce = true;
			return;
		}
		if (!result.bassCorrect) {
			retryKind = 'bass';
			missedOnce = true;
			return;
		}
		retryKind = 'none';
		answered = true;
	}

	/** Optional, always-available "Hear it" - never gates, mirrors PracticeChordDrill's reveal-chord playback. */
	function hearIt(): void {
		void ensureAudioReady();
		playChord(target.notes.map((note) => note.letter));
	}

	/**
	 * Self-contained FSRS maturity read (mirrors ProgressionDrill's own
	 * self-contained getAllCards read): a fresh instance per queue item with
	 * a fixed symbol means no cursor/staleness guard across bars is needed,
	 * unlike ProgressionDrill's per-bar re-read. A rejected read fails closed
	 * to the cold-beginner default (meet: all 3 rungs offered).
	 */
	let cards = $state<CardRecord[]>([]);
	let cardsLoaded = $state(false);

	async function loadCards(): Promise<void> {
		try {
			const all = await getAllCards();
			cards = all.filter((card) => card.factId === `chord-formula:${symbol}`);
		} catch {
			cards = [];
		} finally {
			cardsLoaded = true;
		}
	}

	$effect(() => {
		void loadCards();
	});

	/** The drilled chord's own pedagogy stage (voicingStageForChord reused verbatim, no parallel maturity metric). */
	const stage = $derived.by((): VoicingStage => voicingStageForChord(cards));

	type HintLayer = 'bass' | 'stack' | 'ghost';

	/** The rungs offered at the current maturity stage (INV-02): meet offers all 3, subtract drops the bass rung, drill offers none. */
	const offeredRungs = $derived.by((): HintLayer[] => {
		if (stage === 'meet') return ['bass', 'stack', 'ghost'];
		if (stage === 'subtract') return ['stack', 'ghost'];
		return [];
	});

	/** How many of offeredRungs are currently revealed. A fresh instance per queue item starts at 0; a wrong Check never resets it (already-earned hints are never punished away). */
	let hintDepth = $state(0);

	function revealHint(): void {
		hintDepth = Math.min(hintDepth + 1, offeredRungs.length);
	}

	/** True once the ghost rung (always last in offeredRungs, when present) has actually been revealed - gates ghostKeys so no ghost hint ever shows before that tap. */
	const ghostRevealed = $derived(offeredRungs.includes('ghost') && hintDepth >= offeredRungs.length);

	/** The target inversion's ascending voicing (bass lowest), mapped to PianoKeyboard's ghostKeys shape. */
	const ghostKeysForInversion = $derived.by(() =>
		inversionVoicing(target, drilledIndex).map((note) => ({
			letter: note.letter,
			octave: note.octave,
			marker: note.marker
		}))
	);

	const HINT_TIER_TITLE: Record<HintLayer, string> = $derived({
		bass: t('inversions.hint.tier.bass'),
		stack: t('inversions.hint.tier.stack'),
		ghost: t('inversions.hint.tier.ghost')
	});

	/** Tier tags renumber sequentially from whichever rungs are actually offered (mirrors ProgressionDrill's hintTierLabel/renumbering precedent). */
	function hintTierLabel(index: number): string {
		return `${t('inversions.hint.tier.prefix')} ${index + 1} · ${HINT_TIER_TITLE[offeredRungs[index]]}`;
	}

	const HINT_REVEAL_LABEL: Record<HintLayer, string> = $derived({
		bass: t('inversions.hint.reveal.start'),
		stack: t('inversions.hint.reveal.stack'),
		ghost: t('inversions.hint.reveal.ghost')
	});

	/** Depth-0 is always the "show a hint" control; after that, the label names the next rung to reveal. */
	const hintControlLabel = $derived(
		hintDepth === 0 ? t('inversions.hint.reveal.start') : HINT_REVEAL_LABEL[offeredRungs[hintDepth] ?? 'bass']
	);

	/** Immune values (chord symbol, bass letter) never route through t(); only the surrounding words are keyed. */
	const inversionName = $derived(t(`inversions.name.${drilledIndex}` as MessageKey));
	const bassRoleWord = $derived(bassRole ? t(`inversions.bassRole.${bassRole}` as MessageKey) : '');

	/** Prompt sentence: "{inversionName}: {bassArticle} {bassRoleWord} {inBass}." - the chord symbol itself is shown separately via ChordGlyph, never keyed. */
	const promptText = $derived(
		`${inversionName}: ${t('inversions.bass.article')} ${bassRoleWord} ${t('inversions.prompt.inBass')}.`
	);

	/** The distinguishing "right notes, wrong bass" retry line, naming the target bass role. */
	const retryBassText = $derived(`${t('inversions.retry.wrongBass')} ${bassRoleWord}.`);

	/** Rung 1 body: composed lead/mid/closing around the immune bass letter, mirroring inversions.ts's own header-comment composition. */
	const rung1Body = $derived(
		`${inversionName}. ${t('inversions.hint.bass.mid')} ${bassLetter} (${t('inversions.bass.article')} ${bassRoleWord}).`
	);

	/** Rung 2 body: precedes the bass-rotated CountingChipRow. */
	const rung2Body = $derived(
		`${t('inversions.hint.stack.lead')} ${bassLetter}, ${t('inversions.hint.stack.closing')}`
	);
</script>

<div data-testid="inversion-drill">
	<div class="glyph-row">
		<ChordGlyph root={target.root} {quality} stamped={answered} />
	</div>

	<p class="text-body prompt" data-testid="inversion-prompt">{promptText}</p>

	<div class="strip" data-testid="inversion-strip">
		{#each stripIndexes as i (i)}
			<span class="strip-cell" class:strip-cell--active={i === drilledIndex}>
				{t(`inversions.abbr.${i}` as MessageKey)}
			</span>
		{/each}
	</div>

	<div class="keyboard-wrap mt-4">
		<PianoKeyboard
			notes={answered ? target.notes : []}
			interactive={!answered}
			{selected}
			onToggle={toggleKey}
			onPress={handlePress}
			octaves={2}
			bassHint={!answered && ghostRevealed ? bassHintEntry : null}
			ghostKeys={!answered && ghostRevealed ? ghostKeysForInversion : []}
		/>
	</div>

	{#if !answered}
		<div class="actions mt-4">
			<Button type="button" variant="primary" onclick={checkPlay} data-testid="inversion-check">
				{t('inversions.button.check')}
			</Button>
			<Button type="button" variant="ghost" onclick={hearIt}>
				{t('inversions.button.hearIt')}
			</Button>
		</div>

		{#if retryKind === 'notes'}
			<p class="retry" data-testid="inversion-retry-notes">{t('inversions.retry.wrongNotes')}</p>
		{:else if retryKind === 'bass'}
			<p class="retry" data-testid="inversion-retry-bass">{retryBassText}</p>
		{/if}

		{#if cardsLoaded && offeredRungs.length > 0}
			<div class="hint-ladder" data-testid="inversion-hint-ladder">
				<div class="hints">
					{#each offeredRungs.slice(0, hintDepth) as layer, index (layer)}
						<div class="hint stamp" data-testid="inversion-hint-layer" data-layer={layer}>
							<p class="text-label text-muted font-mono uppercase">{hintTierLabel(index)}</p>
							{#if layer === 'bass'}
								<p class="text-body mt-2">{rung1Body}</p>
							{:else if layer === 'stack'}
								<p class="text-body mt-2">{rung2Body}</p>
								<div class="mt-2">
									<CountingChipRow chord={target} rotateFromRole={bassRole} showLegend={false} />
								</div>
							{:else if layer === 'ghost'}
								<p class="text-body mt-2">{t('inversions.hint.ghost.body')}</p>
							{/if}
						</div>
					{/each}
				</div>

				{#if hintDepth < offeredRungs.length}
					<div class="hint-cta mt-6" data-testid="inversion-hint-cta">
						<Button type="button" variant="ghost" onclick={revealHint}>{hintControlLabel}</Button>
					</div>
				{:else}
					<p class="hint-closing-line text-label mt-6" data-testid="inversion-hint-closing-line">
						{t('inversions.hint.closing')}
					</p>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="reveal" data-testid="inversion-reveal">{t('inversions.reveal.correct')}</p>
		<div class="mt-4">
			<Button type="button" variant="primary" onclick={() => onComplete(!missedOnce)}>
				{t('inversions.button.next')}
			</Button>
		</div>
	{/if}
</div>

<style>
	.glyph-row {
		display: flex;
	}

	.prompt {
		margin-top: var(--spacing-sm);
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
	}

	.strip-cell {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.04em;
		border: 1.5px solid var(--color-ink);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-paper-bright);
		color: var(--color-ink);
	}

	.strip-cell--active {
		background: var(--color-vermilion);
		color: var(--color-paper);
		border-color: var(--color-vermilion);
	}

	.actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.retry {
		margin-top: var(--spacing-sm);
		color: var(--color-vermilion);
	}

	.reveal {
		margin-top: var(--spacing-md);
		font-weight: 700;
	}

	/* Escalating hint ladder: interaction/CSS mirrored verbatim from
	   ProgressionDrill.svelte's proven shape (itself mirroring
	   HintLadder.svelte), not imported - this drill's rungs
	   (bass/stack/ghost) don't fit that shared component's fixed
	   layer-kind API. */
	.hint-ladder {
		margin-top: var(--spacing-lg);
	}

	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	.hints {
		display: flex;
		flex-direction: column;
		gap: 3px;
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
</style>
