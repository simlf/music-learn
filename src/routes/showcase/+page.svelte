<script lang="ts">
	import { spellChord } from '$lib/theory/chord';

	let symbol = $state('');
	let notes = $state<string[]>([]);

	function showChord() {
		notes = spellChord(symbol).notes.map((note) => note.letter);
	}
</script>

<main class="min-h-screen bg-paper p-8 font-sans text-ink">
	<h1 class="text-lg font-bold uppercase tracking-tight">Music Learn</h1>
	<h2 class="mt-2 text-lg font-bold">Chord showcase</h2>

	<form
		class="mt-8"
		onsubmit={(event) => {
			event.preventDefault();
			showChord();
		}}
	>
		<input
			type="text"
			bind:value={symbol}
			placeholder="Type a chord: Cm7, F#ø7, B♭maj7..."
			class="border-ink bg-paper-bright border-2 p-2"
		/>
		<button
			type="submit"
			class="bg-vermilion text-paper border-ink ml-2 border-2 px-4 py-2 font-bold"
		>
			Show chord
		</button>
	</form>

	{#if notes.length > 0}
		<div class="mt-8">
			<ul class="flex gap-4">
				{#each notes as note (note)}
					<li class="font-serif text-2xl font-bold">{note}</li>
				{/each}
			</ul>
		</div>
	{/if}
</main>
