<script lang="ts">
	import type { ParsedRhythm, RhythmNote } from '$lib/homework/rhythmParse';
	import type { OnsetResult } from '$lib/homework/rhythmScore';

	/**
	 * The written rhythm, engraved from the transcribed data on a one-line
	 * staff (Dandelot writes every rhythm on a single pitch, so pitch carries
	 * nothing). Bars wrap into rows; spacing is proportional to the beat, so
	 * the eye sees the pulse. Draws note heads, stems, flags, dots, ties,
	 * rests, barlines, time signatures and a playhead.
	 *
	 * After a scored run each tapped-for note shows how it went by shape and
	 * colour: perfect (verdigris), good (mustard), missed (vermilion with an
	 * X). Ties are drawn but a tied-on note is never an onset, so it carries
	 * no verdict: nothing is expected there.
	 */
	interface Props {
		parsed: ParsedRhythm;
		/** Scored results, one per onset in order. Omit before a run is scored. */
		results?: OnsetResult[];
		/** The beat (0-based within the played part) the playhead sits on; null for none. */
		playhead?: number | null;
	}

	let { parsed, results, playhead = null }: Props = $props();

	const BEAT_W = 30;
	const SIG_W = 26;
	const PAD = 14;
	const ROW_MAX = 620;
	const ROW_H = 84;
	const LINE_Y = 46;

	interface PlacedMeasure {
		index: number;
		x: number;
		width: number;
		sig: string | null;
		beats: number;
		startBeat: number;
		last: boolean;
	}

	/** Greedy wrap of bars into rows no wider than ROW_MAX (a single bar is never split). */
	const rows = $derived.by(() => {
		const out: PlacedMeasure[][] = [];
		let row: PlacedMeasure[] = [];
		let x = 6;
		parsed.measures.forEach((m, i) => {
			const sig = m.showTimeSignature ? m.timeSignature : null;
			const width = m.beats * BEAT_W + PAD * 2 + (sig || i === 0 ? SIG_W : 0);
			if (row.length > 0 && x + width > ROW_MAX) {
				out.push(row);
				row = [];
				x = 6;
			}
			row.push({
				index: m.index,
				x,
				width,
				sig,
				beats: m.beats,
				startBeat: m.startBeat,
				last: i === parsed.measures.length - 1
			});
			x += width;
		});
		if (row.length > 0) out.push(row);
		return out;
	});

	const measureById = $derived(
		new Map(rows.flat().map((p) => [p.index, p] as const))
	);

	function noteX(n: RhythmNote): number {
		const p = measureById.get(n.measure);
		if (!p) return 0;
		const lead = p.sig ? SIG_W : 0;
		return p.x + lead + PAD + (n.startBeat - p.startBeat) * BEAT_W + 6;
	}

	function rowOf(measureIndex: number): number {
		return rows.findIndex((r) => r.some((p) => p.index === measureIndex));
	}

	const resultByNote = $derived.by(() => {
		const map = new Map<number, OnsetResult>();
		if (!results) return map;
		parsed.onsets.forEach((n, i) => {
			const r = results[i];
			if (r) map.set(n.index, r);
		});
		return map;
	});

	function colorOf(n: RhythmNote): string {
		const r = resultByNote.get(n.index);
		if (!r) return 'var(--color-ink)';
		return r.verdict === 'perfect'
			? 'var(--color-verdigris)'
			: r.verdict === 'good'
				? 'var(--color-mustard)'
				: 'var(--color-vermilion)';
	}

	function stateOf(n: RhythmNote): string {
		return resultByNote.get(n.index)?.verdict ?? (n.isOnset ? 'pending' : 'held');
	}

	function playheadPos(): { row: number; x: number } | null {
		if (playhead === null || playhead < 0) return null;
		const m = parsed.measures.find((mm) => playhead >= mm.startBeat && playhead < mm.startBeat + mm.beats);
		if (!m) return null;
		const p = measureById.get(m.index);
		if (!p) return null;
		const lead = p.sig ? SIG_W : 0;
		return { row: rowOf(m.index), x: p.x + lead + PAD + (playhead - p.startBeat) * BEAT_W + 6 };
	}

	const head = $derived(playheadPos());
	/** Every row shares the widest row's width, so all rows draw at the same scale. */
	const sheetWidth = $derived(
		Math.max(...rows.map((row) => row[row.length - 1].x + row[row.length - 1].width + 6))
	);
	const rowEnd = (row: PlacedMeasure[]) => row[row.length - 1].x + row[row.length - 1].width;

	function digits(sig: string): [string, string] {
		const [a, b] = sig.split('/');
		return [a, b];
	}
</script>

<div class="flex flex-col gap-1" data-testid="rhythm-notation">
	{#each rows as row, r (r)}
		<div class="overflow-x-auto">
			<svg
				viewBox="0 0 {sheetWidth} {ROW_H}"
				style="min-width: {sheetWidth}px; max-width: 100%; height: auto;"
				role="img"
				aria-label="rhythm, row {r + 1}"
				data-testid="rhythm-row-{r}"
			>
				<line
					x1="6"
					x2={rowEnd(row)}
					y1={LINE_Y}
					y2={LINE_Y}
					stroke="var(--color-ink)"
					stroke-width="1.2"
				/>
				{#each row as p (p.index)}
					<line
						x1={p.x + p.width}
						x2={p.x + p.width}
						y1={LINE_Y - 16}
						y2={LINE_Y + 16}
						stroke="var(--color-ink)"
						stroke-width={p.last ? 3 : 1.4}
					/>
					{#if p.sig}
						{@const [top, bottom] = digits(p.sig)}
						<text
							x={p.x + SIG_W / 2 + 4}
							y={LINE_Y - 3}
							text-anchor="middle"
							font-size="20"
							font-weight="700"
							font-family="serif"
							fill="var(--color-ink)">{top}</text
						>
						<text
							x={p.x + SIG_W / 2 + 4}
							y={LINE_Y + 15}
							text-anchor="middle"
							font-size="20"
							font-weight="700"
							font-family="serif"
							fill="var(--color-ink)">{bottom}</text
						>
					{/if}
				{/each}
				{#each parsed.notes.filter((n) => rowOf(n.measure) === r) as n (n.index)}
					{@const cx = noteX(n)}
					{@const color = colorOf(n)}
					{@const verdict = resultByNote.get(n.index)?.verdict}
					<g data-testid="rhythm-note-{n.index}" data-state={stateOf(n)}>
						{#if n.rest}
							{#if n.value === 'w'}
								<rect x={cx - 7} y={LINE_Y} width="14" height="5" fill={color} />
							{:else if n.value === 'h'}
								<rect x={cx - 7} y={LINE_Y - 5} width="14" height="5" fill={color} />
							{:else}
								<path
									d="M {cx - 3} {LINE_Y - 12} l 6 6 l -6 6 l 6 6"
									fill="none"
									stroke={color}
									stroke-width="2.4"
								/>
							{/if}
						{:else}
							<ellipse
								{cx}
								cy={LINE_Y}
								rx="6.4"
								ry="4.7"
								transform="rotate(-20 {cx} {LINE_Y})"
								fill={n.value === 'w' || n.value === 'h' ? 'var(--color-paper)' : color}
								stroke={color}
								stroke-width={n.value === 'w' || n.value === 'h' ? 2 : 1}
							/>
							{#if n.value !== 'w'}
								<line
									x1={cx + 6}
									x2={cx + 6}
									y1={LINE_Y}
									y2={LINE_Y - 30}
									stroke={color}
									stroke-width="1.4"
								/>
							{/if}
							{#if n.value === 'e' || n.value === 's'}
								<path
									d="M {cx + 6} {LINE_Y - 30} q 9 8 5 18"
									fill="none"
									stroke={color}
									stroke-width="1.6"
								/>
							{/if}
						{/if}
						{#if n.dotted}
							<circle cx={cx + 13} cy={LINE_Y - 4} r="1.8" fill={color} />
						{/if}
						{#if n.tiedToNext}
							{@const next = parsed.notes[n.index + 1]}
							{#if next && rowOf(next.measure) === r}
								<path
									d="M {cx + 2} {LINE_Y + 9} Q {(cx + noteX(next)) / 2} {LINE_Y + 24} {noteX(next) - 2} {LINE_Y + 9}"
									fill="none"
									stroke="var(--color-ink)"
									stroke-width="1.4"
								/>
							{:else}
								<path
									d="M {cx + 2} {LINE_Y + 9} Q {cx + 14} {LINE_Y + 20} {cx + 26} {LINE_Y + 9}"
									fill="none"
									stroke="var(--color-ink)"
									stroke-width="1.4"
								/>
							{/if}
						{/if}
						{#if verdict === 'missed'}
							<text
								x={cx}
								y={LINE_Y - 36}
								text-anchor="middle"
								font-size="14"
								font-weight="700"
								fill="var(--color-vermilion)"
								aria-hidden="true">✕</text
							>
						{/if}
					</g>
				{/each}
				{#if head && head.row === r}
					<line
						x1={head.x}
						x2={head.x}
						y1="8"
						y2={ROW_H - 8}
						stroke="var(--color-vermilion)"
						stroke-width="2"
						data-testid="rhythm-playhead"
					/>
				{/if}
			</svg>
		</div>
	{/each}
</div>
