<script lang="ts">
	import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';
	import ScaleDegreeStrip, { type InspectPayload } from '$lib/components/ScaleDegreeStrip.svelte';
	import InspectRegister from '$lib/components/InspectRegister.svelte';
	import ScaleKeyboardDrill from '$lib/components/ScaleKeyboardDrill.svelte';
	import Button from '$lib/components/Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Light major-scale explorer (Track C): pick a tonic, see its seven
	 * degrees anchored as a tonic-first strip (Sketch 002 winner), tap any
	 * degree to hear it and read its interval from the tonic (letter + solfège
	 * + shorthand + French long name). The strip replaced the piano keyboard,
	 * which stranded non-C scales across a fixed C-to-C octave span. Fully
	 * client-side and prerender-safe.
	 *
	 * A mode toggle adds a Practice tab alongside Explore: the same tonic
	 * drives ScaleKeyboardDrill, a tonic-anchored 2-octave keyboard graded by
	 * pitch class (SCALE-04, replacing the retired degree-ladder surface).
	 * Explore stays the default so the existing degree-strip behavior (and its
	 * tests) are unaffected.
	 */
	type Mode = 'explore' | 'practice';

	let tonic = $state('C');
	let mode = $state<Mode>('explore');
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
	<h1 class="text-heading mt-2 font-bold">{t('scales.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('scales.page.subtitle')}
	</p>

	<div class="mt-6 flex flex-wrap gap-2" data-testid="tonic-row">
		{#each MAJOR_SCALE_ROOTS as root (root)}
			<Button
				type="button"
				variant={root === tonic ? 'primary' : 'ghost'}
				aria-label={`${root} ${t('scales.tonic.qualitySuffix')}`}
				aria-pressed={root === tonic}
				onclick={() => pickTonic(root)}
			>
				{root}
			</Button>
		{/each}
	</div>

	<div class="border-ink bg-paper-bright mt-8 border-2 px-2 py-6 sm:px-6">
		<p class="text-label font-mono uppercase" data-testid="scale-title">
			{tonic} {t('scales.tonic.qualitySuffix')}
		</p>

		<div
			class="mt-4 flex gap-2"
			data-testid="mode-toggle"
			role="group"
			aria-label={t('scales.mode.groupLabel')}
		>
			<Button
				type="button"
				variant={mode === 'explore' ? 'primary' : 'ghost'}
				aria-pressed={mode === 'explore'}
				onclick={() => (mode = 'explore')}
			>
				{t('scales.mode.explore')}
			</Button>
			<Button
				type="button"
				variant={mode === 'practice' ? 'primary' : 'ghost'}
				aria-pressed={mode === 'practice'}
				onclick={() => (mode = 'practice')}
			>
				{t('scales.mode.practice')}
			</Button>
		</div>

		{#if mode === 'explore'}
			<div class="mt-4">
				<ScaleDegreeStrip {notes} {tonic} onInspect={handleInspect} />
			</div>

			<InspectRegister payload={inspectPayload} idleText={t('scales.inspect.idle')} />
		{:else}
			<div class="mt-4">
				<ScaleKeyboardDrill {notes} {tonic} />
			</div>
		{/if}
	</div>
</main>
