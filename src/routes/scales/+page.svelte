<script lang="ts">
	import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';
	import { intervalBetween } from '$lib/theory/interval';
	import PianoKeyboard, { type InspectPayload } from '$lib/components/PianoKeyboard.svelte';
	import InspectRegister from '$lib/components/InspectRegister.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * Light major-scale explorer (Track C): pick a tonic, see its seven
	 * degrees in the full degree-class color language, tap any key to hear
	 * it and read its interval from the tonic (letter + solfège + shorthand
	 * + French long name). Fully client-side and prerender-safe: pure tonal
	 * computation, no fetching, no browser APIs beyond the shared components.
	 */
	let tonic = $state('C');
	const notes = $derived(majorScaleNotes(tonic));

	/** The latest inspect tap; reset when the tonic changes. */
	let inspectPayload = $state<InspectPayload | null>(null);

	function pickTonic(next: string) {
		tonic = next;
		inspectPayload = null;
	}

	function handleInspect(payload: InspectPayload) {
		inspectPayload = payload;
	}
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Scales</h1>
	<p class="text-muted mt-2">
		Pick a tonic, mon ami. Tap any key to hear it and read its interval from the root.
	</p>

	<div class="mt-6 flex flex-wrap gap-2" data-testid="tonic-row">
		{#each MAJOR_SCALE_ROOTS as root (root)}
			<Button
				type="button"
				variant={root === tonic ? 'primary' : 'ghost'}
				aria-label={`${root} major`}
				aria-pressed={root === tonic}
				onclick={() => pickTonic(root)}
			>
				{root}
			</Button>
		{/each}
	</div>

	<div class="border-ink bg-paper-bright mt-8 border-2 px-2 py-6 sm:px-6">
		<p class="text-label font-mono uppercase" data-testid="scale-title">
			{tonic} major · gamme majeure
		</p>

		<div class="mt-4">
			<PianoKeyboard {notes} inspectable onInspect={handleInspect} />
		</div>

		<InspectRegister payload={inspectPayload} />

		<div class="mt-6 flex flex-wrap gap-4" data-testid="degree-row">
			{#each notes as note (note.letter)}
				{@const info = intervalBetween(tonic, note.letter)}
				<div class="flex flex-col items-center gap-1">
					<IntervalChip role={note.role} label={info.short} longName={info.longFr} />
					<span class="text-label font-mono">{note.letter}</span>
					<span class="text-label font-mono">{note.solfege}</span>
				</div>
			{/each}
		</div>
	</div>
</main>
