<script lang="ts">
	import { onMount } from 'svelte';
	import {
		introduceNewCards,
		getDueCards,
		getAllCards,
		recordGrade,
		type CardRecord
	} from '$lib/srs/deck';
	import { previewGrades, Rating } from '$lib/srs/scheduler';
	import { factById } from '$lib/srs/facts';
	import {
		buildQueue,
		advanceQueue,
		isSessionComplete,
		sessionRemaining,
		formatDayInterval,
		type QueueItem
	} from '$lib/srs/session';
	import { spellChord } from '$lib/theory/chord';
	import { intervalFromShort, transposeFrom } from '$lib/theory/interval';
	import { majorScaleNotes } from '$lib/theory/scale';
	import { formulaFor } from '$lib/lookup/chordPresentation';
	import { playChord, playNote } from '$lib/audio/audio';
	import { toPitch } from '$lib/audio/voicing';
	import ChordGlyph from './ChordGlyph.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import NoteLabel from './NoteLabel.svelte';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import Button from './Button.svelte';

	/**
	 * Review-mode reveal-then-grade session (MEM-01/MEM-02): the first
	 * user-facing surface for the whole memorization engine (11-01..11-04).
	 * Loads today's due-today queue (introduceNewCards then getDueCards, never
	 * the full 192-fact catalog), reveals one card at a time per its
	 * factKind's prompt/reveal template, then grades it Again/Hard/Good/Easy
	 * with live day-interval-labeled buttons (previewGrades + formatDayInterval,
	 * D-04). Tapping a grade both commits the FSRS rating (recordGrade) and
	 * advances the in-memory session queue (advanceQueue) in one action - no
	 * separate Next step. Self-contained: loads its own data on mount
	 * (mirrors Progress's onMount(() => void load()) pattern). Accepts an
	 * optional onViewMap callback (11-06): when provided, the completion
	 * card additionally renders a "View Recall Map" secondary CTA. Omitting
	 * the prop leaves the completion card's render byte-identical to 11-05.
	 */

	interface Props {
		onViewMap?: () => void;
	}

	let { onViewMap }: Props = $props();

	type PageState =
		| 'loading'
		| 'empty-no-deck'
		| 'empty-none-due'
		| 'reviewing'
		| 'complete'
		| 'error';

	let pageState = $state<PageState>('loading');
	let queue = $state<QueueItem[]>([]);
	let cardsByKey = $state(new Map<string, CardRecord>());
	let revealed = $state(false);
	let reviewedCount = $state(0);

	/** Compound (factId, mode) key, matching deck.ts's own [factId+mode] convention. */
	function cardKey(factId: string, mode: string): string {
		return `${factId}|${mode}`;
	}

	async function load(): Promise<void> {
		pageState = 'loading';
		try {
			await introduceNewCards();
			const due = await getDueCards();
			if (due.length === 0) {
				const all = await getAllCards();
				pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
				return;
			}
			cardsByKey = new Map(due.map((card) => [cardKey(card.factId, card.mode), card]));
			queue = buildQueue(due.map((card) => ({ factId: card.factId, mode: card.mode })));
			revealed = false;
			reviewedCount = 0;
			pageState = 'reviewing';
		} catch {
			pageState = 'error';
		}
	}

	onMount(() => {
		void load();
	});

	const currentItem = $derived(queue[0]);
	const currentCard = $derived(
		currentItem ? cardsByKey.get(cardKey(currentItem.factId, currentItem.mode)) : undefined
	);
	const currentFact = $derived(currentItem ? factById(currentItem.factId) : undefined);
	const previews = $derived(currentCard ? previewGrades(currentCard, new Date()) : []);
	const remaining = $derived(sessionRemaining(queue));

	/** The live day-interval tag for one of the four grade buttons (D-04). */
	function intervalTag(rating: Rating): string {
		const preview = previews.find((entry) => entry.rating === rating);
		return preview ? formatDayInterval(preview.days) : '';
	}

	/**
	 * Reveals the current card's answer. Optionally plays the revealed fact's
	 * sound (best-effort enhancement, per the UI-SPEC's implementation notes) -
	 * an audio failure never affects `revealed`, which is already set above the
	 * try block.
	 */
	function handleReveal(): void {
		revealed = true;
		if (!currentFact) return;
		try {
			if (currentFact.factKind === 'chord-formula') {
				const chord = spellChord(currentFact.symbol);
				playChord(chord.notes.map((note) => note.letter));
			} else if (currentFact.factKind === 'interval-size') {
				const targetLetter = transposeFrom('C', currentFact.short);
				if (targetLetter) playNote(toPitch(targetLetter, 4));
			} else if (currentFact.factKind === 'scale-degree') {
				const degreeNote = majorScaleNotes(currentFact.tonic)[currentFact.degree - 1];
				if (degreeNote) playNote(toPitch(degreeNote.letter, 4));
			}
		} catch {
			// Audio is a best-effort enhancement; never let it break the reveal.
		}
	}

	/**
	 * Commits a grade and advances the queue in the same action (no separate
	 * Next tap, per the UI-SPEC's "tapping a choice IS the complete answer"
	 * precedent). Again-graded cards are re-enqueued (D-10): the register never
	 * decrements below its pre-re-enqueue value on an Again grade.
	 */
	async function handleGrade(rating: Rating): Promise<void> {
		if (!currentCard) return;
		const updated = await recordGrade(currentCard, rating, new Date());
		cardsByKey.set(cardKey(updated.factId, updated.mode), updated);
		queue = advanceQueue(queue, rating);
		revealed = false;
		reviewedCount += 1;
		if (isSessionComplete(queue)) pageState = 'complete';
	}

	const GRADES: { rating: Rating; label: string }[] = [
		{ rating: Rating.Again, label: 'Again' },
		{ rating: Rating.Hard, label: 'Hard' },
		{ rating: Rating.Good, label: 'Good' },
		{ rating: Rating.Easy, label: 'Easy' }
	];

	/** Inline style override for the Again grade button (D-color rule: reuses --color-wrong verbatim, no new token). */
	function gradeButtonStyle(rating: Rating): string | undefined {
		return rating === Rating.Again
			? 'background-color: var(--color-wrong); color: var(--color-ink);'
			: undefined;
	}
</script>

{#if pageState === 'loading'}
	<p class="text-label font-mono uppercase" data-testid="recall-loading">
		COUNTING TODAY'S CARDS...
	</p>
{:else if pageState === 'empty-no-deck'}
	<div data-testid="recall-empty-no-deck">
		<p class="text-heading font-bold">Nothing to recall yet.</p>
		<p class="text-body mt-4">
			Play a few Drills first. Recall cards show up here as you meet new chords, intervals, and
			scale degrees.
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">Practice Now</Button>
		</div>
	</div>
{:else if pageState === 'empty-none-due'}
	<div data-testid="recall-empty-none-due">
		<p class="text-heading font-bold">Nothing due today.</p>
		<p class="text-body mt-4">
			Every card's tucked in for later. Come back tomorrow, or warm up with free practice.
		</p>
		<div class="mt-6">
			<Button variant="ghost" href="/drills">Practice Now</Button>
		</div>
	</div>
{:else if pageState === 'error'}
	<div data-testid="recall-error">
		<p class="text-body">
			Couldn't open the practice ledger. Reload the page, mon ami. If it keeps happening, your
			browser's storage might be full or blocked.
		</p>
		<div class="mt-6">
			<Button type="button" variant="ghost" onclick={load}>Try Again</Button>
		</div>
	</div>
{:else if pageState === 'complete'}
	<div data-testid="recall-complete">
		<p class="text-heading font-bold">Voila. That's today's stack.</p>
		<p class="text-label mt-2 font-mono uppercase" data-testid="recall-reviewed-count">
			{reviewedCount} REVIEWED TODAY
		</p>
		<div class="mt-6">
			<Button variant="primary" href="/drills">Practice Now</Button>
			{#if onViewMap}
				<Button type="button" variant="ghost" onclick={onViewMap}>View Recall Map</Button>
			{/if}
		</div>
	</div>
{:else if pageState === 'reviewing' && currentFact}
	<p class="text-label font-mono uppercase" aria-live="polite" data-testid="recall-register">
		{remaining} LEFT TODAY
	</p>

	<div class="mt-4" data-testid="recall-prompt">
		{#if currentFact.factKind === 'chord-formula'}
			{@const chord = spellChord(currentFact.symbol)}
			<div class="flex items-start gap-4">
				<ChordGlyph root={chord.root} quality={chord.symbol.slice(chord.root.length)} />
			</div>
			<p class="text-body mt-4">What's the formula?</p>
		{:else if currentFact.factKind === 'interval-size'}
			{@const targetLetter = transposeFrom('C', currentFact.short)}
			<p class="text-heading font-serif font-bold">C to {targetLetter}</p>
			<p class="text-body mt-4">What's the interval?</p>
		{:else if currentFact.factKind === 'scale-degree'}
			<p class="text-heading font-bold">
				Degree {currentFact.degree} of {currentFact.tonic} major
			</p>
			<p class="text-body mt-4">Which note?</p>
		{/if}
	</div>

	{#if !revealed}
		<div class="mt-6">
			<Button type="button" variant="primary" onclick={handleReveal}>Show Answer</Button>
		</div>
	{:else}
		<div class="stamp mt-6" data-testid="recall-reveal">
			{#if currentFact.factKind === 'chord-formula'}
				{@const chord = spellChord(currentFact.symbol)}
				<p class="text-body">Here's the formula:</p>
				<div class="mt-4 flex flex-wrap gap-4">
					{#each formulaFor(chord) as entry (entry.role + entry.letter)}
						<div class="flex flex-col items-center gap-1">
							<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
							<span class="text-label font-mono">{entry.letter}</span>
							<span class="text-label font-mono">{entry.solfege}</span>
						</div>
					{/each}
				</div>
				<div class="mt-4">
					<PianoKeyboard notes={chord.notes} />
				</div>
			{:else if currentFact.factKind === 'interval-size'}
				{@const info = intervalFromShort(currentFact.short)}
				<p class="text-body">Here's the interval:</p>
				<div class="mt-4">
					<IntervalChip role={info.role} label={info.short} longName={info.longFr} />
				</div>
			{:else if currentFact.factKind === 'scale-degree'}
				{@const degreeNote = majorScaleNotes(currentFact.tonic)[currentFact.degree - 1]}
				<p class="text-body">Here's the note:</p>
				{#if degreeNote}
					<div
						class="mt-4 inline-block border-2 p-2"
						style={`border-color: var(--color-ink); background-color: var(--color-${degreeNote.role}); color: var(--color-on-${degreeNote.role});`}
					>
						<NoteLabel letter={degreeNote.letter} solfege={degreeNote.solfege} highlighted />
					</div>
				{/if}
			{/if}
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="recall-grade-grid">
			{#each GRADES as grade (grade.rating)}
				<Button
					type="button"
					variant="ghost"
					style={gradeButtonStyle(grade.rating)}
					data-testid={`recall-grade-${grade.label.toLowerCase()}`}
					onclick={() => handleGrade(grade.rating)}
				>
					<span class="flex flex-col items-center gap-1">
						<span class="text-heading font-bold">{grade.label}</span>
						<span class="text-label font-mono">{intervalTag(grade.rating)}</span>
					</span>
				</Button>
			{/each}
		</div>
	{/if}
{/if}

<style>
	/* @keyframes stamp-in lives in app.css (shared with Drills/PianoKeyboard's
	   feedback-mode reveal beat); this local binding is what actually fires it
	   here, matching the per-consumer convention every other reveal surface
	   follows. */
	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
