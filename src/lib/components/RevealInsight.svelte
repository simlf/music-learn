<script lang="ts">
	import { spellChord } from '$lib/theory/chord';
	import { contrastLine } from '$lib/theory/contrast';
	import { mnemonicFor } from '$lib/copy/mnemonics';

	/**
	 * Teaching lines for the drill reveal card (Track D): the confusion
	 * contrast names the boundary the user just missed ("Cm7 has E♭, C7 has
	 * E."), the mnemonic teaches the rule for the question's quality. Owns
	 * all derivation (spellChord, contrastLine, mnemonicFor) so the drills
	 * page, a 4-track merge hotspot, only passes the two symbols through.
	 *
	 * Density rule (design skill): the reveal card is already dense on a
	 * phone, so when both lines exist the mnemonic yields to the contrast
	 * below the sm breakpoint. Renders nothing at all when neither line has
	 * something worth saying: no empty frames on the card.
	 */
	interface Props {
		/** The question's correct chord symbol, e.g. "Cm7". */
		correctSymbol: string;
		/** The symbol the user picked on a wrong identification answer, if any. */
		givenSymbol?: string;
	}

	let { correctSymbol, givenSymbol }: Props = $props();

	/** tonal-style ASCII form of the root, to slice the quality suffix off the symbol. */
	function toAsciiAccidentals(letter: string): string {
		return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
	}

	const qualitySuffix = $derived.by(() => {
		const chord = spellChord(correctSymbol);
		if (!chord.recognized) return null;
		const asciiRoot = toAsciiAccidentals(chord.root);
		return chord.symbol.startsWith(asciiRoot) ? chord.symbol.slice(asciiRoot.length) : null;
	});

	const contrast = $derived(
		givenSymbol !== undefined ? contrastLine(correctSymbol, givenSymbol) : null
	);
	const mnemonic = $derived(qualitySuffix !== null ? mnemonicFor(qualitySuffix) : null);
</script>

{#if contrast !== null || mnemonic !== null}
	<div class="mt-6 flex flex-col gap-2" data-testid="reveal-insight">
		{#if contrast !== null}
			<p class="text-body" data-testid="contrast-line">{contrast}</p>
		{/if}
		{#if mnemonic !== null}
			<p
				class={`text-body text-muted ${contrast !== null ? 'hidden sm:block' : ''}`}
				data-testid="mnemonic-line"
			>
				{mnemonic}
			</p>
		{/if}
	</div>
{/if}
