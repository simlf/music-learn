<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mnemonicFor } from '$lib/copy/mnemonics';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import ChordExample from '$lib/components/ChordExample.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import NoteLabel from '$lib/components/NoteLabel.svelte';
	import Button from '$lib/components/Button.svelte';
	import InteractiveLesson from '$lib/components/InteractiveLesson.svelte';

	/**
	 * /theory (Track D): six short shape-first lessons decoding jazz chord
	 * symbols for a returning classical pianist. Every lesson shows the
	 * actual keys on a display keyboard (ChordExample), the KEEP-rated
	 * mnemonics from R3 appear as sidebars, and examples are tappable
	 * through the audio contract. Prerender-safe: pure client rendering,
	 * no load functions, no browser APIs at init.
	 */

	/** The five seventh shapes on C, with their triad + 7th construction captions. */
	const SEVENTH_SHAPES = [
		{ symbol: 'Cmaj7', suffix: 'maj7', caption: 'Major triad + 7. At rest.' },
		{ symbol: 'C7', suffix: '7', caption: 'Major triad + ♭7. Pushes.' },
		{ symbol: 'Cm7', suffix: 'm7', caption: 'Minor triad + ♭7. Travels.' },
		{ symbol: 'Cm7b5', suffix: 'm7b5', caption: 'Diminished triad + ♭7.' },
		{ symbol: 'Cdim7', suffix: 'dim7', caption: 'Diminished triad + ♭♭7.' }
	];

	/** The diatonic sevenths of C major: all white keys, four qualities, their day jobs. */
	const ANCHOR_CHORDS = [
		{ symbol: 'Cmaj7', caption: 'The I chord. Home.' },
		{ symbol: 'Dm7', caption: 'The ii. On its way.' },
		{ symbol: 'Em7', caption: 'The iii. Home in disguise.' },
		{ symbol: 'Fmaj7', caption: 'The IV. A step out the door.' },
		{ symbol: 'G7', caption: 'The V7. Pulls home.' },
		{ symbol: 'Am7', caption: 'The vi. The relative minor.' },
		{ symbol: 'Bm7b5', caption: 'The viiø7. The restless one.' }
	];

	/** The full letter-to-solfege map for the French reader. */
	const SOLFEGE_MAP = [
		{ letter: 'C', solfege: 'Do' },
		{ letter: 'D', solfege: 'Ré' },
		{ letter: 'E', solfege: 'Mi' },
		{ letter: 'F', solfege: 'Fa' },
		{ letter: 'G', solfege: 'Sol' },
		{ letter: 'A', solfege: 'La' },
		{ letter: 'B', solfege: 'Si' }
	];

	let seventhPick = $state(SEVENTH_SHAPES[0]);
	let anchorPick = $state(ANCHOR_CHORDS[0]);

	/** The V7 to I demo: G7 first, C major on the next beat. */
	let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
	function hearResolution() {
		void ensureAudioReady();
		playChord(['G', 'B', 'D', 'F']);
		clearTimeout(resolutionTimer);
		resolutionTimer = setTimeout(() => playChord(['C', 'E', 'G']), 800);
	}

	onDestroy(() => {
		clearTimeout(resolutionTimer);
	});
</script>

{#snippet hook(suffix: string)}
	{@const line = mnemonicFor(suffix)}
	{#if line !== null}
		<aside class="border-ink mt-2 border-l-4 pl-4" data-testid="mnemonic-aside">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">The hook</p>
			<p class="text-body mt-1">{line}</p>
		</aside>
	{/if}
{/snippet}

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<!-- max-w must stay an arbitrary value: the Print Shop @theme defines
	     --spacing-2xl: 48px, so a named max-w-2xl utility resolves to 48px. -->
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		<header>
			<h1 class="text-heading mt-2 font-bold">Theory</h1>
			<p class="text-body text-muted mt-2">
				The shop's field guide to chord symbols. Six short lessons, every one with real keys under
				it.
			</p>
		</header>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-interactive-lesson"
		>
			<InteractiveLesson />
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-symbol"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				Reading a chord symbol
			</p>
			<h2 class="text-heading font-bold">Root, then quality</h2>
			<div class="flex items-start gap-4">
				<ChordGlyph root="C" quality="m7" />
			</div>
			<p class="text-body">
				A chord symbol is two instructions. The letter is the root: where the left hand starts.
				Everything after it is the quality: the shape you stack on top. Cm7 says start on C, stack
				the minor-seventh shape.
			</p>
			<ChordExample symbol="Cm7" caption="Start on C (Do), stack the m7 shape." />
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-sevenths"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				The seventh shapes
			</p>
			<h2 class="text-heading font-bold">One triad, one seventh</h2>
			<p class="text-body">
				Every seventh chord is a triad plus one more third. Two choices name them all: which triad
				(major, minor, diminished) and which 7th (7, ♭7, or ♭♭7). Tap through the five on C.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each SEVENTH_SHAPES as shape (shape.symbol)}
					<Button
						type="button"
						variant={seventhPick.symbol === shape.symbol ? 'primary' : 'ghost'}
						onclick={() => (seventhPick = shape)}
					>
						{shape.symbol}
					</Button>
				{/each}
			</div>
			{#key seventhPick.symbol}
				<ChordExample symbol={seventhPick.symbol} caption={seventhPick.caption} />
			{/key}
			{@render hook(seventhPick.suffix)}
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-anchor"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				The white-key anchor
			</p>
			<h2 class="text-heading font-bold">One scale, four qualities</h2>
			<p class="text-body">
				Stack a seventh on each note of the C major scale and every chord lands on white keys
				only: Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5. One hand position teaches four qualities and
				their day jobs. Tap each one.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each ANCHOR_CHORDS as chord (chord.symbol)}
					<Button
						type="button"
						variant={anchorPick.symbol === chord.symbol ? 'primary' : 'ghost'}
						onclick={() => (anchorPick = chord)}
					>
						{chord.symbol}
					</Button>
				{/each}
			</div>
			{#key anchorPick.symbol}
				<ChordExample symbol={anchorPick.symbol} caption={anchorPick.caption} />
			{/key}
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-dominant"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				The dominant engine
			</p>
			<h2 class="text-heading font-bold">Why 7 pulls home</h2>
			<p class="text-body">
				Inside G7, the 3 and the ♭7 (B and F) sit a tritone apart: the restless interval. B leans
				up to C, F leans down to E, and the whole chord tips into C major. That pull is what makes
				a V7 a V7.
			</p>
			<ChordExample symbol="G7" caption="The tritone lives between B and F." />
			<div>
				<Button type="button" variant="ghost" onclick={hearResolution}>Hear G7 resolve</Button>
			</div>
			{@render hook('7')}
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-diminished"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				Half versus full
			</p>
			<h2 class="text-heading font-bold">ø7 and °7 untangled</h2>
			<p class="text-body">
				Both grow from the diminished triad. Half diminished, written ø or m7b5, keeps a plain ♭7.
				Fully diminished, written °7, flattens the 7th again to ♭♭7. The half in the name is about
				the 7th, nothing else.
			</p>
			<ChordExample symbol="Bm7b5" caption="Bø7 = Bm7b5. Same chord, two spellings." />
			{@render hook('m7b5')}
			<ChordExample symbol="Bdim7" caption="B°7. The 7th flattened twice." />
			{@render hook('dim7')}
		</section>

		<section
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
			data-testid="section-solfege"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">Do, ré, mi</p>
			<h2 class="text-heading font-bold">Both languages</h2>
			<p class="text-body">
				Letters and solfège name the same keys. The syllable follows the letter, not the
				accidental: C♯ is still Do, B♭ is still Si. Et voilà.
			</p>
			<div class="flex flex-wrap gap-4">
				{#each SOLFEGE_MAP as entry (entry.letter)}
					<NoteLabel letter={entry.letter} solfege={entry.solfege} />
				{/each}
			</div>
		</section>

		<div class="flex justify-center pb-8">
			<Button href="/drills">Take it to the drills</Button>
		</div>
	</div>
</main>
