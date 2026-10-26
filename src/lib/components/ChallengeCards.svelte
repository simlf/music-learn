<script lang="ts">
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import {
		EAR_DUEL_ROUNDS,
		formatClock,
		keyClimbStops,
		type ChallengeId
	} from '$lib/practice/challenges';
	import { readBest, recordKey } from '$lib/practice/challengeRecords';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The challenge cards on /practice (ml-practice-game): one card per
	 * challenge in today's order, the first marked as today's pick. Every card
	 * names how it is answered (tap, headphones, on-screen keys), because the
	 * whole set is built to be played away from a piano. A best shows only
	 * once there is one: a card never opens with "BEST 0".
	 */

	interface Props {
		/** challenges.challengeOrder for today: the first is today's pick. */
		order: ChallengeId[];
		/** Today's key climb quality (challenges.keyClimbQuality). */
		climbQuality: string;
		onPlay: (id: ChallengeId) => void;
	}

	let { order, climbQuality, onPlay }: Props = $props();

	/** The first three climb stops as the blurb names them: "Cm7, Fm7, B♭m7". */
	const climbPreview = $derived(
		keyClimbStops(climbQuality)
			.slice(0, 3)
			.map((symbol) => chordLabel(spellChord(symbol)))
			.join(', ')
	);

	function nameOf(id: ChallengeId): string {
		if (id === 'sprint') return t('practice.challenge.sprint.name');
		if (id === 'ear-duel') return t('practice.challenge.earDuel.name');
		return t('practice.challenge.keyClimb.name');
	}

	function blurbOf(id: ChallengeId): string {
		if (id === 'sprint') return t('practice.challenge.sprint.blurb');
		if (id === 'ear-duel') return t('practice.challenge.earDuel.blurb');
		return t('practice.challenge.keyClimb.blurb').replace('{CHORDS}', climbPreview);
	}

	function inputOf(id: ChallengeId): string {
		if (id === 'sprint') return t('practice.challenge.input.tap');
		if (id === 'ear-duel') return t('practice.challenge.input.ear');
		return t('practice.challenge.input.keys');
	}

	function bestOf(id: ChallengeId): string | null {
		if (id === 'key-climb') {
			const ms = readBest(recordKey('key-climb', climbQuality));
			return ms === undefined ? null : formatClock(ms);
		}
		const value = readBest(id);
		if (value === undefined) return null;
		return id === 'sprint'
			? t('practice.challenge.points').replace('{N}', String(value))
			: `${value} / ${EAR_DUEL_ROUNDS}`;
	}
</script>

<section class="mt-8" data-testid="challenge-cards" aria-labelledby="challenge-heading">
	<h2 id="challenge-heading" class="text-label font-mono uppercase">
		{t('practice.challenge.heading')}
	</h2>
	<div class="mt-2 grid gap-4 sm:grid-cols-3">
		{#each order as id, position (id)}
			{@const best = bestOf(id)}
			<article
				class="card border-ink bg-paper-bright border-2 p-4"
				class:card--pick={position === 0}
				data-testid={`challenge-card-${id}`}
			>
				{#if position === 0}
					<p class="pick text-label font-mono uppercase" data-testid="challenge-today-pick">
						{t('practice.challenge.todayPick')}
					</p>
				{/if}
				<h3 class="text-heading mt-2 font-serif font-bold">{nameOf(id)}</h3>
				<p class="text-body mt-2">{blurbOf(id)}</p>
				<p class="text-label text-muted mt-2 font-mono uppercase">
					{inputOf(id)}{#if best !== null}
						· {t('practice.challenge.best').replace('{N}', best)}{/if}
				</p>
				<div class="mt-4">
					<Button
						type="button"
						variant={position === 0 ? 'primary' : 'ghost'}
						aria-label={t('practice.challenge.playAria').replace('{NAME}', nameOf(id))}
						onclick={() => onPlay(id)}
					>
						{t('practice.challenge.play')}
					</Button>
				</div>
			</article>
		{/each}
	</div>
</section>

<style>
	.card--pick {
		box-shadow: 4px 4px 0 var(--color-vermilion);
	}

	/* Ink, not vermilion, behind the 12px label: paper on vermilion is 3.8:1, under AA. */
	.pick {
		display: inline-block;
		background-color: var(--color-ink);
		color: var(--color-paper);
		padding: 2px var(--spacing-sm);
	}
</style>
