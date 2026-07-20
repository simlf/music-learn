<script lang="ts">
	import RecallSession from '$lib/components/RecallSession.svelte';
	import RecallMap from '$lib/components/RecallMap.svelte';
	import Button from '$lib/components/Button.svelte';
	import SongFilterToggle from '$lib/components/SongFilterToggle.svelte';
	import { buildProvenanceIndex } from '$lib/practice/songProvenance';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * /recall (MEM-01/MEM-02/MEM-04): the Review/Map mode toggle, mirroring
	 * /scales' Explore/Practice pattern. Review (default) is the 11-05
	 * reveal-then-grade session; Map (11-06) is the fact x mode recall map.
	 * The session-complete card's "View Recall Map" CTA switches this same
	 * mode state in place, no navigation.
	 */
	type Mode = 'review' | 'map';
	let mode = $state<Mode>('review');

	/**
	 * SONG-02: the "From my songs" Review-pool filter, independent of Drills'
	 * own `music-learn:drills-song-filter` key. Review-surface only (never
	 * rendered on Map, which visualizes the whole fact set regardless of
	 * filter). `provenanceIndex` is built once here and passed down so
	 * RecallSession and the fallback-note derivation share the same read.
	 */
	const RECALL_SONG_FILTER_KEY = 'music-learn:recall-song-filter';

	function readRecallSongFilter(): boolean {
		try {
			return localStorage.getItem(RECALL_SONG_FILTER_KEY) === 'true';
		} catch {
			return false;
		}
	}

	const provenanceIndex = buildProvenanceIndex();
	let songFilterOn = $state(readRecallSongFilter());
	const songFallbackActive = $derived(songFilterOn && provenanceIndex.size === 0);
	/** SONG-02: distinct active-song chords available to the Review pool, for the explanatory pool-note's {N} interpolation. */
	const songChordCount = provenanceIndex.size;

	function toggleSongFilter(): void {
		songFilterOn = !songFilterOn;
		try {
			localStorage.setItem(RECALL_SONG_FILTER_KEY, String(songFilterOn));
		} catch {
			// Best-effort persistence only; the in-memory toggle still works.
		}
	}
</script>

<main
	class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
	data-review-dock={mode === 'review' ? '' : undefined}
>
	<h1 class="text-heading mt-2 font-bold">{t('recall.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('recall.page.subtitle')}
	</p>

	<div
		class="mt-8 flex gap-2"
		data-testid="mode-toggle"
		role="group"
		aria-label={t('recall.page.aria.mode-toggle')}
	>
		<Button
			type="button"
			variant={mode === 'review' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'review'}
			onclick={() => (mode = 'review')}
		>
			{t('recall.page.mode.review')}
		</Button>
		<Button
			type="button"
			variant={mode === 'map' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'map'}
			onclick={() => (mode = 'map')}
		>
			{t('recall.page.mode.map')}
		</Button>
	</div>

	{#if mode === 'review'}
		<div class="mt-4">
			<SongFilterToggle
				poolLabel={t('recall.page.pool-label')}
				on={songFilterOn}
				onToggle={toggleSongFilter}
				note={songFallbackActive ? t('recall.page.note.fallback') : undefined}
				noteOn={`${t('recall.page.note.on-prefix')} ${songChordCount} ${t('recall.page.note.on-suffix')}`}
				noteOff={t('recall.page.note.off')}
			/>
		</div>
	{/if}

	<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
		{#if mode === 'review'}
			{#key songFilterOn}
				<RecallSession onViewMap={() => (mode = 'map')} {songFilterOn} {provenanceIndex} />
			{/key}
		{:else}
			<RecallMap />
		{/if}
	</div>
</main>
