<script lang="ts">
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { positionForBar, shellCycleBars, voiceRootedShell, type ShellPosition } from '$lib/practice/shellCycle';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 15's Concept picture: the ii V I of Autumn Leaves' first bars
	 * (B♭ major, the chapter's repertoire key) as three rooted shells, each
	 * drawn as a column of keys from the bass up, alternating the two
	 * positions so the eye sees what the hand does: one top note holds, the
	 * other steps down. Every letter is computed by the same engine the
	 * exercise grades with (`shellCycle.ts`), never typed by hand.
	 */
	const CONCEPT_KEY = 'B♭';

	const POSITION_KEY: Record<ShellPosition, MessageKey> = {
		'third-low': 'book.ch15.position.thirdLow',
		'seventh-low': 'book.ch15.position.seventhLow'
	};

	const columns = shellCycleBars('major', CONCEPT_KEY).map((bar, index) => {
		const chord = spellChord(bar.symbol);
		const voiced = voiceRootedShell(chord, positionForBar(index));
		return { roman: bar.roman, symbol: chordLabel(chord), position: voiced.position, notes: voiced.notes };
	});

	function hear(letters: string[]): void {
		void ensureAudioReady();
		playChord(letters);
	}
</script>

<div class="concept" data-testid="shells-concept">
	{#each columns as column (column.symbol)}
		<button
			type="button"
			class="column"
			data-testid="shells-concept-column"
			onclick={() => hear(column.notes.map((note) => note.letter))}
		>
			<span class="symbol">{column.symbol}</span>
			<span class="roman">{column.roman}</span>
			<span class="stack">
				{#each [...column.notes].reverse() as note (note.letter)}
					<span class="tone tone--{note.role}">
						<span class="tone-letter">{note.letter}</span>
						<span class="tone-marker">{note.marker}</span>
					</span>
				{/each}
			</span>
			<span class="position">{t(POSITION_KEY[column.position])}</span>
		</button>
	{/each}
</div>

<style>
	.concept {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.column {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.column:hover,
	.column:focus-visible {
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.symbol {
		font-weight: 700;
	}

	.roman,
	.position {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: var(--spacing-xs);
	}

	.tone {
		display: flex;
		justify-content: space-between;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-weight: 700;
	}

	.tone-marker {
		font-family: var(--font-mono);
		font-size: var(--text-label);
	}

	.tone--root {
		background: var(--color-root);
		color: var(--color-on-root);
	}

	.tone--third {
		background: var(--color-third);
		color: var(--color-on-third);
	}

	.tone--fifth {
		background: var(--color-fifth);
		color: var(--color-on-fifth);
	}

	.tone--seventh {
		background: var(--color-seventh);
		color: var(--color-on-seventh);
	}
</style>
