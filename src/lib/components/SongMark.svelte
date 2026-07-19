<script lang="ts">
	/**
	 * SONG-01's single shared provenance tag: the one recurring object that
	 * reads identically across every surface a chord appears on (Drills
	 * prompt, Recall card, Chord Lookup result). Read-only and inert - no
	 * interaction, no state, no per-song tooltip in v1 (deferred idea).
	 *
	 * Renders nothing when there is nothing to say, mirroring SongHook's
	 * conditional-render discipline: an empty songs array means this chord
	 * has no provenance, so no tag (not an empty tag) should appear.
	 */
	import { t } from '$lib/i18n/locale.svelte';

	interface Props {
		/** Song name(s) this chord belongs to, first-seen order. Empty = render nothing. */
		songs: string[];
	}

	let { songs }: Props = $props();

	/** `t()` has no interpolation, so the {N} placeholder is substituted here. */
	const countLabel = $derived(t('songs.mark.count').replace('{N}', String(songs.length)));
</script>

{#if songs.length > 0}
	<span
		class="song-mark"
		class:song-mark--multi={songs.length >= 2}
		data-testid="song-mark"
	>
		{#if songs.length === 1}
			♪ {songs[0]}
		{:else}
			{countLabel}
		{/if}
	</span>
{/if}

<style>
	.song-mark {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		font: 700 var(--text-label) / 1.4 var(--font-mono);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border: 2px solid var(--color-ink);
		background: var(--color-paper);
		color: var(--color-ink);
		padding: var(--spacing-xs) var(--spacing-sm);
		white-space: nowrap;
	}

	.song-mark--multi {
		border-style: double;
	}
</style>
