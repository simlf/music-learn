<script lang="ts">
	import type { ChordResult, IntervalRole } from '$lib/theory/types';
	import {
		improvGuideFor,
		type ChordScaleOption,
		type ChordScaleId,
		type ImprovNote
	} from '$lib/theory/chordScale';
	import { ensureAudioReady, playNotesOverChord, stopChordDemo } from '$lib/audio/audio';
	import PianoKeyboard, { type InspectPayload } from './PianoKeyboard.svelte';
	import InspectRegister from './InspectRegister.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * The Lookup result card's improvisation guide (design doc
	 * `.planning/design/improvisation.md`, shape 3): "what can I play over
	 * this?", answered per symbol as reference, never as a drill. Follows
	 * WhyTheseNotes' expandable-panel convention (component owns only its
	 * open/closed and scale-choice state; all derivation lives in the pure
	 * theory layer, $lib/theory/chordScale).
	 *
	 * Keyboard rendering stays inside the app's fixed visual vocabulary: the
	 * chord tones keep their interval-role fills and badges (the same read as
	 * the result keyboard above), the rest of the recommended scale renders
	 * as ghost keys (hatch = allowed, not required), and a careful note's
	 * ghost marker is parenthesized, neutral ink only. No new color, per the
	 * app-wide four-interval-colors rule.
	 *
	 * Renders nothing at all for a chord the guide has no honest answer for
	 * (augmented, minor/major seventh...): no panel beats a wrong panel.
	 */
	interface Props {
		/** The resolved chord being decoded above this panel. */
		chord: ChordResult;
	}

	let { chord }: Props = $props();

	const guide = $derived(improvGuideFor(chord));

	let open = $state(false);
	let conceptsOpen = $state(false);

	/**
	 * The picked scale's id, kept across lookups on purpose: a player
	 * comparing m7 chords with the pentatonic selected keeps the pentatonic.
	 * When the new chord's guide does not offer it, the family default
	 * (first option) takes over.
	 */
	let selectedId = $state<ChordScaleId | null>(null);

	const activeScale = $derived.by<ChordScaleOption | null>(() => {
		if (!guide || guide.scales.length === 0) return null;
		return guide.scales.find((scale) => scale.id === selectedId) ?? guide.scales[0];
	});

	/** The latest keyboard inspect tap; cleared per chord and per scale pick. */
	let inspectPayload = $state<InspectPayload | null>(null);
	let lastSymbol = $state('');
	$effect(() => {
		if (chord.symbol !== lastSymbol) {
			lastSymbol = chord.symbol;
			inspectPayload = null;
			// A demo of the previous chord must not keep sounding under a new one.
			stopChordDemo();
		}
	});

	/** Nothing this panel started may outlive it (an A/B demo runs for seconds). */
	$effect(() => () => stopChordDemo());

	function pickScale(id: ChordScaleId) {
		selectedId = id;
		inspectPayload = null;
		stopChordDemo();
	}

	/**
	 * Ghost entries for the active scale's non-chord tones, at both keyboard
	 * octaves so the hatch reads as a pitch class wherever the board spans.
	 * A careful note's marker is parenthesized: the music-notation cue for
	 * "passing", taught by the keyboard legend line below.
	 */
	const ghosts = $derived.by(() => {
		if (!activeScale) return [];
		return activeScale.notes
			.filter((note) => note.kind !== 'chord-tone')
			.flatMap((note) =>
				[4, 5].map((octave) => ({
					letter: note.letter,
					octave,
					marker: note.kind === 'careful' ? `(${note.label})` : note.label
				}))
			);
	});

	/**
	 * The two explained groups, deliberately kept apart rather than shown as
	 * one list with a tag: a greyed note read as "forbidden" was the whole
	 * misunderstanding this panel exists to fix, so "colors to add" and "handle
	 * with care" get their own heading, their own lede, and their own listen
	 * affordance.
	 */
	const colorNotes = $derived(
		activeScale ? activeScale.notes.filter((note) => note.kind === 'color') : []
	);
	const carefulNotes = $derived(
		activeScale ? activeScale.notes.filter((note) => note.kind === 'careful') : []
	);

	/** Per-tension why lines; labels missing here fall back to the generic color line. */
	const WHY_BY_LABEL: Record<string, MessageKey> = {
		'9': 'improvise.note.why.9',
		'11': 'improvise.note.why.11',
		'♯11': 'improvise.note.why.sharp11',
		'13': 'improvise.note.why.13',
		'♭13': 'improvise.note.why.flat13',
		'7': 'improvise.note.why.seventh',
		'♭7': 'improvise.note.why.seventh',
		'3': 'improvise.note.why.3'
	};

	function whyFor(note: ImprovNote): string {
		return t(WHY_BY_LABEL[note.label] ?? 'improvise.note.why.color');
	}

	/**
	 * A careful note's explanation is written per COLLIDING CHORD TONE, never
	 * once for all of them: "F rubs" teaches nothing, "F is a half step above
	 * E, the 3rd that makes this chord major" is the actual answer. The engine
	 * names the victim (letter, interval shorthand and degree class); this map
	 * only picks which sentence that degree deserves.
	 *
	 * Three degrees cover every case an offered scale can actually produce: no
	 * recommended scale holds the note a half step above a 7th (that note is
	 * the root, which is a chord tone) nor above a minor 3rd, so the rest (the
	 * natural 9 rubbing a chord's own ♭9, say) take the interval-naming
	 * fallback rather than a sentence that would never be read.
	 */
	const CAREFUL_WHY_BY_ROLE: Partial<Record<IntervalRole, MessageKey>> = {
		root: 'improvise.note.careful.root',
		third: 'improvise.note.careful.third',
		fifth: 'improvise.note.careful.fifth'
	};

	function carefulWhy(note: ImprovNote): string {
		const key =
			(note.clashesWithRole && CAREFUL_WHY_BY_ROLE[note.clashesWithRole]) ??
			'improvise.note.careful.other';
		return t(key)
			.replaceAll('{NOTE}', note.letter)
			.replaceAll('{TONE}', note.clashesWith ?? '')
			.replaceAll('{LABEL}', note.clashesWithLabel ?? '');
	}

	/**
	 * The "same note, other chord" line, only where the engine can honestly
	 * name a context: the 4 against a major 3rd is the classic rub over a major
	 * seventh chord and the expected sus/blues sound over the dominant, so the
	 * wording splits on which of the two this chord is.
	 */
	function carefulFineOn(note: ImprovNote): string | null {
		if (note.fineOn !== 'dominant-blues') return null;
		const key =
			guide?.family === 'dominant'
				? 'improvise.note.careful.fineOnBlues'
				: 'improvise.note.careful.fineOnDominant';
		return t(key).replaceAll('{NOTE}', note.letter).replaceAll('{ROOT}', chord.root);
	}

	/** The chord as plain letters, the shape the audio engine's chord calls take. */
	const chordLetters = $derived(chord.notes.map((note) => note.letter));

	/**
	 * Hearing is the other half of the answer: the left hand holds the chord
	 * while these notes sound over it, through the app's one audio engine. One
	 * melody letter is a plain listen; two are the A/B (the chord tone first,
	 * then the half step above it), which is what makes a rub obvious without
	 * any theory at all. Each call cancels the previous demo, so clicking
	 * around never stacks chords.
	 */
	function hearOverChord(...melodies: string[]) {
		void ensureAudioReady();
		playNotesOverChord(chord.root, chordLetters, melodies);
	}

	/** "A dorian" / "A dorien": tonic verbatim (symbol immunity), mode name localized. */
	function scaleLabel(scale: ChordScaleOption): string {
		return `${scale.tonic} ${t(`improvise.scale.name.${scale.id}` as MessageKey)}`;
	}

	function scaleColorLine(scale: ChordScaleOption): string {
		return t(`improvise.scale.color.${scale.id}` as MessageKey);
	}

	/** The blue-note paragraph, specific to this chord's own ♭7 when the family has one. */
	const blueBody = $derived(
		guide?.blueNote
			? t('improvise.concept.blue.specific')
					.replaceAll('{NOTE}', guide.blueNote)
					.replaceAll('{ROOT}', chord.root)
			: t('improvise.concept.blue.generic')
	);

	/**
	 * The blue note's own row, in the panel body rather than only in the
	 * concepts fold: "why does B♭ sound good over C" is a question asked in
	 * front of the keyboard, and the answer is that the ♭7 is a whole step
	 * BELOW the root, so unlike an avoid note it has nothing to rub against.
	 * When the symbol holds a chord tone a half step from it the row says so
	 * instead: over Cmaj7 the B♭ and the B collide, over C6 the B♭ and the A.
	 */
	const blueWhy = $derived(
		guide?.blueNote
			? t(guide.blueNoteRubsWith ? 'improvise.blue.whyHeld' : 'improvise.blue.why')
					.replaceAll('{NOTE}', guide.blueNote)
					.replaceAll('{ROOT}', chord.root)
					.replaceAll('{TONE}', guide.blueNoteRubsWith ?? '')
			: ''
	);

	/**
	 * The keyboard already sounds the tapped key itself (PianoKeyboard's
	 * inspect mode); this adds the chord underneath it, so a tap answers "how
	 * does this note sit on this chord" rather than "what pitch is this key".
	 * The melody list stays empty on purpose: passing the tapped letter here
	 * too would play it twice.
	 */
	function handleInspect(payload: InspectPayload) {
		inspectPayload = payload;
		playNotesOverChord(chord.root, chordLetters, []);
	}
</script>

{#if guide}
	<div class="improvise-guide" data-testid="improvise-guide">
		<button
			type="button"
			class="improv-toggle"
			data-testid="improvise-toggle"
			onclick={() => (open = !open)}
		>
			{t('improvise.toggle')}
		</button>

		{#if open}
			<div class="improv-panel stamp" data-testid="improvise-panel">
				<p class="intro">{t('improvise.intro')}</p>

				<p class="section-heading">{t('improvise.chordTones.heading')}</p>
				<div class="tone-chips">
					{#each chord.notes as note (note.role + note.letter)}
						<span
							class="tone-chip"
							style={`background-color: var(--color-${note.role}); color: var(--color-on-${note.role});`}
							>{note.letter}</span
						>
					{/each}
				</div>
				<p class="why">{t('improvise.chordTones.why')}</p>

				{#if guide.scales.length > 0}
					<p class="section-heading">{t('improvise.scales.heading')}</p>
					<div
						class="scale-row"
						role="group"
						aria-label={t('improvise.aria.scaleGroup')}
						data-testid="improvise-scale-row"
					>
						{#each guide.scales as scale (scale.id)}
							<Button
								type="button"
								variant={scale.id === activeScale?.id ? 'primary' : 'ghost'}
								aria-pressed={scale.id === activeScale?.id}
								data-testid="improvise-scale-chip"
								onclick={() => pickScale(scale.id)}
							>
								{scaleLabel(scale)}
							</Button>
						{/each}
					</div>

					{#if activeScale}
						<p class="why" data-testid="improvise-scale-color">{scaleColorLine(activeScale)}</p>

						<div class="keyboard">
							<PianoKeyboard
								notes={chord.notes}
								inspectable
								onInspect={handleInspect}
								showIntervalBadges
								ghostKeys={ghosts}
							/>
						</div>
						<InspectRegister payload={inspectPayload} idleText={t('improvise.inspect.idle')} />
						<p class="legend">{t('improvise.keyboard.legend')}</p>

						{#if colorNotes.length > 0}
							<p class="section-heading">{t('improvise.colors.heading')}</p>
							<p class="why">{t('improvise.colors.lede')}</p>
							<ul class="note-list">
								{#each colorNotes as note (note.letter)}
									<li class="note-row" data-testid="improvise-note-row" data-kind="color">
										<span class="note-letter">{note.letter}</span>
										<span class="note-label">{note.label}</span>
										<span class="note-tag">{t('improvise.tag.color')}</span>
										<span class="note-why">{whyFor(note)}</span>
										<span class="note-listen">
											<Button
												type="button"
												variant="ghost"
												data-testid="improvise-listen-color"
												aria-label={t('improvise.listen.aria').replaceAll('{NOTE}', note.letter)}
												onclick={() => hearOverChord(note.letter)}
											>
												{t('improvise.listen.color')}
											</Button>
										</span>
									</li>
								{/each}
							</ul>
						{/if}

						{#if carefulNotes.length > 0}
							<p class="section-heading">{t('improvise.careful.heading')}</p>
							<p class="why" data-testid="improvise-careful-lede">{t('improvise.careful.lede')}</p>
							<p class="why">{t('improvise.careful.compareHint')}</p>
							<ul class="note-list">
								{#each carefulNotes as note (note.letter)}
									<li
										class="note-row note-row--careful"
										data-testid="improvise-note-row"
										data-kind="careful"
									>
										<span class="note-letter">{note.letter}</span>
										<span class="note-label">{note.label}</span>
										<span class="note-tag">{t('improvise.tag.careful')}</span>
										<span class="note-why" data-testid="improvise-careful-why"
											>{carefulWhy(note)}</span
										>
										<span class="note-why">{t('improvise.note.careful.nuance')}</span>
										{#if carefulFineOn(note)}
											<span class="note-why" data-testid="improvise-careful-fine-on"
												>{carefulFineOn(note)}</span
											>
										{/if}
										<span class="note-listen">
											<Button
												type="button"
												variant="ghost"
												data-testid="improvise-listen-careful"
												aria-label={t('improvise.listen.ariaCareful')
													.replaceAll('{NOTE}', note.letter)
													.replaceAll('{TONE}', note.clashesWith ?? '')}
												onclick={() => hearOverChord(note.clashesWith ?? note.letter, note.letter)}
											>
												{t('improvise.listen.careful')}
											</Button>
										</span>
									</li>
								{/each}
							</ul>
						{/if}

						{#if guide.blueNote}
							<p class="section-heading">{t('improvise.blue.heading')}</p>
							<ul class="note-list">
								<li class="note-row" data-testid="improvise-blue-row" data-kind="blue">
									<span class="note-letter">{guide.blueNote}</span>
									<span class="note-label">♭7</span>
									<span class="note-tag">{t('improvise.blue.tag')}</span>
									<span class="note-why">{blueWhy}</span>
									<span class="note-listen">
										<Button
											type="button"
											variant="ghost"
											data-testid="improvise-listen-blue"
											aria-label={t('improvise.listen.aria').replaceAll('{NOTE}', guide.blueNote)}
											onclick={() => hearOverChord(guide.blueNote ?? '')}
										>
											{t('improvise.listen.color')}
										</Button>
									</span>
								</li>
							</ul>
						{/if}

						<p class="legend">{t('improvise.legend')}</p>
					{/if}
				{:else}
					<p class="dim-caution" data-testid="improvise-dim-caution">
						{t('improvise.dim.caution')}
					</p>
				{/if}

				<button
					type="button"
					class="concepts-toggle"
					data-testid="improvise-concepts-toggle"
					onclick={() => (conceptsOpen = !conceptsOpen)}
				>
					{t('improvise.concepts.toggle')}
				</button>
				{#if conceptsOpen}
					<div class="concepts stamp" data-testid="improvise-concepts">
						<p class="concept-title">{t('improvise.concept.chordScale.title')}</p>
						<p class="concept-body">{t('improvise.concept.chordScale.body')}</p>
						<p class="concept-title">{t('improvise.concept.tension.title')}</p>
						<p class="concept-body">{t('improvise.concept.tension.body')}</p>
						<p class="concept-title">{t('improvise.concept.careful.title')}</p>
						<p class="concept-body">{t('improvise.concept.careful.body')}</p>
						<p class="concept-title">{t('improvise.concept.blue.title')}</p>
						<p class="concept-body" data-testid="improvise-blue-body">{blueBody}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* @keyframes stamp-in lives in app.css (shared reveal beat), reused verbatim. */
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	.improvise-guide {
		margin-top: var(--spacing-md);
	}

	/* Mirrors WhyTheseNotes' toggle: same expandable-reference affordance. */
	.improv-toggle,
	.concepts-toggle {
		display: block;
		width: 100%;
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		border: 2px solid var(--color-ink);
		background: none;
		padding: var(--spacing-sm);
		cursor: pointer;
		color: var(--color-ink);
		min-height: 44px;
		transition:
			background-color 150ms ease-out,
			color 150ms ease-out;
	}

	.improv-toggle:hover,
	.improv-toggle:focus-visible,
	.concepts-toggle:hover,
	.concepts-toggle:focus-visible {
		background-color: var(--color-ink);
		color: var(--color-paper);
	}

	.concepts-toggle {
		margin-top: var(--spacing-md);
	}

	.improv-panel {
		border-top: 2px dashed var(--color-ink);
		margin-top: var(--spacing-sm);
		padding-top: var(--spacing-sm);
		font-size: var(--text-body);
		line-height: 1.5;
	}

	.intro {
		margin: 0 0 var(--spacing-sm);
	}

	.section-heading {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		color: var(--color-muted);
		margin: var(--spacing-md) 0 var(--spacing-xs);
	}

	.tone-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.tone-chip {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		padding: 2px 8px;
		border: 1px solid var(--color-ink);
	}

	.why {
		color: var(--color-muted);
		margin: var(--spacing-xs) 0 0;
	}

	.scale-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.keyboard {
		margin-top: var(--spacing-md);
	}

	.legend {
		color: var(--color-muted);
		font-size: var(--text-label);
		margin: var(--spacing-xs) 0 0;
	}

	.note-list {
		list-style: none;
		margin: var(--spacing-md) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.note-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--spacing-sm);
		border-left: 3px solid var(--color-ink);
		padding-left: var(--spacing-sm);
	}

	/* Vermilion = the app's existing "pay attention" accent, never a 5th interval color. */
	.note-row--careful {
		border-left-color: var(--color-vermilion);
	}

	.note-letter {
		font-family: var(--font-mono);
		font-weight: 700;
		min-width: 2.2em;
	}

	.note-label {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
		min-width: 2.5em;
	}

	.note-tag {
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		color: var(--color-muted);
	}

	.note-row--careful .note-tag {
		color: var(--color-vermilion);
	}

	.note-why {
		flex: 1 1 100%;
		color: var(--color-muted);
	}

	/* Own line under the explanation: the row wraps on a phone either way. */
	.note-listen {
		flex: 1 1 100%;
		margin-top: var(--spacing-xs);
	}

	.dim-caution {
		margin: var(--spacing-sm) 0 0;
	}

	.concepts {
		border-top: 2px dashed var(--color-ink);
		margin-top: var(--spacing-sm);
		padding-top: var(--spacing-sm);
	}

	.concept-title {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		margin: var(--spacing-sm) 0 var(--spacing-xs);
	}

	.concept-body {
		margin: 0;
		color: var(--color-muted);
	}
</style>
