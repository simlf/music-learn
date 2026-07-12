<script lang="ts">
	import { Interval } from 'tonal';
	import { spellChord } from '$lib/theory/chord';
	import { randomChord } from '$lib/theory/randomChord';
	import { pickHint } from '$lib/copy/hints';
	import { playChord } from '$lib/audio/playChord';
	import type { ChordResult, IntervalRole } from '$lib/theory/types';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import Button from '$lib/components/Button.svelte';

	/** Starter chords for the empty state (D-09): zero-friction first success. */
	const STARTER_CHORDS = ['Cm7', 'Fmaj7', 'G7'];

	let symbol = $state('');
	let result = $state<ChordResult | null>(null);
	let hint = $state('');

	interface FormulaEntry {
		role: IntervalRole;
		label: string;
		letter: string;
		solfege: string;
	}

	/**
	 * Interval-formula readout: root shown as "R", other tones as quality-first
	 * labels ("m3", "P5", "m7") derived from tonal's Interval.distance between
	 * the chord's root and each spelled note. Kept local to the page - a pure
	 * presentation concern, not a theory-engine responsibility (Plan 02 owns
	 * ChordResult's contract).
	 */
	function formulaFor(chord: ChordResult): FormulaEntry[] {
		const rootAscii = toAsciiAccidentals(chord.root);
		return chord.notes.map((note) => {
			if (note.role === 'root') {
				return { role: note.role, label: 'R', letter: note.letter, solfege: note.solfege };
			}
			const raw = Interval.distance(rootAscii, toAsciiAccidentals(note.letter));
			const match = raw.match(/^(\d+)([A-Za-z]+)$/);
			const label = match ? `${match[2]}${match[1]}` : raw;
			return { role: note.role, label, letter: note.letter, solfege: note.solfege };
		});
	}

	/** tonal's Interval.distance only understands ASCII accidentals (#/b), not display glyphs (♯/♭). */
	function toAsciiAccidentals(letter: string): string {
		return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
	}

	function showChord(input: string) {
		const spelled = spellChord(input);
		if (spelled.recognized) {
			// Non-blocking success: replace the rendered result and clear any hint.
			result = spelled;
			hint = '';
		} else {
			// Non-blocking error (D-08): keep the previously rendered chord visible,
			// only surface a rotating hint in the error bar.
			hint = pickHint();
		}
	}

	function showChordFromSymbol(input: string) {
		symbol = input;
		showChord(input);
	}

	function surpriseMe() {
		showChordFromSymbol(randomChord());
	}

	/** Plays the currently rendered chord's notes on a plain synth (D-11). */
	function hearIt() {
		if (!result) return;
		void playChord(result.notes.map((note) => note.letter));
	}

	/**
	 * Alias-equivalence line: tonal's ChordResult.aliases are quality suffixes
	 * only (e.g. "m7", "min7", "-7"), not full symbols - so each is prefixed
	 * with the chord's root here. Includes the resolved symbol itself first,
	 * deduplicated, to always read as "Cm7 = C-7 = Cmin7" regardless of which
	 * alias the user typed.
	 */
	function aliasLine(chord: ChordResult): string {
		const forms = [chord.symbol, ...chord.aliases.map((alias) => chord.root + alias)];
		return [...new Set(forms)].join(' = ');
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		showChord(symbol);
	}
</script>

<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading font-bold uppercase tracking-tight">Music Learn</h1>
	<h2 class="text-heading mt-2 font-bold">Chord showcase</h2>

	<form class="mt-8 flex items-center gap-2" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={symbol}
			placeholder="Type a chord: Cm7, F♯ø7, B♭maj7..."
			class="border-ink bg-paper-bright border-2 p-2"
		/>
		<Button type="submit">Show chord</Button>
		<Button type="button" variant="ghost" onclick={surpriseMe}>Surprise me</Button>
	</form>

	{#if hint}
		<p class="bg-ink text-mustard mt-4 p-3 font-mono text-label uppercase" data-testid="error-bar">
			{hint}
		</p>
	{/if}

	{#if !result}
		<div class="mt-8">
			<p class="text-heading font-bold">No chord yet</p>
			<p class="text-muted mt-2">
				Type a symbol like Cm7 and press Show chord to see its notes in ink and color.
			</p>
			<div class="mt-4 flex gap-2">
				{#each STARTER_CHORDS as starter (starter)}
					<Button
						type="button"
						variant="ghost"
						data-testid="starter-chord"
						onclick={() => showChordFromSymbol(starter)}
					>
						{starter}
					</Button>
				{/each}
			</div>
		</div>
	{/if}

	{#if result?.recognized}
		<div class="stamp mt-8" data-testid="chord-result">
			<div class="flex items-start gap-4">
				<ChordGlyph root={result.root} quality={result.symbol.slice(result.root.length)} />
				<Button type="button" variant="ghost" onclick={hearIt}>Hear it</Button>
			</div>

			{#if result.aliases.length > 0}
				<p class="text-label text-muted mt-2 font-mono" data-testid="alias-line">
					{aliasLine(result)}
				</p>
			{/if}

			<div class="mt-6">
				<PianoKeyboard notes={result.notes} />
			</div>

			<div class="mt-6 flex gap-4" data-testid="interval-formula">
				{#each formulaFor(result) as entry (entry.role + entry.letter)}
					<div class="flex flex-col items-center gap-1">
						<IntervalChip role={entry.role} label={entry.label} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</main>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	@keyframes stamp-in {
		0% {
			transform: scale(0.96);
			opacity: 0;
		}
		60% {
			transform: scale(1.02);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
</style>
