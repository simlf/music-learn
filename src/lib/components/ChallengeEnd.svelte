<script lang="ts">
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * A challenge's end card (ml-practice-game): the result, a NEW BEST stamp
	 * when it is one, and otherwise the standing best on its own line. Never the
	 * gap to the best and never a "worse than last time": a run below the best
	 * is just a run (the game-layer rule, .planning/design/guided-path.md
	 * section 5.2).
	 */

	interface Props {
		/** The big number: points, right answers, or a time. */
		result: string;
		/** One plain sentence under it. */
		line: string;
		newBest: boolean;
		/** The standing best, already formatted; shown only when this run did not beat it. */
		best?: string;
		onAgain: () => void;
	}

	let { result, line, newBest, best, onAgain }: Props = $props();
</script>

<div
	class="border-ink bg-paper-bright stamp mt-6 border-2 px-2 py-6 sm:px-6"
	data-testid="challenge-end"
>
	<p class="text-display font-mono font-bold" data-testid="challenge-end-result">{result}</p>
	{#if newBest}
		<p class="new-best stamp text-label mt-2 font-mono uppercase" data-testid="challenge-new-best">
			{t('practice.challenge.newBest')}
		</p>
	{:else if best !== undefined}
		<p class="text-label text-muted mt-2 font-mono uppercase" data-testid="challenge-best">
			{t('practice.challenge.best').replace('{N}', best)}
		</p>
	{/if}
	<p class="text-body mt-4 font-bold">{line}</p>

	<div class="mt-6 flex flex-wrap gap-2">
		<Button type="button" variant="primary" onclick={onAgain}>{t('practice.challenge.again')}</Button>
	</div>
</div>

<style>
	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/* Ink, not vermilion, behind the 12px label: paper on vermilion is 3.8:1, under AA. */
	.new-best {
		display: inline-block;
		background-color: var(--color-ink);
		color: var(--color-paper);
		padding: 2px var(--spacing-sm);
	}
</style>
