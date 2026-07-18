<script lang="ts">
	import { getLevelState, setCurrentTier } from '$lib/practice/levelState';
	import { TIERS, tierById, type TierId } from '$lib/practice/tiers';
	import { t } from '$lib/i18n/locale.svelte';
	import Button from './Button.svelte';

	/**
	 * Beginner on-ramp course stepper (sketch 007, winner A). Shown at the top
	 * of the Drills page so the level lives where you practice, not buried in
	 * settings. Presents the CURRENT tier by name with a plain blurb, a peek at
	 * the immediate NEXT tier, and a "Change level" affordance that only ever
	 * offers tiers already reached: advanced tiers stay hidden until unlocked,
	 * so a beginner is never faced with the whole 1 to 6 ladder at once.
	 *
	 * Mutates the shared levelState (same store the Progress settings write),
	 * and emits onChange so the drills page can react (e.g. the interval
	 * scaffold fades with the tier).
	 */
	interface Props {
		/** Fires with the new tier whenever the user changes level here. */
		onChange?: (tier: TierId) => void;
	}

	let { onChange }: Props = $props();

	let level = $state(getLevelState());
	let changing = $state(false);

	const current = $derived(tierById(level.currentTier));
	const nextTier = $derived(TIERS.find((tier) => tier.id === level.currentTier + 1) ?? null);
	/** Only tiers already reached are pickable; unreached/locked tiers never appear. */
	const reachedTiers = $derived(TIERS.filter((tier) => level.unlockedTiers.includes(tier.id)));

	function pick(tier: TierId) {
		level = setCurrentTier(tier);
		changing = false;
		onChange?.(tier);
	}
</script>

<section
	class="border-ink bg-paper-bright border-2 px-4 py-4 sm:px-6"
	data-testid="level-picker"
	aria-label={t('drills.level.ariaCourse')}
>
	<p class="text-label text-muted font-mono uppercase" style="letter-spacing: 0.12em;">
		{t('drills.level.ariaCourse')}
	</p>

	<div class="mt-2 flex flex-wrap items-baseline gap-2">
		<span
			class="border-ink text-label border px-2 py-1 font-mono uppercase"
			data-testid="current-tier-tag"
		>
			{t('drills.level.tier')} {current.id}
		</span>
		<span class="text-heading font-serif font-bold">{current.name}</span>
	</div>

	<p class="text-body mt-2">{current.blurb}</p>

	{#if reachedTiers.length > 1}
		<div class="mt-4">
			<Button
				type="button"
				variant="ghost"
				aria-expanded={changing}
				onclick={() => (changing = !changing)}
			>
				{changing ? t('drills.level.close') : t('drills.level.changeLevel')}
			</Button>

			{#if changing}
				<div class="mt-2 flex flex-col gap-2" data-testid="reached-tiers">
					{#each reachedTiers as tier (tier.id)}
						<Button
							type="button"
							variant={tier.id === level.currentTier ? 'primary' : 'ghost'}
							aria-label={`${t('drills.level.switchToTierPrefix')} ${tier.id}`}
							aria-pressed={tier.id === level.currentTier}
							onclick={() => pick(tier.id)}
						>
							{t('drills.level.tier')} {tier.id}: {tier.name}
						</Button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if nextTier}
		<div class="border-ink/30 mt-4 border-t pt-3" data-testid="next-up">
			<p class="text-label text-muted font-mono uppercase" style="letter-spacing: 0.12em;">
				{t('drills.level.nextUp')}
			</p>
			<div class="mt-1 flex flex-wrap items-baseline justify-between gap-2">
				<span class="text-body font-serif font-bold"
					>{t('drills.level.tier')} {nextTier.id}: {nextTier.name}</span
				>
				<span class="text-label text-muted border-ink/40 border px-2 py-1 font-mono uppercase">
					{t('drills.common.notYet')}
				</span>
			</div>
		</div>
	{/if}
</section>
