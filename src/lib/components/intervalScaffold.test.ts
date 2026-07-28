import { render, screen, within, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import IntervalScaffold from './IntervalScaffold.svelte';
import { formulaFor } from '$lib/lookup/chordPresentation';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

const cm7 = formulaFor(spellChord('Cm7'));

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('IntervalScaffold (sketch 005)', () => {
	it('full level shows every interval short name plus its long name in the reader locale', () => {
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		for (const short of ['R', 'm3', 'P5', 'm7']) {
			expect(within(scaffold).getAllByText(short).length).toBeGreaterThan(0);
		}
		// Long names present at full level, in English under the en locale.
		expect(within(scaffold).getByText('minor 3rd')).toBeInTheDocument();
	});

	it('compact level shows interval short names but drops the long names', () => {
		render(IntervalScaffold, { entries: cm7, level: 'compact' });

		const scaffold = screen.getByTestId('interval-scaffold');
		expect(within(scaffold).getAllByText('m3').length).toBeGreaterThan(0);
		expect(within(scaffold).queryByText('minor 3rd')).not.toBeInTheDocument();
	});

	it('never shows the answer note letters (intervals only, so construction is not given away)', () => {
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		// The spelled notes are C, E flat, G, B flat: none should appear as a label.
		expect(within(scaffold).queryByText('E♭')).not.toBeInTheDocument();
		expect(within(scaffold).queryByText('B♭')).not.toBeInTheDocument();
	});

	it('renders nothing at level off', () => {
		render(IntervalScaffold, { entries: cm7, level: 'off' });
		expect(screen.queryByTestId('interval-scaffold')).not.toBeInTheDocument();
	});
});

describe('IntervalScaffold renders in French (I18N-02, Phase 20 Plan 04)', () => {
	it('shows the French caption label under fr', () => {
		setLocale('fr');
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		expect(within(scaffold).getByText('Cet accord est')).toBeInTheDocument();
	});
});

/**
 * T5 R4: the scaffold used to render `longFr` unconditionally, so an English
 * session read "m3 / tierce mineure" while the app's own prose said "minor
 * 3rd". The long name now follows the reader's locale and is never doubled.
 */
describe('IntervalScaffold long names follow the reader locale (T5 R4)', () => {
	it('reads English long names under en', () => {
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		for (const name of ['root', 'minor 3rd', 'perfect 5th', 'minor 7th']) {
			expect(within(scaffold).getByText(name)).toBeInTheDocument();
		}
		expect(scaffold.textContent).not.toMatch(/tierce|quinte|septième|fondamentale/);
	});

	it('reads French long names under fr, with no English duplicate', () => {
		setLocale('fr');
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		for (const name of ['fondamentale', 'tierce mineure', 'quinte juste', 'septième mineure']) {
			expect(within(scaffold).getByText(name)).toBeInTheDocument();
		}
		expect(scaffold.textContent).not.toMatch(/minor 3rd|perfect 5th/);
	});

	it('carries the locale long name into the chip tooltip and aria-label too', () => {
		const { unmount } = render(IntervalScaffold, { entries: cm7, level: 'compact' });
		let chip = within(screen.getByTestId('interval-scaffold')).getByText('m3');
		expect(chip).toHaveAttribute('title', 'minor 3rd');
		expect(chip).toHaveAttribute('aria-label', 'm3: minor 3rd');
		unmount();

		setLocale('fr');
		render(IntervalScaffold, { entries: cm7, level: 'compact' });
		chip = within(screen.getByTestId('interval-scaffold')).getByText('m3');
		expect(chip).toHaveAttribute('title', 'tierce mineure');
		expect(chip).toHaveAttribute('aria-label', 'm3: tierce mineure');
	});

	it('keeps the interval shorthand itself immune: byte-identical across locales', () => {
		const shorthand = (scaffold: HTMLElement) =>
			Array.from(scaffold.querySelectorAll('.interval-chip')).map((node) => node.textContent);

		const { unmount } = render(IntervalScaffold, { entries: cm7, level: 'compact' });
		const en = shorthand(screen.getByTestId('interval-scaffold'));
		unmount();

		setLocale('fr');
		render(IntervalScaffold, { entries: cm7, level: 'compact' });

		expect(shorthand(screen.getByTestId('interval-scaffold'))).toEqual(en);
		expect(en).toEqual(['R', 'm3', 'P5', 'm7']);
	});
});
