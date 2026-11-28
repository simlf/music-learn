import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ReadingStaff from './ReadingStaff.svelte';
import RhythmNotation from './RhythmNotation.svelte';
import { parseStaffLine } from '$lib/homework/notation';
import { parseRhythm } from '$lib/homework/rhythmParse';
import { scoreRhythm } from '$lib/homework/rhythmScore';

afterEach(cleanup);

describe('ReadingStaff', () => {
	const lines = [parseStaffLine('C4h G4q B3q'), parseStaffLine('A5q F5h')];

	it('draws five staff lines per printed line', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		const line0 = screen.getByTestId('reading-line-0');
		// 5 staff lines + 2 barlines + ledgers + stems: staff lines are the long horizontals.
		const long = [...line0.querySelectorAll('line')].filter(
			(l) => l.getAttribute('y1') === l.getAttribute('y2') && l.getAttribute('x1') === '4'
		);
		expect(long).toHaveLength(5);
	});

	it('adds ledger lines under middle C and over A5', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		const ledgers = (testId: string) =>
			[...screen.getByTestId(testId).querySelectorAll('line')].filter(
				(l) => l.getAttribute('y1') === l.getAttribute('y2')
			).length;
		expect(ledgers('reading-note-0')).toBe(1); // C4: one ledger
		expect(ledgers('reading-note-2')).toBe(1); // B3: the same ledger line stack (C4's line)
		expect(ledgers('reading-note-1')).toBe(0); // G4 on the staff
		expect(ledgers('reading-note-3')).toBe(1); // A5: one ledger above
		expect(ledgers('reading-note-4')).toBe(0); // F5 on the top line
	});

	it('fills quarter heads and hollows half heads', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		const fill = (id: string) => screen.getByTestId(id).querySelector('ellipse')!.getAttribute('fill');
		expect(fill('reading-note-0')).toBe('var(--color-paper)'); // half
		expect(fill('reading-note-1')).toBe('var(--color-ink)'); // quarter
	});

	it('places a higher note higher on the page', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		const cy = (id: string) => Number(screen.getByTestId(id).querySelector('ellipse')!.getAttribute('cy'));
		expect(cy('reading-note-1')).toBeLessThan(cy('reading-note-0')); // G4 above C4
		expect(cy('reading-note-3')).toBeLessThan(cy('reading-note-1')); // A5 above G4
	});

	it('flips stems: up below the middle line, down above it', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		const stem = (id: string) => {
			const s = [...screen.getByTestId(id).querySelectorAll('line')].find(
				(l) => l.getAttribute('y1') !== l.getAttribute('y2')
			)!;
			return Number(s.getAttribute('y2')) < Number(s.getAttribute('y1')) ? 'up' : 'down';
		};
		expect(stem('reading-note-0')).toBe('up'); // C4
		expect(stem('reading-note-3')).toBe('down'); // A5
	});

	it('marks the current note with a ring and answered notes by verdict', () => {
		render(ReadingStaff, {
			clef: 'treble',
			lines,
			current: 2,
			verdicts: { 0: 'correct', 1: 'wrong' }
		});
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');
		expect(screen.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'wrong');
		expect(screen.getByTestId('reading-note-2')).toHaveAttribute('data-state', 'current');
		expect(screen.getByTestId('reading-note-3')).toHaveAttribute('data-state', 'pending');
		expect(screen.getByTestId('reading-note-2').querySelector('circle')).not.toBeNull();
		expect(screen.getByTestId('reading-note-1').textContent).toContain('✕');
		expect(screen.getByTestId('reading-note-0').textContent).not.toContain('✕');
	});

	it('numbers notes globally across printed lines', () => {
		render(ReadingStaff, { clef: 'treble', lines });
		expect(screen.getByTestId('reading-note-3')).toHaveAttribute('data-note', 'A5');
	});

	it('uses the bass clef geometry: C4 is a ledger line above the staff', () => {
		render(ReadingStaff, { clef: 'bass', lines: [parseStaffLine('C4q F3q')] });
		const ledgers = [...screen.getByTestId('reading-note-0').querySelectorAll('line')].filter(
			(l) => l.getAttribute('y1') === l.getAttribute('y2')
		);
		expect(ledgers).toHaveLength(1);
		const cy = (id: string) => Number(screen.getByTestId(id).querySelector('ellipse')!.getAttribute('cy'));
		expect(cy('reading-note-0')).toBeLessThan(cy('reading-note-1'));
	});
});

describe('RhythmNotation', () => {
	it('draws one note per written note and states each onset as pending', () => {
		const parsed = parseRhythm('4/4', ['q q h', 'w']);
		render(RhythmNotation, { parsed });
		for (let i = 0; i < 4; i++) {
			expect(screen.getByTestId(`rhythm-note-${i}`)).toHaveAttribute('data-state', 'pending');
		}
	});

	it('shows the time signature once, and again where it changes', () => {
		const parsed = parseRhythm('2/4', ['q q', 'h', '@3/4 q q q']);
		render(RhythmNotation, { parsed });
		const texts = [...screen.getByTestId('rhythm-notation').querySelectorAll('text')].map((t) => t.textContent);
		expect(texts.filter((t) => t === '2')).toHaveLength(1);
		expect(texts.filter((t) => t === '3')).toHaveLength(1);
		expect(texts.filter((t) => t === '4')).toHaveLength(2);
	});

	it('draws a tie arc for a tied note and none for a plain one', () => {
		const parsed = parseRhythm('2/4', ['q q~', 'q q']);
		render(RhythmNotation, { parsed });
		const paths = (i: number) => screen.getByTestId(`rhythm-note-${i}`).querySelectorAll('path').length;
		expect(paths(1)).toBe(1);
		expect(paths(0)).toBe(0);
	});

	it('marks the held note as held, not pending', () => {
		const parsed = parseRhythm('2/4', ['q q~', 'q q']);
		render(RhythmNotation, { parsed });
		expect(screen.getByTestId('rhythm-note-2')).toHaveAttribute('data-state', 'held');
	});

	it('hollows half and whole notes and fills quarters', () => {
		const parsed = parseRhythm('4/4', ['h q q', 'w']);
		render(RhythmNotation, { parsed });
		const fill = (i: number) => screen.getByTestId(`rhythm-note-${i}`).querySelector('ellipse')!.getAttribute('fill');
		expect(fill(0)).toBe('var(--color-paper)');
		expect(fill(1)).not.toBe('var(--color-paper)');
		expect(fill(3)).toBe('var(--color-paper)');
		expect(screen.getByTestId('rhythm-note-3').querySelectorAll('line')).toHaveLength(0); // no stem on a whole
	});

	it('draws a dot for a dotted note', () => {
		const parsed = parseRhythm('3/4', ['h.']);
		render(RhythmNotation, { parsed });
		expect(screen.getByTestId('rhythm-note-0').querySelector('circle')).not.toBeNull();
	});

	it('wraps a long exercise into several rows', () => {
		const parsed = parseRhythm('4/4', Array.from({ length: 8 }, () => 'q q q q'));
		render(RhythmNotation, { parsed });
		expect(screen.getByTestId('rhythm-row-0')).toBeInTheDocument();
		expect(screen.getByTestId('rhythm-row-1')).toBeInTheDocument();
	});

	it('keeps a short exercise on one row', () => {
		const parsed = parseRhythm('2/4', ['q q', 'h']);
		render(RhythmNotation, { parsed });
		expect(screen.queryByTestId('rhythm-row-1')).toBeNull();
	});

	it('shows verdicts on onsets after scoring and an X on a miss', () => {
		const parsed = parseRhythm('4/4', ['q q q q']);
		const score = scoreRhythm([0, 500, 1000, 1500], [0, 560, 1500], 120);
		render(RhythmNotation, { parsed, results: score.results });
		expect(screen.getByTestId('rhythm-note-0')).toHaveAttribute('data-state', 'perfect');
		expect(screen.getByTestId('rhythm-note-1')).toHaveAttribute('data-state', 'good');
		expect(screen.getByTestId('rhythm-note-2')).toHaveAttribute('data-state', 'missed');
		expect(screen.getByTestId('rhythm-note-2').textContent).toContain('✕');
		expect(screen.getByTestId('rhythm-note-3')).toHaveAttribute('data-state', 'perfect');
	});

	it('puts the playhead on the beat and removes it when there is none', () => {
		const parsed = parseRhythm('4/4', ['q q q q']);
		const { rerender } = render(RhythmNotation, { parsed, playhead: 2 });
		const x = (n: Element) => Number(n.getAttribute('x1'));
		const at2 = x(screen.getByTestId('rhythm-playhead'));
		rerender({ parsed, playhead: 3 });
		expect(x(screen.getByTestId('rhythm-playhead'))).toBeGreaterThan(at2);
		rerender({ parsed, playhead: null });
		expect(screen.queryByTestId('rhythm-playhead')).toBeNull();
	});

	it('draws rests without making them tappable', () => {
		const parsed = parseRhythm('4/4', ['q rq rh']);
		render(RhythmNotation, { parsed });
		expect(screen.getByTestId('rhythm-note-1')).toHaveAttribute('data-state', 'held');
		expect(screen.getByTestId('rhythm-note-1').querySelector('ellipse')).toBeNull();
	});
});
