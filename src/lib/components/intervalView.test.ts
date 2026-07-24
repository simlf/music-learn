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

		expect(within(stacked).getByText('+m3')).toBeInTheDocument();
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
