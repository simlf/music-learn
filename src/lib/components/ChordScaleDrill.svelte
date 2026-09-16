<script lang="ts">
	import { untrack } from 'svelte';
	import {
		generateChordScaleQuestion,
		gradeChordScaleTap,
		isChordScaleQuestionAnswerable,
		type ChordScaleQuestion,
		type ChordScaleVerdict
	} from '$lib/practice/chordScaleQuestion';
	import { ensureAudioReady, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import PianoKeyboard, { type GhostTone } from './PianoKeyboard.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Practice hub render component: the CHORD-SCALE family (design doc
	 * `.planning/design/improvisation.md` §5.4, `ml-modes-practice` scout
	 * report §4.2) — given a chord symbol, tap the one key that is NOT in the
	 * scale that fits it.
	 *
	 * SYNTHETIC family (§4.3): no FactKind, no Dexie schema. This drills the
	 * SAME `improvGuideFor` engine every reference surface reads (the Lookup
	 * board, the comping loop's SCALE overlay, `/learn`'s chord-tones-vs-
	 * scale-tones concept lesson), so none of them can ever disagree with what
	 * this drill grades. No mode-naming question exists here or anywhere: the
	 * mode name is never asked for, only shown as a label after the reveal,
	 * exactly as chordScale.ts's own doc comment states.
	 *
	 * Mirrors `PracticeDegreeDrill`'s "degree-to-note" shape: one tap is the
	 * whole answer, graded by pitch class via `gradeChordScaleTap` (never a
	 * letter string), then a reveal. The chord's own notes are shown as the
	 * anchor (via `PianoKeyboard`'s `notes` prop, the app's standard chord
	 * highlight) BEFORE the tap — the scale itself is never pre-drawn, or the
	 * question would answer itself. After the tap, the reveal ghost-hatches
	 * the whole offered scale with the exact visual grammar `ImproviseGuide`
	 * already uses ('careful' rings vermilion, 'outside' dashes the outline).
	 */
	interface Props {
		/** The chord symbol this item drills, e.g. "Dm7", from the queue item's synthetic id. */
		symbol: string;
		/** Fired exactly once, at the user's Next tap after the reveal. */
		onComplete: (correct: boolean) => void;
	}

	let { symbol, onComplete }: Props = $props();

	/**
	 * One-shot init read (mirrors PracticeDegreeDrill/PracticeChordDrill's own
	 * untrack precedent): a fresh component instance per queue item, so the
	 * question never redraws mid-item.
	 */
	const question: ChordScaleQuestion = untrack(() => generateChordScaleQuestion(symbol));
	const answerable = isChordScaleQuestionAnswerable(question);

	let answered = $state(false);
	let verdict = $state<ChordScaleVerdict>('wrong');
	let tappedLetter = $state<string | null>(null);

	const correct = $derived(verdict === 'correct');

	/** The scale-fitting keyboard reveal: every note NOT a chord tone, ghost-hatched with its own tension label, exactly ImproviseGuide's board. */
	const reveal = $derived.by((): { letter: string; octave: number; marker: string; tone: GhostTone }[] => {
		if (question.scale === null) return [];
		return question.scale.notes
			.filter((note) => note.kind !== 'chord-tone')
			.map((note) => ({
				letter: note.letter,
				octave: 4,
				marker: note.label,
				tone: (note.kind === 'careful' ? 'careful' : 'plain') as GhostTone
			}));
	});

	/** Sounds the tapped note once, on every answer, correct or not. Best-effort: audio never gates the reveal. */
	function playTapped(letter: string): void {
		try {
			void ensureAudioReady();
			playNote(toPitch(letter, 4));
		} catch {
			// Audio is an enhancement here, exactly as in PracticeDegreeDrill's reveal.
		}
	}

	/** The first tap is the whole answer, graded by pitch class via verdictForLetter. */
	function tapKey(letter: string): void {
		if (answered) return;
		tappedLetter = letter;
		verdict = gradeChordScaleTap(question, letter);
		answered = true;
		playTapped(letter);
	}

	function handleNext(): void {
		onComplete(correct);
	}
</script>

<div data-testid="chord-scale-drill">
	{#if !answerable}
		<!--
			Unreachable from the queue: the host only draws candidate symbols via
			chordScaleSymbols(), which filters to exactly the symbols this
			component can render. Kept total, and reporting CORRECT so an app
			defect can never mark the user wrong (mirrors PracticeDegreeDrill's
			own unrenderable branch).
		-->
		<p class="text-body" data-testid="chord-scale-unrenderable">{t('recall.unrenderable.message')}</p>
		<div class="mt-4">
			<Button type="button" variant="ghost" onclick={() => onComplete(true)}>
				{t('recall.cta.skip')}
			</Button>
		</div>
	{:else}
		<p class="text-body" data-testid="chord-scale-prompt">{t('scales.chordScaleDrill.prompt')}</p>

		<div class="mt-4">
			<PianoKeyboard
				notes={answered ? [] : question.chord.notes}
				octaves={1}
				interactive={!answered}
				selected={answered ? undefined : new Set()}
				onToggle={answered ? undefined : tapKey}
				wrongLetters={answered
					? correct
						? new Set()
						: new Set(tappedLetter === null ? [] : [tappedLetter])
					: undefined}
				ghostKeys={answered ? reveal : []}
				inspectable={answered}
			/>
		</div>

		{#if answered}
			<div class="stamp mt-4" data-testid="chord-scale-drill-feedback">
				<p class="text-body font-bold" data-testid="chord-scale-verdict-line">
					{#if verdict === 'correct'}
						{t('scales.chordScaleDrill.verdictCorrect')}
					{:else if verdict === 'close'}
						{t('scales.chordScaleDrill.verdictClose')}
					{:else}
						{t('scales.chordScaleDrill.verdictWrong')}
					{/if}
				</p>
				<p class="text-label mt-2 font-mono uppercase" data-testid="chord-scale-scale-label">
					{t('scales.chordScaleDrill.scaleLabelPrefix')}
					{question.scale?.tonic}
					{t(`scales.chordScaleDrill.scaleName.${question.scale?.id}` as MessageKey)}
				</p>
			</div>
		{/if}

		{#if answered}
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={handleNext}>
					{t('drills.button.next')}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
