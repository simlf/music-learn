import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WhyTheseNotes from './WhyTheseNotes.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Standalone component tests (mirrors hintLadder.test.ts's harness): the
 * expandable "Pourquoi ces notes ?" teaching panel (sketch 016-A) with the
 * folded minor-vs-major duo (sketch 016-C) as its deepest content.
 */

const am7 = spellChord('Am7');
const amaj7 = spellChord('Amaj7');

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('WhyTheseNotes', () => {
	it('is collapsed by default with a localized toggle label', () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		expect(screen.getByTestId('why-toggle')).toHaveTextContent('Why these notes?');
		expect(screen.queryByTestId('why-panel')).not.toBeInTheDocument();
	});

	it('opens on toggle click and closes again on a second click', async () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		const toggle = screen.getByTestId('why-toggle');
		await fireEvent.click(toggle);
		expect(screen.getByTestId('why-panel')).toBeInTheDocument();

		await fireEvent.click(toggle);
		expect(screen.queryByTestId('why-panel')).not.toBeInTheDocument();
	});

	it('explains the third is minor (3 semitones -> natural note) and states the key signature does not impose accidentals', async () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const panel = screen.getByTestId('why-panel');

		expect(within(panel).getByText(/minor third/)).toBeInTheDocument();
		expect(within(panel).getByText(/3 semitones/)).toBeInTheDocument();
		// Root/third note letters render verbatim (immune), embedded in the panel.
		expect(within(panel).getByText('C')).toBeInTheDocument();
		expect(within(panel).getByText(/does not impose accidentals/)).toBeInTheDocument();
	});

	it('deepest content is the m-vs-maj duo, showing both readings with differing third/seventh via ChordGlyph', async () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const duo = screen.getByTestId('why-duo');

		// Both glyphs present.
		expect(within(duo).getByText('Am7')).toBeInTheDocument();
		expect(within(duo).getByText('Amaj7')).toBeInTheDocument();
		// Differing third.
		expect(within(duo).getByText('C')).toBeInTheDocument();
		expect(within(duo).getByText('C♯')).toBeInTheDocument();
		// Differing seventh.
		expect(within(duo).getByText('G')).toBeInTheDocument();
		expect(within(duo).getByText('G♯')).toBeInTheDocument();
	});

	it('the duo is prop-driven, not hardcoded: feeding a different counterpart updates the render', async () => {
		const cm7 = spellChord('Cm7');
		const cmaj7 = spellChord('Cmaj7');
		render(WhyTheseNotes, { chord: cm7, counterpart: cmaj7, counterpartSymbol: 'Cmaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const duo = screen.getByTestId('why-duo');

		expect(within(duo).getByText('Cm7')).toBeInTheDocument();
		expect(within(duo).getByText('Cmaj7')).toBeInTheDocument();
		expect(within(duo).getByText('E♭')).toBeInTheDocument();
		expect(within(duo).getByText('E')).toBeInTheDocument();
	});

	it('an escape-hatch control emits onLookupCounterpart with the counterpart symbol', async () => {
		const onLookupCounterpart = vi.fn();
		render(WhyTheseNotes, {
			chord: am7,
			counterpart: amaj7,
			counterpartSymbol: 'Amaj7',
			onLookupCounterpart
		});

		await fireEvent.click(screen.getByTestId('why-toggle'));
		await fireEvent.click(screen.getByTestId('why-escape-hatch'));

		expect(onLookupCounterpart).toHaveBeenCalledWith('Amaj7');
	});

	it('omits the duo gracefully when no counterpart is given, but still shows the per-note why and key-signature clarification', async () => {
		const g7 = spellChord('G7'); // dominant seventh: no meaningful m/maj counterpart passed.
		render(WhyTheseNotes, { chord: g7 });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const panel = screen.getByTestId('why-panel');

		expect(within(panel).getByText(/does not impose accidentals/)).toBeInTheDocument();
		expect(screen.queryByTestId('why-duo')).not.toBeInTheDocument();
		expect(screen.queryByTestId('why-escape-hatch')).not.toBeInTheDocument();
	});
});

describe('WhyTheseNotes: FR locale', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('renders French step copy while chord symbols/note letters stay identical', async () => {
		setLocale('fr');
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		expect(screen.getByTestId('why-toggle')).toHaveTextContent('Pourquoi ces notes ?');
		await fireEvent.click(screen.getByTestId('why-toggle'));

		const panel = screen.getByTestId('why-panel');
		expect(within(panel).getByText(/tierce mineure/)).toBeInTheDocument();
		expect(within(panel).getByText("n'impose rien ici", { exact: false })).toBeInTheDocument();
		// Symbols/note letters immune.
		expect(within(panel).getByText('C')).toBeInTheDocument();
		const duo = screen.getByTestId('why-duo');
		expect(within(duo).getByText('Am7')).toBeInTheDocument();
		expect(within(duo).getByText('Amaj7')).toBeInTheDocument();
	});
});
