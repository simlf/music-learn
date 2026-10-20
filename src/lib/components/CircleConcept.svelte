<script lang="ts">
	import { ensureAudioReady, playNote } from '$lib/audio/audio';
	import { FIFTHS_CYCLE, isSameStop, nextInCycle, stepsFrom } from '$lib/practice/circleOfFifths';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Chapter 16's Concept picture: the 12 keys as a ring, C at the top, each
	 * key a fifth above its neighbour going clockwise (the sharp side, C G D A
	 * E B F♯) and a fifth below going counterclockwise (the flat side). Pick a
	 * key to hear its root and see its ii and V marked: they sit one and two
	 * steps clockwise, so the ii V I is two steps down the ring,
	 * counterclockwise. Every letter comes from the drill's own engine
	 * (`circleOfFifths.ts`).
	 *
	 * The ring is an inline SVG picture (app.css zeroes every border-radius,
	 * so a CSS circle cannot exist); the control is the house chip row under
	 * it, the same Button idiom as every other key picker.
	 */

	/** Ring order, clockwise from the top: up a fifth each step. */
	const RING = FIFTHS_CYCLE.map((_, index) => stepsFrom('C', index, 'up') ?? 'C');

	/** SVG geometry, in viewBox units (200 x 200). */
	const CENTER = 100;
	const RADIUS = 76;
	const TAG_RADIUS = 50;

	let picked = $state('C');

	const v = $derived(nextInCycle(picked, 'up') ?? picked);
	const ii = $derived(stepsFrom(picked, 2, 'up') ?? picked);
	const down = $derived(nextInCycle(picked, 'down') ?? picked);

	function point(index: number, radius: number): { x: number; y: number } {
		const angle = (index / RING.length) * 2 * Math.PI;
		return { x: CENTER + radius * Math.sin(angle), y: CENTER - radius * Math.cos(angle) };
	}

	function tagFor(key: string): string {
		if (isSameStop(key, picked)) return 'I';
		if (isSameStop(key, v)) return 'V';
		if (isSameStop(key, ii)) return 'ii';
		return '';
	}

	function pick(key: string): void {
		picked = key;
		void ensureAudioReady();
		playNote(`${key}3`);
	}

	function fill(template: string, values: Record<string, string>): string {
		return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
	}
</script>

<div class="flex flex-col gap-4" data-testid="circle-concept">
	<svg class="wheel" viewBox="0 0 200 200" role="img" aria-label={t('book.ch16.concept.ringLabel')}>
		<circle class="wheel-line" cx={CENTER} cy={CENTER} r={RADIUS} />
		{#each RING as key, index (key)}
			{@const at = point(index, RADIUS)}
			{@const tagAt = point(index, TAG_RADIUS)}
			{@const tag = tagFor(key)}
			{@const isPicked = isSameStop(key, picked)}
			<g data-testid="circle-concept-node" data-key={key} data-tag={tag}>
				<circle class="node" class:node--picked={isPicked} cx={at.x} cy={at.y} r="14" />
				<text class="label" class:label--picked={isPicked} x={at.x} y={at.y}>{key}</text>
				{#if tag}
					<text class="tag" x={tagAt.x} y={tagAt.y}>{tag}</text>
				{/if}
			</g>
		{/each}
	</svg>

	<div class="flex flex-wrap gap-2" data-testid="circle-concept-row">
		{#each RING as key (key)}
			<Button
				type="button"
				variant={isSameStop(key, picked) ? 'primary' : 'ghost'}
				aria-pressed={isSameStop(key, picked)}
				onclick={() => pick(key)}
			>
				{key}
			</Button>
		{/each}
	</div>

	<p class="text-body" data-testid="circle-concept-readout">
		{fill(t('book.ch16.concept.readout'), { key: picked, down, up: v, ii, v })}
	</p>
</div>

<style>
	.wheel {
		display: block;
		width: min(100%, 20rem);
		margin: 0 auto;
	}

	.wheel-line {
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 2;
	}

	.node {
		fill: var(--color-paper-bright);
		stroke: var(--color-ink);
		stroke-width: 2;
	}

	.node--picked {
		fill: var(--color-vermilion);
		stroke: var(--color-vermilion);
	}

	.label {
		fill: var(--color-ink);
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 11px;
		text-anchor: middle;
		dominant-baseline: central;
	}

	.label--picked {
		fill: var(--color-on-root);
	}

	.tag {
		fill: var(--color-ink);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 9px;
		text-anchor: middle;
		dominant-baseline: central;
	}
</style>
