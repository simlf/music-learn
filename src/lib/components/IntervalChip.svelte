<script lang="ts">
	import type { IntervalRole } from '$lib/theory/types';

	/**
	 * Small mono-font tag showing an interval role (R, 3, 5, 7), filled with
	 * the matching semantic interval-color token (DESIGN-02). Used in the
	 * showcase interval-formula readout and reused in Phase 3 drill feedback.
	 */
	interface Props {
		/** Which chord tone this chip represents. */
		role: IntervalRole;
		/** Short label to render, e.g. "R", "3", "5", "7". */
		label: string;
		/**
		 * Optional French long name ("tierce mineure"), surfaced as tooltip +
		 * aria-label. Omitted keeps the chip byte-identical to before this
		 * prop existed (gated-prop compatibility contract).
		 */
		longName?: string;
	}

	let { role, label, longName }: Props = $props();
</script>

<span
	class="interval-chip interval-chip--{role}"
	title={longName}
	aria-label={longName ? `${label}: ${longName}` : undefined}>{label}</span
>

<style>
	.interval-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: 700;
		letter-spacing: var(--text-label--letter-spacing);
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 2px solid var(--color-ink);
	}

	.interval-chip--root {
		background-color: var(--color-root);
		color: var(--color-on-root);
	}

	.interval-chip--third {
		background-color: var(--color-third);
		color: var(--color-on-third);
	}

	.interval-chip--fifth {
		background-color: var(--color-fifth);
		color: var(--color-on-fifth);
	}

	.interval-chip--seventh {
		background-color: var(--color-seventh);
		color: var(--color-on-seventh);
	}

	.interval-chip--second {
		background-color: var(--color-second);
		color: var(--color-on-second);
	}

	.interval-chip--fourth {
		background-color: var(--color-fourth);
		color: var(--color-on-fourth);
	}

	.interval-chip--sixth {
		background-color: var(--color-sixth);
		color: var(--color-on-sixth);
	}
</style>
