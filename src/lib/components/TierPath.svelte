<script lang="ts">
	import type { TierId } from '$lib/practice/tiers';
	import type { TierPath } from '$lib/practice/tierPath';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The tier ladder drawn as a path (ml-practice-game): one square per tier
	 * joined by a rule, the current tier in vermilion with a bar toward the
	 * next. Reached tiers are solid ink, tiers ahead are outlined in muted ink
	 * and still name themselves: a stop ahead is "coming up", never locked, so
	 * no padlock glyph appears anywhere (.planning/design/guided-path.md
	 * section 5.2, the game-layer rule).
	 *
	 * The tier line under the squares is the pre-start card's existing quiet
	 * line ("TIER 2 · ALL-KEY TRIADS"), kept under its own test id.
	 */

	interface Props {
		path: TierPath;
		currentTier: TierId;
		/** The tier that just opened, for the one-time unlock moment; null otherwise. */
		unlocked?: TierId | null;
	}

	let { path, currentTier, unlocked = null }: Props = $props();

	function stateLabel(state: TierPath['stops'][number]['state']): string {
		if (state === 'reached') return t('practice.path.state.reached');
		if (state === 'current') return t('practice.path.state.current');
		return t('practice.path.state.ahead');
	}

	const knownLine = $derived(
		(path.top ? t('practice.path.knownTop') : t('practice.path.known'))
			.replace('{N}', String(path.mastered))
			.replace('{M}', String(path.needed))
	);
</script>

<div data-testid="tier-path">
	<p class="text-label text-muted font-mono uppercase">{t('practice.path.label')}</p>
	<ol class="path mt-2" aria-label={t('practice.path.label')}>
		{#each path.stops as stop (stop.id)}
			<li
				class="stop stop--{stop.state}"
				data-state={stop.state}
				aria-current={stop.state === 'current' ? 'step' : undefined}
				aria-label={`${t('progress.settings.tierPrefix')} ${stop.id}, ${t(`progress.tier.${stop.id}.name`)}: ${stateLabel(stop.state)}`}
			>
				<span class="font-mono font-bold" aria-hidden="true">{stop.id}</span>
			</li>
		{/each}
	</ol>

	<p class="text-label mt-3 font-mono uppercase" data-testid="practice-tier-line">
		{t('progress.settings.tierPrefix')} {currentTier} · {t(`progress.tier.${currentTier}.name`)}
	</p>
	<div
		class="bar mt-2"
		role="progressbar"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={path.percent}
		aria-label={knownLine}
	>
		<div class="bar__fill" style="width: {path.percent}%"></div>
	</div>
	<p class="text-label text-muted mt-1 font-mono uppercase" data-testid="tier-path-known">
		{knownLine}
	</p>

	{#if unlocked !== null}
		<p class="unlock stamp text-body mt-4 font-bold" data-testid="tier-path-unlocked">
			{t('practice.path.unlocked').replace('{NAME}', t(`progress.tier.${unlocked}.name`))}
		</p>
	{/if}
</div>

<style>
	.path {
		display: flex;
		align-items: center;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.stop {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Shrinks rather than overflowing: six stops must fit a 320px phone's card. */
		flex: 0 1 32px;
		min-width: 22px;
		height: 32px;
		border: 2px solid var(--color-ink);
	}

	/* The rule joining one stop to the next: solid behind reached ground. */
	.stop + .stop {
		margin-left: 14px;
	}

	.stop + .stop::before {
		content: '';
		position: absolute;
		right: 100%;
		top: 50%;
		width: 16px;
		border-top: 2px solid var(--color-ink);
		transform: translateY(-50%);
	}

	.stop--ahead + .stop::before,
	.stop--ahead::before {
		border-top-color: var(--color-muted);
	}

	.stop--reached {
		background-color: var(--color-ink);
		color: var(--color-paper);
	}

	.stop--current {
		background-color: var(--color-vermilion);
		color: var(--color-paper);
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.stop--ahead {
		border-color: var(--color-muted);
		color: var(--color-muted);
	}

	.bar {
		height: 12px;
		border: 2px solid var(--color-ink);
		background-color: var(--color-paper);
		max-width: 320px;
	}

	.bar__fill {
		height: 100%;
		background-color: var(--color-vermilion);
		transition: width 400ms ease-out;
	}

	.unlock {
		border-left: 4px solid var(--color-vermilion);
		padding-left: var(--spacing-sm);
	}

	.stamp {
		animation: stamp-in 240ms ease-out;
	}
</style>
