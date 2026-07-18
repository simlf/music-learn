<script lang="ts">
	import { songHookFor } from '$lib/theory/songHooks';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Sketch 006 (winner A: inline tap-to-reveal), the famous-tune interval
	 * hook. Strictly opt-in: renders a small "Sounds like..." toggle and
	 * reveals the vetted tune only on tap, hiding again on a second tap.
	 * Renders nothing at all when the interval has no vetted hook (unison,
	 * tritone, anything outside the fixed table), so it never pads out a
	 * frame with nothing to say.
	 */
	interface Props {
		/** The interval's `short` code, e.g. "m3", "P5". */
		short: string;
	}

	let { short }: Props = $props();

	const tune = $derived(songHookFor(short));
	let revealed = $state(false);

	function toggle() {
		revealed = !revealed;
	}
</script>

{#if tune !== null}
	<div class="song-hook" data-testid="song-hook">
		<button
			type="button"
			class="song-hook__toggle text-label font-mono uppercase"
			aria-pressed={revealed}
			onclick={toggle}
		>
			{revealed ? t('songs.hook.hideTune') : t('songs.hook.soundsLike')}
		</button>
		{#if revealed}
			<p class="song-hook__tune text-label font-mono" data-testid="song-hook-tune">
				{short} · {tune}
			</p>
		{/if}
	</div>
{/if}

<style>
	.song-hook {
		margin-top: var(--spacing-sm);
	}

	.song-hook__toggle {
		background-color: transparent;
		border: 2px solid var(--color-ink);
		color: var(--color-ink);
		cursor: pointer;
		padding: var(--spacing-xs) var(--spacing-sm);
		min-height: 44px;
		min-width: 44px;
	}

	.song-hook__toggle:active {
		transform: translate(1px, 1px);
	}

	.song-hook__tune {
		margin-top: var(--spacing-xs);
		color: var(--color-muted);
		font-style: italic;
	}
</style>
