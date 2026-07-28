import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IntervalView from './IntervalView.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

const cm7 = spellChord('Cm7');

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('IntervalView default (stacked-thirds) render (IVW-01)', () => {
	it('outer wrapper is data-view=stacked, stacked content present, formula content absent', () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		expect(view.getAttribute('data-view')).toBe('stacked');
		expect(within(view).getByTestId('interval-stacked')).toBeInTheDocument();
		expect(within(view).queryByTestId('interval-formula')).not.toBeInTheDocument();
	});

	it('renders tone chip labels root/m3/P5/m7 (first chip the word root, not R) and three neutral gap markers', () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const stacked = within(view).getByTestId('interval-stacked');

		expect(within(stacked).getByText('root')).toBeInTheDocument();
		expect(within(stacked).queryByText('R')).not.toBeInTheDocument();
		expect(within(stacked).getByText('m3')).toBeInTheDocument();
		expect(within(stacked).getByText('P5')).toBeInTheDocument();
		expect(within(stacked).getByText('m7')).toBeInTheDocument();

		expect(within(stacked).getByText('+M3')).toBeInTheDocument();
		// two '+m3' gap markers exist (root->3rd and 5th->7th)
		expect(within(stacked).getAllByText('+m3').length).toBe(2);
	});

	it('gap markers are not buttons: role=button returns only tone taps + toggle segments, never a gap marker', () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const buttons = within(view).getAllByRole('button');
		// 4 tone taps (root, m3, P5, m7) + 2 toggle segments (Stacked, Formula)
		expect(buttons.length).toBe(6);

		const stacked = within(view).getByTestId('interval-stacked');
		const gapMarkers = stacked.querySelectorAll('[aria-hidden="true"]');
		expect(gapMarkers.length).toBe(3);
		for (const marker of gapMarkers) {
			expect(marker.tagName).not.toBe('BUTTON');
		}
	});
});

describe('IntervalView formula toggle (IVW-02)', () => {
	it('clicking the Formula segment switches to data-view=formula, byte-identical to today (first chip R, no gap markers)', async () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const formulaSegment = within(view).getByLabelText('Formula view');
		await fireEvent.click(formulaSegment);

		expect(view.getAttribute('data-view')).toBe('formula');
		const formula = within(view).getByTestId('interval-formula');
		expect(within(view).queryByTestId('interval-stacked')).not.toBeInTheDocument();

		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).queryByText('root')).not.toBeInTheDocument();
		expect(within(formula).queryByText('+m3')).not.toBeInTheDocument();
		expect(within(formula).queryByText('+M3')).not.toBeInTheDocument();
	});
});

describe('IntervalView inspect passthrough', () => {
	it('clicking a tone tap (both modes) calls onInspectTone once with the matching FormulaEntry', async () => {
		const onInspectTone = vi.fn();
		render(IntervalView, { chord: cm7, onInspectTone });

		const view = screen.getByTestId('interval-view');
		const rootTap = within(view).getByRole('button', { name: 'Inspect C' });
		await fireEvent.click(rootTap);

		expect(onInspectTone).toHaveBeenCalledTimes(1);
		expect(onInspectTone.mock.calls[0][0].letter).toBe('C');

		const formulaSegment = within(view).getByLabelText('Formula view');
		await fireEvent.click(formulaSegment);
		const rootTapFormula = within(view).getByRole('button', { name: 'Inspect C' });
		await fireEvent.click(rootTapFormula);
		expect(onInspectTone).toHaveBeenCalledTimes(2);
		expect(onInspectTone.mock.calls[1][0].letter).toBe('C');
	});

	it('is inert when onInspectTone is omitted: no button.formula-tap for tones, chips still render', () => {
		render(IntervalView, { chord: cm7 });

		const view = screen.getByTestId('interval-view');
		// Only the 2 toggle segments should be buttons; no tone taps.
		const buttons = within(view).getAllByRole('button');
		expect(buttons.length).toBe(2);
		expect(view.querySelector('button.formula-tap')).not.toBeInTheDocument();

		const stacked = within(view).getByTestId('interval-stacked');
		expect(within(stacked).getByText('root')).toBeInTheDocument();
		expect(within(stacked).getByText('m3')).toBeInTheDocument();
	});
});

describe('IntervalView dual naming + accidental carry-through (IVW-03)', () => {
	it('the E flat third column shows letter E flat and solfege Mi flat in both views', async () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		expect(within(view).getByText('E♭')).toBeInTheDocument();
		expect(within(view).getByText('Mi♭')).toBeInTheDocument();

		const formulaSegment = within(view).getByLabelText('Formula view');
		await fireEvent.click(formulaSegment);
		expect(within(view).getByText('E♭')).toBeInTheDocument();
		expect(within(view).getByText('Mi♭')).toBeInTheDocument();
	});
});

describe('IntervalView stacked root-label i18n (WR-01)', () => {
	it('the stacked-view root chip flips to "fondamentale" under fr and back to "root" under en', () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const stacked = within(view).getByTestId('interval-stacked');
		expect(within(stacked).getByText('root')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		expect(within(stacked).getByText('fondamentale')).toBeInTheDocument();
		expect(within(stacked).queryByText('root')).not.toBeInTheDocument();

		flushSync(() => setLocale('en'));
		expect(within(stacked).getByText('root')).toBeInTheDocument();
	});
});

describe('IntervalView toggle i18n + chrome (IVW-02)', () => {
	it('default en toggle labels are Stacked/Formula; fr flips to Empile/Formule and the group aria-label to Vue des intervalles', () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const toggle = within(view).getByTestId('interval-view-toggle');
		expect(within(toggle).getByText('Stacked')).toBeInTheDocument();
		expect(within(toggle).getByText('Formula')).toBeInTheDocument();
		expect(toggle.getAttribute('aria-label')).toBe('Interval view');

		flushSync(() => setLocale('fr'));

		expect(within(toggle).getByText('Empilé')).toBeInTheDocument();
		expect(within(toggle).getByText('Formule')).toBeInTheDocument();
		expect(toggle.getAttribute('aria-label')).toBe('Vue des intervalles');
	});

	it('the active segment has aria-pressed=true and primary variant; inactive is ghost', async () => {
		render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const stackedSegment = within(view).getByLabelText('Stacked-thirds view');
		const formulaSegment = within(view).getByLabelText('Formula view');

		expect(stackedSegment.getAttribute('aria-pressed')).toBe('true');
		expect(stackedSegment.className).toContain('ps-button--primary');
		expect(formulaSegment.getAttribute('aria-pressed')).toBe('false');
		expect(formulaSegment.className).toContain('ps-button--ghost');

		await fireEvent.click(formulaSegment);

		expect(formulaSegment.getAttribute('aria-pressed')).toBe('true');
		expect(formulaSegment.className).toContain('ps-button--primary');
		expect(stackedSegment.getAttribute('aria-pressed')).toBe('false');
		expect(stackedSegment.className).toContain('ps-button--ghost');
	});
});

/**
 * BUG PIN (music-theory audit, Bug A) at the RENDER level: this is the
 * component that draws the lookup page's formula/stacked rows, so the wrong
 * degree was on screen, not just in a pure function. C9's D used to render as
 * a chip labelled "M2" (a major SECOND) instead of "M9".
 */
describe('IntervalView renders compound degrees (music-theory audit Bug A)', () => {
	it('C9 renders an M9 chip, never M2, in both the stacked and formula views', async () => {
		render(IntervalView, { chord: spellChord('C9'), onInspectTone: vi.fn() });

		const view = screen.getByTestId('interval-view');
		const stacked = within(view).getByTestId('interval-stacked');
		expect(within(stacked).getByText('M9')).toBeInTheDocument();
		expect(within(stacked).queryByText('M2')).not.toBeInTheDocument();

		await fireEvent.click(within(view).getByLabelText('Formula view'));

		const formula = within(view).getByTestId('interval-formula');
		expect(within(formula).getByText('M9')).toBeInTheDocument();
		expect(within(formula).queryByText('M2')).not.toBeInTheDocument();
	});

	it('C13 renders M9 + M13 chips, never M2 + M6', () => {
		render(IntervalView, { chord: spellChord('C13'), onInspectTone: vi.fn() });

		const stacked = within(screen.getByTestId('interval-view')).getByTestId('interval-stacked');
		expect(within(stacked).getByText('M9')).toBeInTheDocument();
		expect(within(stacked).getByText('M13')).toBeInTheDocument();
		expect(within(stacked).queryByText('M2')).not.toBeInTheDocument();
		expect(within(stacked).queryByText('M6')).not.toBeInTheDocument();
	});

	it('C7#11 renders an A11 chip, never A4, and its tooltip names the 11th in French', () => {
		render(IntervalView, { chord: spellChord('C7#11'), onInspectTone: vi.fn() });

		const stacked = within(screen.getByTestId('interval-view')).getByTestId('interval-stacked');
		const chip = within(stacked).getByText('A11');
		expect(chip).toBeInTheDocument();
		expect(chip.getAttribute('title')).toBe('onzième augmentée');
		expect(within(stacked).queryByText('A4')).not.toBeInTheDocument();
	});
});

/**
 * BUG PIN (music-theory audit, Bug D) at the RENDER level: this view is
 * labelled "Stacked-thirds view" and drew every gap in the same muted weight,
 * so C13's +P5 (it has no 11th) looked exactly like one of its thirds.
 */
describe('IntervalView marks non-third gaps (music-theory audit Bug D)', () => {
	/** The gap markers of the stacked row, in render order. */
	function gaps() {
		const stacked = within(screen.getByTestId('interval-view')).getByTestId('interval-stacked');
		return [...stacked.querySelectorAll('.interval-view__gap')];
	}

	it('C13: only the +P5 carries the not-a-third marking, every third stays plain', () => {
		render(IntervalView, { chord: spellChord('C13'), onInspectTone: vi.fn() });

		const rendered = gaps().map((g) => [
			g.textContent?.trim(),
			g.classList.contains('interval-view__gap--other')
		]);
		expect(rendered).toEqual([
			['+M3', false],
			['+m3', false],
			['+m3', false],
			['+M3', false],
			['+P5', true]
		]);
	});

	it('C13 captions the row as not a plain stack of thirds, in both locales', () => {
		render(IntervalView, { chord: spellChord('C13'), onInspectTone: vi.fn() });

		const note = screen.getByTestId('interval-stacked-non-tertian');
		expect(note.textContent?.trim()).toBe(
			'The dashed gaps are not thirds. This symbol is not a plain stack of thirds.'
		);

		flushSync(() => setLocale('fr'));

		expect(screen.getByTestId('interval-stacked-non-tertian').textContent?.trim()).toBe(
			"Les écarts en pointillés ne sont pas des tierces. Ce symbole n'est pas un simple empilement de tierces."
		);
	});

	it('a real stack of thirds is byte-identical: no marking, no caption', () => {
		const { container: tertian } = render(IntervalView, { chord: cm7, onInspectTone: vi.fn() });

		expect(screen.queryByTestId('interval-stacked-non-tertian')).not.toBeInTheDocument();
		for (const gap of gaps()) {
			expect(gap.classList.contains('interval-view__gap--other')).toBe(false);
		}
		expect(tertian.innerHTML).not.toContain('interval-view__gap--other');
	});

	it('Csus4 (no thirds at all) marks both gaps and captions the row', () => {
		render(IntervalView, { chord: spellChord('Csus4'), onInspectTone: vi.fn() });

		expect(gaps().map((g) => g.textContent?.trim())).toEqual(['+P4', '+M2']);
		for (const gap of gaps()) {
			expect(gap.classList.contains('interval-view__gap--other')).toBe(true);
		}
		expect(screen.getByTestId('interval-stacked-non-tertian')).toBeInTheDocument();
	});

	it('the caption is stacked-view only: switching to the formula view drops it', async () => {
		render(IntervalView, { chord: spellChord('C13'), onInspectTone: vi.fn() });
		expect(screen.getByTestId('interval-stacked-non-tertian')).toBeInTheDocument();

		await fireEvent.click(
			within(screen.getByTestId('interval-view')).getByLabelText('Formula view')
		);

		expect(screen.queryByTestId('interval-stacked-non-tertian')).not.toBeInTheDocument();
	});

	it('gap markers stay aria-hidden non-buttons: the marking adds no tap target', () => {
		render(IntervalView, { chord: spellChord('C13'), onInspectTone: vi.fn() });

		for (const gap of gaps()) {
			expect(gap.getAttribute('aria-hidden')).toBe('true');
			expect(gap.tagName).not.toBe('BUTTON');
		}
	});
});
