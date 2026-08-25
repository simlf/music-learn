<script lang="ts">
	import type { ChordResult, IntervalRole } from '$lib/theory/types';
	import {
		improvGuideFor,
		verdictForLetter,
		type ChordScaleOption,
		type ChordScaleId,
		type ImprovVerdict,
		type ImprovVerdictKind
	} from '$lib/theory/chordScale';
	import {
		ensureAudioReady,
		playNotesOverChord,
		soundEnabled,
		stopChordDemo
	} from '$lib/audio/audio';
	import PianoKeyboard, {
		type GhostTone,
		type InspectPayload
	} from './PianoKeyboard.svelte';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * The Lookup result card's improvisation guide (design doc
	 * `.planning/design/improvisation.md`, shape 3): "what can I play over
	 * this?", answered per symbol as reference, never as a drill.
	 *
	 * Phase 38 rebuild. The previous version printed every note's full
	 * explanation at once, which the owner read as a wall of text about
	 * something he wanted to HEAR, and flagged two notes on the keyboard with
	 * 8px parentheses he could not see. The pedagogy is unchanged (it still
	 * comes from `$lib/theory/chordScale`, PR #75's derivations intact); what
	 * changed is that it is now revealed by playing rather than by reading:
	 *
	 *   1. ONE primary action walks the scale over the held chord, lighting
	 *      each note on the board as it sounds. Ten seconds, no reading.
	 *   2. Tapping ANY key sounds it over the chord and fills ONE caption
	 *      slot with that note's verdict. Reading is on demand and tied to
	 *      what just sounded, instead of printed N times up front.
	 *   3. A careful note's caption rings the chord tone it rubs, so "a half
	 *      step above E" is visible as two neighbouring keys, and its listen
	 *      button plays that pair back to back.
	 *
	 * Audio is the single app engine (`$lib/audio/audio`), never a second
	 * path, and everything taught by ear has the caption as its visible
	 * equivalent.
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
	/** Whether the caption's long-form nuance is unfolded. Resets with the selection. */
	let detailOpen = $state(false);

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

	/** The note the caption is currently reading, or null before the first tap. */
	let verdict = $state<ImprovVerdict | null>(null);
	/** Index of the scale note the walk is sounding right now, or null when no walk runs. */
	let walkIndex = $state<number | null>(null);
	/** True from the walk's first attack until it ends or is cut. Drives the button's two faces. */
	let walking = $state(false);

	const soundOn = soundEnabled();

	/** Clears everything a previous chord or scale left behind, sound included. */
	function resetReading() {
		stopChordDemo();
		verdict = null;
		detailOpen = false;
		walkIndex = null;
		walking = false;
	}

	let lastSymbol = $state('');
	$effect(() => {
		if (chord.symbol !== lastSymbol) {
			lastSymbol = chord.symbol;
			resetReading();
		}
	});

	/** Nothing this panel started may outlive it (a walk runs for seconds). */
	$effect(() => () => stopChordDemo());

	function pickScale(id: ChordScaleId) {
		selectedId = id;
		resetReading();
	}

	/** The chord as plain letters, the shape the audio engine's chord calls take. */
	const chordLetters = $derived(chord.notes.map((note) => note.letter));

	/*
	 * ---- The board ----
	 *
	 * Three treatments, no fourth colour. Chord tones keep their interval-role
	 * fills and badges (the same read as the result keyboard above). Every
	 * other scale note is a ghost hatch carrying its tension label, and the
	 * ghost's TONE says how it is allowed: 'careful' paints the marker
	 * vermilion and bars the key's playing edge (the app's standing attention
	 * accent), 'outside' dashes the outline for the blue note, which is not in
	 * the scale at all and is exactly the note the owner asked about.
	 *
	 * ONE octave (Phase 38), where the two-octave default used to run. The
	 * board's `notes` are a root-position chord, so PianoKeyboard draws the
	 * chord tones in the first octave and leaves the second empty: hatching
	 * and ringing that empty octave repeated every marker with no chord tone
	 * beside it to relate them to, and put a vermilion clash ring on a blank
	 * white key, which is precisely the "two neighbouring keys fight" reading
	 * this panel exists to make obvious. One octave also doubles the key width,
	 * which is what makes a 10px marker and a 5px ring readable at all.
	 */
	const OCTAVES = [4] as const;

	const ghosts = $derived.by((): {
		letter: string;
		octave: number;
		marker: string;
		tone: GhostTone;
	}[] => {
		if (!activeScale) return [];
		const entries = activeScale.notes
			.filter((note) => note.kind !== 'chord-tone')
			.flatMap((note) =>
				OCTAVES.map((octave) => ({
					letter: note.letter,
					octave: octave as number,
					marker: note.label,
					tone: (note.kind === 'careful' ? 'careful' : 'plain') as GhostTone
				}))
			);
		// The blue note is the one note worth drawing that the scale never
		// offers, so it has to be added by hand rather than filtered in.
		if (guide?.blueNote) {
			entries.push(
				...OCTAVES.map((octave) => ({
					letter: guide.blueNote as string,
					octave: octave as number,
					marker: '♭7',
					tone: 'outside' as GhostTone
				}))
			);
		}
		return entries;
	});

	/**
	 * The rings: the note being read or sounded right now, plus, when that
	 * note rubs, the chord tone it rubs against. Two neighbouring keys ringed
	 * at once IS the sentence "one half step above E", drawn.
	 */
	const focusKeys = $derived.by((): { letter: string; octave: number; kind: 'focus' | 'clash' }[] => {
		const read = verdict;
		if (!read) return [];
		const keys = OCTAVES.map((octave) => ({
			letter: read.letter,
			octave: octave as number,
			kind: 'focus' as 'focus' | 'clash'
		}));
		const clashesWith = read.clashesWith;
		if (clashesWith) {
			keys.push(
				...OCTAVES.map((octave) => ({
					letter: clashesWith,
					octave: octave as number,
					kind: 'clash' as 'focus' | 'clash'
				}))
			);
		}
		return keys;
	});

	/*
	 * ---- The walk ----
	 *
	 * The primary action, and the answer to "what does this scale sound like
	 * over this chord": the chord is struck once and HELD (sustainChord, the
	 * left hand), the scale walks over the top a note at a time, and each note
	 * lights on the board and fills the caption as it sounds. The engine
	 * reports every step, so the eye and the ear stay in sync without this
	 * component running a timer of its own.
	 */
	const WALK_STEP = { holdSec: 0.62, gapSec: 0.04, sustainChord: true } as const;

	function toggleWalk() {
		if (walking) {
			stopChordDemo();
			return;
		}
		if (!activeScale || !soundOn) return;
		// Cut any previous demo BEFORE arming this one, so the old demo's own
		// end report cannot land after `walking` is set and switch it back off.
		stopChordDemo();
		void ensureAudioReady();
		walking = true;
		detailOpen = false;
		playNotesOverChord(
			chord.root,
			chordLetters,
			activeScale.notes.map((note) => note.letter),
			{
				...WALK_STEP,
				onStep: (index) => {
					if (index === null) {
						// Back to the invitation rather than parked on whichever
						// degree happened to be last: the walk taught by ear, and
						// the caption's job now is to offer the next tap.
						walking = false;
						walkIndex = null;
						verdict = null;
						return;
					}
					walkIndex = index;
					verdict = activeScale?.notes[index] ?? null;
				}
			}
		);
	}

	/*
	 * ---- Tap a key, hear the verdict ----
	 *
	 * Any key, not only the ones the guide offers: a player who tries a note
	 * the panel never mentioned still gets an honest, specific answer, which
	 * is the whole difference between a reference and an instrument. The
	 * keyboard sounds the tapped key itself (PianoKeyboard's inspect mode owns
	 * key-tap sound app-wide), so this adds only the chord underneath it;
	 * passing the letter to the demo as well would play it twice.
	 */
	function handleInspect(payload: InspectPayload) {
		if (!guide) return;
		stopChordDemo();
		detailOpen = false;
		verdict = verdictForLetter(chord, guide, activeScale, payload.letter);
		playNotesOverChord(chord.root, chordLetters, []);
	}

	/**
	 * Hearing is the other half of the answer: the left hand holds the chord
	 * while these notes sound over it, voiced ABOVE the shell so a rub is
	 * heard as the minor 9th the copy names. One melody letter is a plain
	 * listen; two are the A/B (the chord tone first, then the half step above
	 * it), which is what makes a rub obvious without any theory at all.
	 */
	function hearOverChord(...melodies: string[]) {
		void ensureAudioReady();
		playNotesOverChord(chord.root, chordLetters, melodies);
	}

	/*
	 * ---- The caption ----
	 *
	 * One slot, filled by whatever was last played or tapped. Every sentence
	 * below is PR #75's, unchanged in substance; what changed is that the
	 * player sees the one that applies to the note he just heard instead of
	 * all of them at once.
	 */

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

	/**
	 * A careful note's explanation is written per COLLIDING CHORD TONE, never
	 * once for all of them: "F rubs" teaches nothing, "F is a half step above
	 * E, the 3rd that makes this chord major" is the actual answer. The engine
	 * names the victim (letter, interval shorthand and degree class); this map
	 * only picks which sentence that degree deserves.
	 *
	 * Three degrees cover every case an offered scale can actually produce: no
	 * recommended scale holds the note a half step above a 7th (that note is
	 * the root, which is a chord tone) nor above a minor 3rd, so the rest take
	 * the interval-naming fallback rather than a sentence never read.
	 */
	const CAREFUL_WHY_BY_ROLE: Partial<Record<IntervalRole, MessageKey>> = {
		root: 'improvise.note.careful.root',
		third: 'improvise.note.careful.third',
		fifth: 'improvise.note.careful.fifth'
	};

	/** Fills {NOTE}/{TONE}/{LABEL}/{ROOT} from the read note and this chord. */
	function fill(key: MessageKey, note: ImprovVerdict): string {
		return t(key)
			.replaceAll('{NOTE}', note.letter)
			.replaceAll('{TONE}', note.clashesWith ?? '')
			.replaceAll('{LABEL}', note.clashesWithLabel ?? '')
			.replaceAll('{ROOT}', chord.root);
	}

	/** The caption's one-line-or-two headline explanation for the read note. */
	function captionWhy(note: ImprovVerdict): string {
		if (note.kind === 'chord-tone') return t('improvise.note.why.chordTone');
		if (note.kind === 'careful') {
			const key =
				(note.clashesWithRole && CAREFUL_WHY_BY_ROLE[note.clashesWithRole]) ??
				'improvise.note.careful.other';
			return fill(key, note);
		}
		if (note.kind === 'blue') {
			return fill(guide?.blueNoteRubsWith ? 'improvise.blue.whyHeld' : 'improvise.blue.why', note);
		}
		if (note.kind === 'outside') {
			return fill(note.clashesWith ? 'improvise.outside.clash' : 'improvise.outside.free', note);
		}
		return t(WHY_BY_LABEL[note.label] ?? 'improvise.note.why.color');
	}

	/** The tag chip's word, one per verdict kind. */
	const TAG_BY_KIND: Record<ImprovVerdictKind, MessageKey> = {
		'chord-tone': 'improvise.tag.chordTone',
		color: 'improvise.tag.color',
		careful: 'improvise.tag.careful',
		blue: 'improvise.tag.blue',
		outside: 'improvise.tag.outside'
	};

	/**
	 * The extra sentences, behind a fold. They matter, and they are the reason
	 * a careful note is not a forbidden note, but printing them for every note
	 * at once is what made the panel a wall of text. Only a careful note has
	 * any, so only a careful note shows the fold.
	 */
	function detailLines(note: ImprovVerdict): string[] {
		if (note.kind !== 'careful') return [];
		const lines = [t('improvise.note.careful.nuance')];
		if (note.fineOn === 'dominant-blues') {
			lines.push(
				fill(
					guide?.family === 'dominant'
						? 'improvise.note.careful.fineOnBlues'
						: 'improvise.note.careful.fineOnDominant',
					note
				)
			);
		}
		return lines;
	}

	/** "A dorian" / "A dorien": tonic verbatim (symbol immunity), mode name localized. */
	function scaleLabel(scale: ChordScaleOption): string {
		return `${scale.tonic} ${t(`improvise.scale.name.${scale.id}` as MessageKey)}`;
	}

	function scaleColorLine(scale: ChordScaleOption): string {
		return t(`improvise.scale.color.${scale.id}` as MessageKey);
	}

	/** The blue-note paragraph in the concepts fold, specific to this chord's own ♭7. */
	const blueBody = $derived(
		guide?.blueNote
			? t('improvise.concept.blue.specific')
					.replaceAll('{NOTE}', guide.blueNote)
					.replaceAll('{ROOT}', chord.root)
			: t('improvise.concept.blue.generic')
	);
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

				{#if guide.scales.length > 0 && activeScale}
					<div class="field">
						<p class="field-label">{t('improvise.scales.heading')}</p>
						<div
							class="chip-row"
							role="group"
							aria-label={t('improvise.aria.scaleGroup')}
							data-testid="improvise-scale-row"
						>
							{#each guide.scales as scale (scale.id)}
								<Button
									type="button"
									variant={scale.id === activeScale.id ? 'primary' : 'ghost'}
									aria-pressed={scale.id === activeScale.id}
									data-testid="improvise-scale-chip"
									onclick={() => pickScale(scale.id)}
								>
									{scaleLabel(scale)}
								</Button>
							{/each}
						</div>
						<p class="why" data-testid="improvise-scale-color">{scaleColorLine(activeScale)}</p>
					</div>

					{#if soundOn}
						<div class="walk">
							<Button
								type="button"
								variant="primary"
								data-testid="improvise-walk"
								aria-pressed={walking}
								onclick={toggleWalk}
							>
								{walking ? t('improvise.walk.stop') : t('improvise.walk.play')}
							</Button>
							<p class="why">{t('improvise.walk.hint')}</p>
						</div>
					{:else}
						<p class="why" data-testid="improvise-sound-off">{t('improvise.soundOff')}</p>
					{/if}

					<div class="keyboard">
						<PianoKeyboard
							octaves={1}
							notes={chord.notes}
							inspectable
							onInspect={handleInspect}
							showIntervalBadges
							ghostKeys={ghosts}
							{focusKeys}
						/>
					</div>


					<!-- ONE caption slot, filled by whatever was last tapped or
					     walked past. aria-live so the ear-taught part always has a
					     spoken equivalent: nothing here is audio-only. -->
					<!--
						While the walk runs, the caption shows the sounding note's
						NAME only: at roughly one note every two thirds of a second
						the explanations would flicker past unread, and a polite
						live region would queue seven announcements nobody asked
						for. The moving ring on the board carries the walk; the
						prose belongs to a deliberate tap. Every note the walk
						sounds stays individually reachable by tapping (or
						tabbing to) its key, so nothing here is audio-only.
					-->
					<div
						class="caption"
						class:caption--careful={verdict?.kind === 'careful'}
						class:caption--idle={verdict === null}
						data-testid="improvise-caption"
						data-kind={verdict?.kind ?? 'idle'}
						aria-live={walking ? 'off' : 'polite'}
					>
						{#if verdict}
							<p class="caption-head">
								<span class="caption-letter">{verdict.letter}</span>
								<span class="caption-label">{verdict.label}</span>
								<span class="caption-tag">{t(TAG_BY_KIND[verdict.kind])}</span>
								{#if walkIndex !== null}
									<span class="caption-step">{t('improvise.walk.playing')}</span>
								{/if}
							</p>
							{#if !walking}
								<p class="caption-why" data-testid="improvise-caption-why">{captionWhy(verdict)}</p>
							{/if}

							{#if !walking && detailLines(verdict).length > 0}
								{#if detailOpen}
									{#each detailLines(verdict) as line (line)}
										<p class="caption-why" data-testid="improvise-caption-detail">{line}</p>
									{/each}
								{:else}
									<button
										type="button"
										class="detail-toggle"
										data-testid="improvise-detail-toggle"
										onclick={() => (detailOpen = true)}
									>
										{t('improvise.more.toggle')}
									</button>
								{/if}
							{/if}

							{#if soundOn && !walking}
								<div class="caption-actions">
									{#if verdict.clashesWith}
										<Button
											type="button"
											variant="ghost"
											data-testid="improvise-listen-compare"
											aria-label={t('improvise.listen.ariaCareful')
												.replaceAll('{NOTE}', verdict.letter)
												.replaceAll('{TONE}', verdict.clashesWith)}
											onclick={() => hearOverChord(verdict!.clashesWith!, verdict!.letter)}
										>
											{t('improvise.listen.careful')}
										</Button>
									{:else}
										<Button
											type="button"
											variant="ghost"
											data-testid="improvise-listen-note"
											aria-label={t('improvise.listen.aria').replaceAll(
												'{NOTE}',
												verdict.letter
											)}
											onclick={() => hearOverChord(verdict!.letter)}
										>
											{t('improvise.listen.color')}
										</Button>
									{/if}
								</div>
							{/if}
						{:else}
							<p class="caption-why">{t('improvise.caption.idle')}</p>
						{/if}
					</div>

					<!-- The legend is the board's key, so it belongs against the
					     board and reads in the board's own order: fill, hatch,
					     vermilion bar, dashed outline. -->
					<ul class="legend" data-testid="improvise-legend">
						<li><span class="swatch swatch--tone" aria-hidden="true"></span>{t('improvise.legend.chordTone')}</li>
						<li><span class="swatch swatch--ghost" aria-hidden="true"></span>{t('improvise.legend.color')}</li>
						<li>
							<span class="swatch swatch--careful" aria-hidden="true"></span>{t(
								'improvise.legend.careful'
							)}
						</li>
						{#if guide.blueNote}
							<li>
								<span class="swatch swatch--outside" aria-hidden="true"></span>{t(
									'improvise.legend.outside'
								)}
							</li>
						{/if}
					</ul>
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
		margin: 0 0 var(--spacing-md);
	}

	/*
	 * The app's own labelled-control-group idiom, the one CompingLoop uses for
	 * FORME / TON / TEMPO: a mono uppercase field label over a row of Button
	 * chips, vermilion when picked. Reused verbatim rather than restyled, so
	 * this panel's one setting reads like every other setting in the app.
	 */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.field-label {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
		margin: 0;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.why {
		color: var(--color-muted);
		margin: 0;
	}

	/*
	 * Capped so the one-octave board reads as a keyboard diagram rather than
	 * as a stretched banner on a wide screen; below the cap it is fluid, so a
	 * phone still gets the full width.
	 */
	.keyboard {
		margin-top: var(--spacing-md);
		max-width: 560px;
	}

	/* A footnote to the board, last and smallest: it explains a picture the
	   player has already been using, so it must never lead. */
	.legend {
		list-style: none;
		margin: var(--spacing-md) 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs) var(--spacing-md);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	/* Each swatch is the board treatment it names, at 14px. */
	.swatch {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		border: 1px solid var(--color-ink);
		background: var(--color-paper-bright);
	}

	/* All four interval colours, since "chord tone" is never one colour. */
	.swatch--tone {
		background: linear-gradient(
			to right,
			var(--color-root) 0 25%,
			var(--color-third) 25% 50%,
			var(--color-fifth) 50% 75%,
			var(--color-seventh) 75% 100%
		);
	}

	.swatch--ghost {
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			color-mix(in srgb, var(--color-ink) 30%, transparent) 3px,
			color-mix(in srgb, var(--color-ink) 30%, transparent) 5px
		);
	}

	.swatch--careful {
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			color-mix(in srgb, var(--color-ink) 30%, transparent) 3px,
			color-mix(in srgb, var(--color-ink) 30%, transparent) 5px
		);
		box-shadow: inset 0 -4px 0 var(--color-vermilion);
	}

	.swatch--outside {
		border: 2px dashed var(--color-muted);
	}

	/*
	 * The one primary action, placed directly under the scale choice and ABOVE
	 * the board, so the first thing a player sees on opening the panel is a
	 * thing to press rather than a thing to read, and so the board and the
	 * caption it fills stay adjacent.
	 */
	.walk {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		align-items: flex-start;
		margin-top: var(--spacing-md);
	}

	/*
	 * The caption: the panel's only prose surface, and it holds exactly one
	 * note's worth. Reserves a floor height so filling it never jumps the page
	 * (the same discipline InspectRegister follows), and takes the ink rail of
	 * a lesson step, switched to vermilion when the note it reads is one that
	 * rubs.
	 */
	.caption {
		margin-top: var(--spacing-md);
		border-left: 8px solid var(--color-ink);
		background: var(--color-paper-bright);
		padding: var(--spacing-sm) var(--spacing-md);
		/* Reserve a head plus one line, so the common idle-to-read transition does
		   not shift the legend below it (InspectRegister's own discipline). A
		   longer read grows past any floor, which is why the floor is not taller. */
		min-height: 64px;
	}

	.caption--careful {
		border-left-color: var(--color-vermilion);
	}

	.caption--idle {
		border-left-color: var(--color-faint);
		background: none;
	}

	.caption-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--spacing-sm);
		margin: 0;
	}

	.caption-letter {
		font-family: var(--font-serif);
		font-size: var(--text-heading);
		font-weight: 700;
	}

	.caption-label {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.caption-tag {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		color: var(--color-muted);
	}

	.caption--careful .caption-tag {
		color: var(--color-vermilion);
	}

	.caption-step {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		color: var(--color-verdigris);
	}

	.caption-why {
		color: var(--color-muted);
		margin: var(--spacing-xs) 0 0;
	}

	.caption-actions {
		margin-top: var(--spacing-sm);
	}

	/* A quiet inline fold, never a second boxed button competing with the walk. */
	.detail-toggle {
		margin-top: var(--spacing-xs);
		padding: var(--spacing-xs) 0;
		border: none;
		background: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
		color: var(--color-ink);
		text-decoration: underline;
		min-height: 44px;
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
