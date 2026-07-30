import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CountingChipRow from './CountingChipRow.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for CountingChipRow (Phase 32 Plan 01 Task 1): the
 * reusable counting-chip primitive (role-tinted tone chips + fill/outline
 * gap chips + a semitone-count legend). Derives everything from
 * stackedThirdsFor(chord) - no hand-rolled interval math in the test either.
 */

const cm7 = spellChord('Cm7');

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('CountingChipRow: tone chips (Cm7)', () => {
	it('renders 4 tone chips with role classes in order and the correct note names', () => {
		render(CountingChipRow, { props: { chord: cm7 } });

		const row = screen.getByTestId('counting-chip-row');
		const toneChips = row.querySelectorAll('.tone-chip');
		expect(toneChips.length).toBe(4);

		const expectedRoles = ['root', 'third', 'fifth', 'seventh'];
		const expectedLetters = ['C', 'E♭', 'G', 'B♭'];
		toneChips.forEach((chip, i) => {
			expect(chip.classList.contains(expectedRoles[i])).toBe(true);
			expect(chip.textContent?.trim()).toBe(expectedLetters[i]);
		});
	});
});

describe('CountingChipRow: gap chips (Cm7 = m3 - M3 - m3)', () => {
	it('renders 3 gap chips with m3/M3/m3 modifier classes in order and +m3/+M3/+m3 text', () => {
		render(CountingChipRow, { props: { chord: cm7 } });

		const row = screen.getByTestId('counting-chip-row');
		const gapChips = row.querySelectorAll('.gap-chip');
		expect(gapChips.length).toBe(3);

		const expectedModifiers = ['m3', 'M3', 'm3'];
		const expectedText = ['+m3', '+M3', '+m3'];
		gapChips.forEach((chip, i) => {
			expect(chip.classList.contains(expectedModifiers[i])).toBe(true);
			expect(chip.textContent?.trim()).toBe(expectedText[i]);
		});
	});
});

describe('CountingChipRow: legend', () => {
	it('shows both gap-to-half-step mappings by default (en)', () => {
		render(CountingChipRow, { props: { chord: cm7 } });

		const legend = screen.getByTestId('chip-legend');
		expect(legend.textContent).toContain('+m3');
		expect(legend.textContent).toContain('3');
		expect(legend.textContent).toContain('half steps');
		expect(legend.textContent).toContain('+M3');
		expect(legend.textContent).toContain('4');
	});

	it('translates the half steps word to demi-tons under fr, immune tokens unchanged', () => {
		setLocale('fr');
		render(CountingChipRow, { props: { chord: cm7 } });

		const legend = screen.getByTestId('chip-legend');
		expect(legend.textContent).toContain('demi-tons');
		expect(legend.textContent).toContain('+m3');
		expect(legend.textContent).toContain('+M3');
		expect(legend.textContent).toContain('3');
		expect(legend.textContent).toContain('4');
	});

	it('renders no legend when showLegend is false', () => {
		render(CountingChipRow, { props: { chord: cm7, showLegend: false } });

		expect(screen.queryByTestId('chip-legend')).not.toBeInTheDocument();
	});

	it('renders a third legend entry explaining non-third gaps (en)', () => {
		render(CountingChipRow, { props: { chord: cm7 } });

		const legend = screen.getByTestId('chip-legend');
		const entries = legend.querySelectorAll('.chip-legend__entry');
		expect(entries.length).toBe(3);
		expect(entries[2].textContent).toContain('other gaps show their own interval');
	});

	it('renders the third legend entry in French under fr, immune tokens unchanged', () => {
		setLocale('fr');
		render(CountingChipRow, { props: { chord: cm7 } });

		const legend = screen.getByTestId('chip-legend');
		const entries = legend.querySelectorAll('.chip-legend__entry');
		expect(entries.length).toBe(3);
		expect(entries[2].textContent).toContain(
			'les autres écarts affichent leur propre intervalle'
		);
	});
});

describe('CountingChipRow: unrecognized chord safety', () => {
	it('renders the row with zero tone chips and zero gap chips, does not throw', () => {
		const unrecognized = spellChord('NotAChord');

		expect(() => render(CountingChipRow, { props: { chord: unrecognized } })).not.toThrow();

		const row = screen.getByTestId('counting-chip-row');
		expect(row.querySelectorAll('.tone-chip').length).toBe(0);
		expect(row.querySelectorAll('.gap-chip').length).toBe(0);
	});
});

/** The seven IntervalRole values (theory/types.ts) - the authoritative role set every tone chip must be tinted by (WR-01). */
const ALL_ROLES = ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];

describe('CountingChipRow: full role coverage on real non-tertian drill-pool chords (WR-01)', () => {
	/**
	 * The name-it drill pool (tiers.ts tiers 5-6) includes non-tertian
	 * qualities whose tones carry second/fourth/sixth roles. Before this fix
	 * those roles rendered as bare untinted chips (no matching CSS rule) -
	 * exactly the "illegible grey" state SHAPE-01 exists to kill. Every
	 * tone chip must carry one of the seven IntervalRole classes, and the
	 * new second/fourth/sixth rules must specifically be exercised.
	 */
	it('tints every tone chip for Csus4 (root/fourth/fifth), including the new .fourth role', () => {
		const csus4 = spellChord('Csus4');
		render(CountingChipRow, { props: { chord: csus4 } });

		const row = screen.getByTestId('counting-chip-row');
		const toneChips = row.querySelectorAll('.tone-chip');
		expect(toneChips.length).toBe(3);
		toneChips.forEach((chip) => {
			expect(ALL_ROLES.some((role) => chip.classList.contains(role))).toBe(true);
		});
		expect(row.querySelector('.tone-chip.fourth')).not.toBeNull();
	});

	it('tints every tone chip for C6 (root/third/fifth/sixth), including the new .sixth role', () => {
		const c6 = spellChord('C6');
		render(CountingChipRow, { props: { chord: c6 } });

		const row = screen.getByTestId('counting-chip-row');
		const toneChips = row.querySelectorAll('.tone-chip');
		expect(toneChips.length).toBe(4);
		toneChips.forEach((chip) => {
			expect(ALL_ROLES.some((role) => chip.classList.contains(role))).toBe(true);
		});
		expect(row.querySelector('.tone-chip.sixth')).not.toBeNull();
	});

	it('tints every tone chip for Cmaj9 (root/third/fifth/seventh/second), including the new .second role', () => {
		const cmaj9 = spellChord('Cmaj9');
		render(CountingChipRow, { props: { chord: cmaj9 } });

		const row = screen.getByTestId('counting-chip-row');
		const toneChips = row.querySelectorAll('.tone-chip');
		expect(toneChips.length).toBe(5);
		toneChips.forEach((chip) => {
			expect(ALL_ROLES.some((role) => chip.classList.contains(role))).toBe(true);
		});
		expect(row.querySelector('.tone-chip.second')).not.toBeNull();
	});
});

describe('CountingChipRow: neutral non-third gap on a real chord (WR-02)', () => {
	/**
	 * Non-third gaps DO occur in production - Csus4's own stackedThirdsFor
	 * gaps are +P4/+M2 (verified via spellChord + stackedThirdsFor), not a
	 * synthetic/unreachable fixture. This replaces the prior false "non-third
	 * gap never occurs" invariant test with real drill-pool data.
	 */
	it('renders Csus4 non-third gaps (+P4, +M2) with the neutral modifier, no m3/M3, real label + longFr tooltip', () => {
		const csus4 = spellChord('Csus4');
		render(CountingChipRow, { props: { chord: csus4 } });

		const row = screen.getByTestId('counting-chip-row');
		const gapChips = row.querySelectorAll('.gap-chip');
		expect(gapChips.length).toBe(2);

		const expectedText = ['+P4', '+M2'];
		gapChips.forEach((chip, i) => {
			expect(chip.classList.contains('other')).toBe(true);
			expect(chip.classList.contains('m3')).toBe(false);
			expect(chip.classList.contains('M3')).toBe(false);
			expect(chip.textContent?.trim()).toBe(expectedText[i]);
			expect(chip.getAttribute('title')).toBeTruthy();
		});
	});
});

describe('CountingChipRow: rotateFromRole (Phase 35, INV-02)', () => {
	it('renders byte-identical to today when rotateFromRole is omitted', () => {
		const { container: withProp } = render(CountingChipRow, {
			props: { chord: cm7, rotateFromRole: undefined }
		});
		const withPropHtml = withProp.innerHTML;
		cleanup();
		const { container: without } = render(CountingChipRow, { props: { chord: cm7 } });
		expect(without.innerHTML).toBe(withPropHtml);
	});

	it('reorders tone chips to start at the requested role, keeping role tint classes fixed', () => {
		render(CountingChipRow, { props: { chord: cm7, rotateFromRole: 'fifth' } });

		const row = screen.getByTestId('counting-chip-row');
		const toneChips = row.querySelectorAll('.tone-chip');
		expect(toneChips.length).toBe(4);

		const expectedRoles = ['fifth', 'seventh', 'root', 'third'];
		const expectedLetters = ['G', 'B♭', 'C', 'E♭'];
		toneChips.forEach((chip, i) => {
			expect(chip.classList.contains(expectedRoles[i])).toBe(true);
			expect(chip.textContent?.trim()).toBe(expectedLetters[i]);
		});
	});

	it('surfaces the rotated non-third gap through the existing neutral "other" state', () => {
		render(CountingChipRow, { props: { chord: cm7, rotateFromRole: 'fifth' } });

		const row = screen.getByTestId('counting-chip-row');
		const gapChips = row.querySelectorAll('.gap-chip');
		expect(gapChips.length).toBe(3);
		// Rotated order G -> Bb -> C -> Eb: m3, M2 (non-third, "other"), m3.
		expect(gapChips[1].classList.contains('other')).toBe(true);
		expect(gapChips[1].textContent?.trim()).toBe('+M2');
	});
});
