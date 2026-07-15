<script lang="ts">
	import { ROOTS, QUALITY_SUFFIXES } from '$lib/theory/randomChord';
	import { MAJOR_SCALE_ROOTS } from '$lib/theory/scale';
	import { createChordConstruction, createScaleConstruction } from '$lib/practice/construction';
	import type { ConstructionState } from '$lib/practice/construction';
	import Button from './Button.svelte';

	/**
	 * Build It (BUILD-01/02/03): drives the picker (kind toggle, root/quality
	 * chord chips or tonic scale chips) and, once a full target is picked, the
	 * construction session itself. Self-contained, no props - owns
	 * sessionState/kind/pickedRoot/pickedQuality/pickedTonic/construction for
	 * the whole /build flow.
	 *
	 * Task 1 scope: the picker only. `sessionState !== 'picking'` renders a
	 * minimal placeholder for now; Task 2 replaces that branch with the full
	 * step loop (register/step/WHY, keyboard wiring, both feedback branches,
	 * the running formula strip, and the ~650ms pacing).
	 */

	type SessionState = 'picking' | 'building' | 'complete';
	type Kind = 'chords' | 'scales';

	let sessionState = $state<SessionState>('picking');
	let kind = $state<Kind>('chords');
	let pickedRoot = $state<string | undefined>();
	let pickedQuality = $state<string | undefined>();
	let pickedTonic = $state<string | undefined>();
	let construction = $state<ConstructionState | undefined>();

	/** Friendly quality names, in QUALITY_SUFFIXES' exact order (fixed mapping, see 12-04-PLAN.md). */
	const QUALITY_LABELS: Record<string, string> = {
		'': 'major',
		m: 'minor',
		dim: 'diminished',
		maj7: 'major 7th',
		m7: 'minor 7th',
		'7': 'dominant 7th',
		m7b5: 'half-diminished',
		dim7: 'diminished 7th'
	};

	/** Zips ROOTS (the ASCII value used to build the chord symbol) with MAJOR_SCALE_ROOTS (the glyph chip label) by index - both arrays share the same 12-root order. */
	const ROOT_CHIPS = ROOTS.map((ascii, i) => ({ ascii, label: MAJOR_SCALE_ROOTS[i] }));
	const QUALITY_CHIPS = QUALITY_SUFFIXES.map((suffix) => ({ suffix, label: QUALITY_LABELS[suffix] }));

	function resetPicker() {
		pickedRoot = undefined;
		pickedQuality = undefined;
		pickedTonic = undefined;
		construction = undefined;
		sessionState = 'picking';
	}

	function setKind(next: Kind) {
		if (next === kind) return;
		kind = next;
		resetPicker();
	}

	function startChordConstruction() {
		if (pickedRoot === undefined || pickedQuality === undefined) return;
		construction = createChordConstruction(`${pickedRoot}${pickedQuality}`);
		sessionState = 'building';
	}

	function startScaleConstruction() {
		if (pickedTonic === undefined) return;
		construction = createScaleConstruction(pickedTonic);
		sessionState = 'building';
	}

	function pickRoot(ascii: string) {
		pickedRoot = ascii;
		if (pickedQuality !== undefined) startChordConstruction();
	}

	function pickQuality(suffix: string) {
		pickedQuality = suffix;
		if (pickedRoot !== undefined) startChordConstruction();
	}

	function pickTonic(root: string) {
		pickedTonic = root;
		startScaleConstruction();
	}
</script>

<div class="build-session" data-testid="build-session">
	<div class="flex gap-2" data-testid="kind-toggle" role="group" aria-label="Build kind">
		<Button
			type="button"
			variant={kind === 'chords' ? 'primary' : 'ghost'}
			aria-pressed={kind === 'chords'}
			onclick={() => setKind('chords')}
		>
			Chords
		</Button>
		<Button
			type="button"
			variant={kind === 'scales' ? 'primary' : 'ghost'}
			aria-pressed={kind === 'scales'}
			onclick={() => setKind('scales')}
		>
			Scales
		</Button>
	</div>

	{#if sessionState === 'picking'}
		<div class="mt-8" data-testid="picker">
			{#if kind === 'chords'}
				<p class="text-label font-mono uppercase">Root</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="root-row">
					{#each ROOT_CHIPS as chip (chip.ascii)}
						<Button
							type="button"
							variant={pickedRoot === chip.ascii ? 'primary' : 'ghost'}
							aria-pressed={pickedRoot === chip.ascii}
							onclick={() => pickRoot(chip.ascii)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>

				<p class="text-label mt-4 font-mono uppercase">Quality</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="quality-row">
					{#each QUALITY_CHIPS as chip (chip.suffix)}
						<Button
							type="button"
							variant={pickedQuality === chip.suffix ? 'primary' : 'ghost'}
							aria-pressed={pickedQuality === chip.suffix}
							onclick={() => pickQuality(chip.suffix)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			{:else}
				<p class="text-label font-mono uppercase">Tonic</p>
				<div class="mt-2 flex flex-wrap gap-2" data-testid="tonic-row">
					{#each MAJOR_SCALE_ROOTS as root (root)}
						<Button
							type="button"
							variant={pickedTonic === root ? 'primary' : 'ghost'}
							aria-pressed={pickedTonic === root}
							onclick={() => pickTonic(root)}
						>
							{root} major
						</Button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-body mt-8" data-testid="build-placeholder">Building {construction?.label}...</p>
	{/if}
</div>
