<script lang="ts">
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';
	import {
		COUNT_IN_OPTIONS,
		HW_TEMPO_MAX,
		HW_TEMPO_MIN,
		HW_TEMPO_PRESETS,
		clampHwTempo,
		nudgeHwTempo
	} from '$lib/homework/tempo';

	/**
	 * Tempo and count-in controls for the homework metronome: a stepper, a
	 * slider, one-tap presets and the count-in length. One idiom, the app's
	 * standard one: a mono uppercase label over a row of chips, the selected
	 * chip in the primary (vermilion) variant.
	 *
	 * Tempo stays adjustable while a click-only metronome runs (so you can
	 * speed it up without stopping) but is locked during a scored run, where
	 * changing it would change what the written rhythm means.
	 */
	interface Props {
		bpm: number;
		countInBars: number;
		/** Lock the tempo controls (scored run in progress). */
		lockTempo?: boolean;
		/** Lock the count-in chips (any run in progress). */
		lockCountIn?: boolean;
		/** Whether to offer the count-in at all (the free click does not need one). */
		showCountIn?: boolean;
		onBpm: (bpm: number) => void;
		onCountIn: (bars: number) => void;
	}

	let {
		bpm,
		countInBars,
		lockTempo = false,
		lockCountIn = false,
		showCountIn = true,
		onBpm,
		onCountIn
	}: Props = $props();

	function onSlider(e: Event): void {
		onBpm(clampHwTempo(Number((e.currentTarget as HTMLInputElement).value)));
	}
</script>

<div class="flex flex-col gap-4" data-testid="metronome-controls">
	<div class="flex flex-col gap-2">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{t('homework.metronome.tempo')}
		</p>
		<div class="flex flex-wrap items-center gap-4">
			<Button
				type="button"
				variant="ghost"
				aria-label={t('homework.metronome.slower')}
				disabled={lockTempo || bpm <= HW_TEMPO_MIN}
				onclick={() => onBpm(nudgeHwTempo(bpm, -1))}
			>
				−
			</Button>
			<span class="text-body font-mono font-bold" data-testid="metronome-bpm">
				{bpm}
				{t('homework.metronome.unit')}
			</span>
			<Button
				type="button"
				variant="ghost"
				aria-label={t('homework.metronome.faster')}
				disabled={lockTempo || bpm >= HW_TEMPO_MAX}
				onclick={() => onBpm(nudgeHwTempo(bpm, 1))}
			>
				+
			</Button>
			<input
				type="range"
				min={HW_TEMPO_MIN}
				max={HW_TEMPO_MAX}
				step="1"
				value={bpm}
				disabled={lockTempo}
				oninput={onSlider}
				aria-label={t('homework.metronome.slider')}
				data-testid="metronome-slider"
				class="min-w-40 flex-1"
			/>
		</div>
		<div class="flex flex-wrap gap-2" data-testid="metronome-presets">
			{#each HW_TEMPO_PRESETS as preset (preset)}
				<Button
					type="button"
					variant={bpm === preset ? 'primary' : 'ghost'}
					disabled={lockTempo}
					aria-pressed={bpm === preset}
					onclick={() => onBpm(preset)}
				>
					{preset}
				</Button>
			{/each}
		</div>
	</div>

	{#if showCountIn}
		<div class="flex flex-col gap-2">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('homework.metronome.countIn')}
			</p>
			<div class="flex flex-wrap gap-2" data-testid="metronome-countin">
				{#each COUNT_IN_OPTIONS as bars (bars)}
					<Button
						type="button"
						variant={countInBars === bars ? 'primary' : 'ghost'}
						disabled={lockCountIn}
						aria-pressed={countInBars === bars}
						onclick={() => onCountIn(bars)}
					>
						{bars === 0
							? t('homework.metronome.countIn.none')
							: bars === 1
								? t('homework.metronome.countIn.one')
								: t('homework.metronome.countIn.two')}
					</Button>
				{/each}
			</div>
		</div>
	{/if}
</div>
