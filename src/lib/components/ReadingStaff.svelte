<script lang="ts">
	import { ledgerPositions, staffPosition, stemUp, type Clef, type StaffNote } from '$lib/homework/notation';
	import type { ReadingVerdict } from '$lib/homework/readingSession';

	/**
	 * The engraved staff for a note-reading exercise: one SVG per printed
	 * line, drawn from the transcribed data (never from a scan). Treble or
	 * bass clef, ledger lines, half and quarter note heads with stems.
	 *
	 * State is shown by shape as well as colour: the current note carries a
	 * ring, a right note is verdigris, a wrong one is vermilion with an X
	 * above it, so nothing relies on hue alone.
	 */
	interface Props {
		clef: Clef;
		/** One array of notes per printed line. */
		lines: StaffNote[][];
		/** Global index of the note waiting for an answer; -1 for none. */
		current?: number;
		/** Verdict per global note index, for notes already answered. */
		verdicts?: Record<number, ReadingVerdict>;
	}

	let { clef, lines, current = -1, verdicts = {} }: Props = $props();

	const GAP = 10;
	const STEP_X = 36;
	const LEFT = 62;
	const TOP = 52;
	const STAFF_H = GAP * 4;
	const HEIGHT = TOP + STAFF_H + 52;

	/** Y of a staff position (0 = bottom line). */
	function yOf(pos: number): number {
		return TOP + STAFF_H - (pos * GAP) / 2;
	}

	function xOf(column: number): number {
		return LEFT + column * STEP_X + STEP_X / 2;
	}

	/** Global index of the first note of each line. */
	const offsets = $derived(
		lines.reduce<number[]>((acc, _l, i) => {
			acc.push(i === 0 ? 0 : acc[i - 1] + lines[i - 1].length);
			return acc;
		}, [])
	);

	let root: HTMLDivElement | undefined = $state();

	// On a phone the staff is wider than the screen and scrolls sideways: keep the
	// note being asked about in view. (scrollIntoView is absent in some test DOMs.)
	$effect(() => {
		if (current < 0 || !root) return;
		const el = root.querySelector(`[data-testid="reading-note-${current}"]`);
		(el as SVGGElement | null)?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
	});

	function stateOf(globalIndex: number): string {
		const v = verdicts[globalIndex];
		if (v) return v;
		return globalIndex === current ? 'current' : 'pending';
	}
</script>

<div class="flex flex-col gap-3" data-testid="reading-staff" data-clef={clef} bind:this={root}>
	{#each lines as line, lineIndex (lineIndex)}
		<div class="overflow-x-auto">
			<svg
				viewBox="0 0 {LEFT + line.length * STEP_X + 24} {HEIGHT}"
				style="min-width: {LEFT + line.length * STEP_X + 24}px; max-width: 100%; height: auto;"
				role="img"
				aria-label="{clef} clef, line {lineIndex + 1}"
				data-testid="reading-line-{lineIndex}"
			>
				{#each [0, 2, 4, 6, 8] as pos (pos)}
					<line
						x1="4"
						x2={LEFT + line.length * STEP_X + 16}
						y1={yOf(pos)}
						y2={yOf(pos)}
						stroke="var(--color-ink)"
						stroke-width="1.2"
					/>
				{/each}
				<line
					x1="4"
					x2="4"
					y1={yOf(0)}
					y2={yOf(8)}
					stroke="var(--color-ink)"
					stroke-width="1.6"
				/>
				<line
					x1={LEFT + line.length * STEP_X + 16}
					x2={LEFT + line.length * STEP_X + 16}
					y1={yOf(0)}
					y2={yOf(8)}
					stroke="var(--color-ink)"
					stroke-width="3"
				/>
				<text
					x="14"
					y={clef === 'treble' ? yOf(0) + 8 : yOf(8) + 17}
					font-size={clef === 'treble' ? 62 : 46}
					fill="var(--color-ink)"
					font-family="'Noto Music', 'Apple Symbols', 'Segoe UI Symbol', serif"
					aria-hidden="true">{clef === 'treble' ? '\u{1D11E}' : '\u{1D122}'}</text
				>
				{#each line as note, column (column)}
					{@const g = offsets[lineIndex] + column}
					{@const pos = staffPosition(note, clef)}
					{@const cx = xOf(column)}
					{@const cy = yOf(pos)}
					{@const up = stemUp(pos)}
					{@const state = stateOf(g)}
					<g
						data-testid="reading-note-{g}"
						data-state={state}
						data-note={note.letter + note.accidental + note.octave}
					>
						{#each ledgerPositions(pos) as lp (lp)}
							<line
								x1={cx - 11}
								x2={cx + 11}
								y1={yOf(lp)}
								y2={yOf(lp)}
								stroke="var(--color-ink)"
								stroke-width="1.2"
							/>
						{/each}
						{#if state === 'current'}
							<circle
								{cx}
								{cy}
								r="12"
								fill="none"
								stroke="var(--color-vermilion)"
								stroke-width="2.4"
							/>
						{/if}
						<ellipse
							{cx}
							{cy}
							rx="6.4"
							ry="4.7"
							transform="rotate(-20 {cx} {cy})"
							fill={note.duration === 'h' || note.duration === 'w'
								? 'var(--color-paper)'
								: state === 'correct'
									? 'var(--color-verdigris)'
									: state === 'wrong' || state === 'wrong-octave'
										? 'var(--color-vermilion)'
										: 'var(--color-ink)'}
							stroke={state === 'correct'
								? 'var(--color-verdigris)'
								: state === 'wrong' || state === 'wrong-octave'
									? 'var(--color-vermilion)'
									: 'var(--color-ink)'}
							stroke-width={note.duration === 'q' ? 1 : 2}
						/>
						{#if note.duration !== 'w'}
							<line
								x1={up ? cx + 6 : cx - 6}
								x2={up ? cx + 6 : cx - 6}
								y1={cy}
								y2={up ? cy - 31 : cy + 31}
								stroke={state === 'correct'
									? 'var(--color-verdigris)'
									: state === 'wrong' || state === 'wrong-octave'
										? 'var(--color-vermilion)'
										: 'var(--color-ink)'}
								stroke-width="1.4"
							/>
						{/if}
						{#if state === 'wrong' || state === 'wrong-octave'}
							<text
								x={cx}
								y={TOP - 14}
								text-anchor="middle"
								font-size="14"
								font-weight="700"
								fill="var(--color-vermilion)"
								aria-hidden="true">✕</text
							>
						{/if}
					</g>
				{/each}
			</svg>
		</div>
	{/each}
</div>
