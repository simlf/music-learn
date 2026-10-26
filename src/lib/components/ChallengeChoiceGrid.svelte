<script lang="ts">
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * The four-chip answer grid the sprint and the ear duel share
	 * (ml-practice-game). Two columns on a phone, so every chip sits under one
	 * thumb. The instant feedback lives here: the picked chip bursts (ink fill
	 * and a vermilion ring) on a right answer, and on a miss it greys out with
	 * a cross while the right chip takes the ink fill, so the answer is always
	 * shown, never just the error.
	 */

	interface Props {
		choices: string[];
		/** The right choice. */
		answer: string;
		/** The tapped choice, once there is one; the grid locks while it is set. */
		picked: string | undefined;
		/** How a choice reads on its chip: the symbol itself, or its note spelling. */
		labelFor?: (choice: string) => string;
		/** Render the chip label as spaced note letters (the sprint's spellings). */
		spelled?: boolean;
		onPick: (choice: string) => void;
	}

	let { choices, answer, picked, labelFor = (choice) => choice, spelled = false, onPick }: Props =
		$props();

	function stateOf(choice: string): 'right' | 'wrong' | 'shown' | 'idle' {
		if (picked === undefined) return 'idle';
		if (choice === picked) return choice === answer ? 'right' : 'wrong';
		return choice === answer ? 'shown' : 'idle';
	}
</script>

<div class="grid grid-cols-2 gap-2" data-testid="challenge-choice-grid">
	{#each choices as choice (choice)}
		{@const state = stateOf(choice)}
		<div class="chip chip--{state}" data-state={state}>
			<Button
				type="button"
				variant="ghost"
				disabled={picked !== undefined}
				aria-label={`${t('drills.aria.answerPrefix')} ${labelFor(choice)}`}
				onclick={() => onPick(choice)}
			>
				{#if state === 'wrong'}<span aria-hidden="true">✕ </span>{/if}
				{#if spelled}
					<span class="inline-flex gap-3 font-serif text-heading font-bold">
						{#each labelFor(choice).split(' ') as letter, index (index)}
							<span>{letter}</span>
						{/each}
					</span>
				{:else}
					<span class="font-serif text-heading font-bold">{labelFor(choice)}</span>
				{/if}
			</Button>
		</div>
	{/each}
</div>

<style>
	.chip {
		position: relative;
		display: grid;
	}

	.chip :global(.ps-button) {
		width: 100%;
	}

	/* A disabled chip keeps full ink: the locked grid is the feedback, not a greyed-out form. */
	.chip :global(.ps-button:disabled) {
		cursor: default;
		color: var(--color-ink);
	}

	.chip--right :global(.ps-button:disabled),
	.chip--shown :global(.ps-button:disabled) {
		background-color: var(--color-ink);
		color: var(--color-paper);
	}

	.chip--wrong :global(.ps-button:disabled) {
		background-color: var(--color-wrong);
	}

	.chip--right::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 3px solid var(--color-vermilion);
		pointer-events: none;
		animation: burst 320ms ease-out forwards;
	}

	@keyframes burst {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(1.18);
			opacity: 0;
		}
	}
</style>
