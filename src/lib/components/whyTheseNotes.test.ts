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

	it('explains the third by letter-name span + semitone count, and states the key signature does not impose accidentals', async () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const panel = screen.getByTestId('why-panel');

		const step = within(panel).getByTestId('why-third-step');
		expect(step).toHaveTextContent('is a minor 3rd: 3 semitones above A');
		expect(step).toHaveTextContent('spans three letter names, A up to C');
		// The generalized rule sits under the worked third.
		expect(within(panel).getByTestId('why-number-vs-quality')).toHaveTextContent(
			'The number counts letter names. The quality counts half steps.'
		);
		// Root/third note letters render verbatim (immune), embedded in the panel.
		expect(within(panel).getByText('C', { selector: 'b' })).toBeInTheDocument();
		expect(within(panel).getByText(/does not impose accidentals/)).toBeInTheDocument();
	});

	/**
	 * BUG PIN (pedagogy audit): this panel used to render "is a minor third: 3
	 * semitones above the root, giving the natural note, not the sharp." for
	 * EVERY minor-third chord and "...giving the sharp note." for every
	 * major-third chord. Both were written for the Am7/Amaj7 worked example and
	 * were false on roughly half of all lookups (Cm7's third is E♭, a flat;
	 * Fmaj7's third is A, natural).
	 *
	 * chordPresentation.test.ts proves the generated sentence across all 12
	 * catalog roots; this covers the RENDER path for the spread the audit named,
	 * plus the two headline regressions in full.
	 */
	it('renders a truthful third-step line for a spread of roots, never a natural-vs-sharp claim', async () => {
		const cases: Array<[symbol: string, expected: string]> = [
			['Cm7', 'is a minor 3rd: 3 semitones above C. A third always spans three letter names, C up to E'],
			['Fm7', 'is a minor 3rd: 3 semitones above F. A third always spans three letter names, F up to A'],
			['Am7', 'is a minor 3rd: 3 semitones above A. A third always spans three letter names, A up to C'],
			['Bbm7', 'is a minor 3rd: 3 semitones above B♭. A third always spans three letter names, B♭ up to D'],
			['Ebm7', 'is a minor 3rd: 3 semitones above E♭. A third always spans three letter names, E♭ up to G'],
			['F#m7', 'is a minor 3rd: 3 semitones above F♯. A third always spans three letter names, F♯ up to A'],
			['Dbm7', 'is a minor 3rd: 3 semitones above D♭. A third always spans three letter names, D♭ up to F'],
			['Cmaj7', 'is a major 3rd: 4 semitones above C. A third always spans three letter names, C up to E'],
			['Fmaj7', 'is a major 3rd: 4 semitones above F. A third always spans three letter names, F up to A'],
			['Amaj7', 'is a major 3rd: 4 semitones above A. A third always spans three letter names, A up to C'],
			['Bbmaj7', 'is a major 3rd: 4 semitones above B♭. A third always spans three letter names, B♭ up to D'],
			['Ebmaj7', 'is a major 3rd: 4 semitones above E♭. A third always spans three letter names, E♭ up to G'],
			['F#maj7', 'is a major 3rd: 4 semitones above F♯. A third always spans three letter names, F♯ up to A'],
			['Dbmaj7', 'is a major 3rd: 4 semitones above D♭. A third always spans three letter names, D♭ up to F']
		];

		for (const [symbol, expected] of cases) {
			const { unmount } = render(WhyTheseNotes, { chord: spellChord(symbol) });
			await fireEvent.click(screen.getByTestId('why-toggle'));

			const step = screen.getByTestId('why-third-step');
			expect(step, symbol).toHaveTextContent(expected);
			// The false absolute claims are gone on every root.
			expect(step.textContent?.toLowerCase(), symbol).not.toContain('natural');
			expect(step.textContent?.toLowerCase(), symbol).not.toContain('the sharp');

			unmount();
		}
	});

	it('the third callout still shows the actual spelled third next to the sentence (E♭ for Cm7, A for Fmaj7)', async () => {
		const { unmount } = render(WhyTheseNotes, { chord: spellChord('Cm7') });
		await fireEvent.click(screen.getByTestId('why-toggle'));
		expect(screen.getByTestId('why-third-step')).toHaveTextContent('→ E♭');
		unmount();

		render(WhyTheseNotes, { chord: spellChord('Fmaj7') });
		await fireEvent.click(screen.getByTestId('why-toggle'));
		expect(screen.getByTestId('why-third-step')).toHaveTextContent('→ A');
	});

	it('deepest content is the m-vs-maj duo, showing both readings with differing third/seventh via ChordGlyph', async () => {
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const duo = screen.getByTestId('why-duo');

		// Both readings' symbols present.
		expect(screen.getByTestId('why-duo-minor-symbol')).toHaveTextContent('Am7');
		expect(screen.getByTestId('why-duo-major-symbol')).toHaveTextContent('Amaj7');
		// Differing third.
		expect(within(screen.getByTestId('why-duo-minor')).getByText('C')).toBeInTheDocument();
		expect(within(screen.getByTestId('why-duo-major')).getByText('C♯')).toBeInTheDocument();
		// Differing seventh.
		expect(within(screen.getByTestId('why-duo-minor')).getByText('G')).toBeInTheDocument();
		expect(within(screen.getByTestId('why-duo-major')).getByText('G♯')).toBeInTheDocument();
		expect(duo).toBeInTheDocument();
	});

	it('the duo is prop-driven, not hardcoded: feeding a different counterpart updates the render', async () => {
		const cm7 = spellChord('Cm7');
		const cmaj7 = spellChord('Cmaj7');
		render(WhyTheseNotes, { chord: cm7, counterpart: cmaj7, counterpartSymbol: 'Cmaj7' });

		await fireEvent.click(screen.getByTestId('why-toggle'));

		expect(screen.getByTestId('why-duo-minor-symbol')).toHaveTextContent('Cm7');
		expect(screen.getByTestId('why-duo-major-symbol')).toHaveTextContent('Cmaj7');
		expect(within(screen.getByTestId('why-duo-minor')).getByText('E♭')).toBeInTheDocument();
		expect(within(screen.getByTestId('why-duo-major')).getByText('E')).toBeInTheDocument();
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

	it('renders a truthful French third-step line for a flat-third root (Cm7 -> E♭, never "pas le dièse")', async () => {
		setLocale('fr');
		render(WhyTheseNotes, { chord: spellChord('Cm7') });

		await fireEvent.click(screen.getByTestId('why-toggle'));
		const step = screen.getByTestId('why-third-step');

		expect(step).toHaveTextContent('= tierce mineure : 3 demi-tons au-dessus de C');
		expect(step).toHaveTextContent('trois noms de notes, de C à E');
		expect(step).toHaveTextContent('sur la lettre E');
		expect(step.textContent?.toLowerCase()).not.toContain('dièse');
		expect(step.textContent?.toLowerCase()).not.toContain('naturelle');
	});

	it('renders French step copy while chord symbols/note letters stay identical', async () => {
		setLocale('fr');
		render(WhyTheseNotes, { chord: am7, counterpart: amaj7, counterpartSymbol: 'Amaj7' });

		expect(screen.getByTestId('why-toggle')).toHaveTextContent('Pourquoi ces notes ?');
		await fireEvent.click(screen.getByTestId('why-toggle'));

		const panel = screen.getByTestId('why-panel');
		expect(within(panel).getByTestId('why-third-step')).toHaveTextContent(
			'= tierce mineure : 3 demi-tons au-dessus de A'
		);
		expect(within(panel).getByTestId('why-third-step')).toHaveTextContent(
			'trois noms de notes, de A à C'
		);
		expect(within(panel).getByTestId('why-number-vs-quality')).toHaveTextContent(
			'Le chiffre compte les noms de notes. La qualité compte les demi-tons.'
		);
		expect(within(panel).getByText("n'impose rien ici", { exact: false })).toBeInTheDocument();
		// Symbols/note letters immune.
		expect(within(panel).getByText('C', { selector: 'b' })).toBeInTheDocument();
		expect(screen.getByTestId('why-duo')).toBeInTheDocument();
		expect(screen.getByTestId('why-duo-minor-symbol')).toHaveTextContent('Am7');
		expect(screen.getByTestId('why-duo-major-symbol')).toHaveTextContent('Amaj7');
	});
});
