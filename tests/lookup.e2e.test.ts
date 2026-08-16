import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LookupPage from '../src/routes/+page.svelte';
import { setLocale } from '../src/lib/i18n/locale.svelte';

/**
 * Lookup's keyboard/register render inline in the page's own content flow
 * (in the recognized-chord result block), so a plain page render puts the
 * keyboard/register content in the same `document.body` that `screen`
 * queries.
 */
function renderPage() {
	return render(LookupPage);
}

// The lookup page's Hear it action goes through the Track A audio engine,
// and the keyboard/formula columns are inspectable (Track C): taps play
// through the same contract. One mock provides all three engine functions
// per the audio contract (consumers in tests always
// vi.mock('$lib/audio/audio')) so no AudioContext or tone import ever
// happens in jsdom.
const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: () => ensureAudioReadyMock()
}));

// Note: masthead assertions intentionally live outside this file. The masthead
// is rendered by +layout.svelte, not +page.svelte, and this suite renders the
// page component in isolation (no layout wrapper) to avoid layout-render
// coupling. Masthead behavior is verified via manual/e2e navigation checks,
// not a unit-rendered +layout.svelte import here.

// Recent-lookups state is read from localStorage at page mount, so every
// test in this file needs a clean store to stay deterministic and
// independent of test execution order.
beforeEach(() => {
	playNoteMock.mockClear();
	localStorage.clear();
	playChordMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('lookup page Hear it (Track A audio engine)', () => {
	it('plays the rendered chord through the engine, unlocking audio inside the gesture', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));
		expect(playChordMock).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: /hear it/i }));

		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
	});
});

describe('lookup page happy path', () => {
	it('typing Dm7 and clicking Stamp renders a chord-result with dual naming and interval-colored keys', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Dm7' } });

		const button = screen.getByRole('button', { name: /stamp/i });
		await fireEvent.click(button);

		const result = screen.getByTestId('chord-result');
		expect(result).toBeInTheDocument();

		const glyphShadow = screen.getAllByTestId('chord-glyph-shadow')[0];
		expect(glyphShadow).toBeInTheDocument();
		expect(within(glyphShadow).getByText('D')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--root')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--third')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--fifth')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--seventh')).toBeInTheDocument();
		expect(within(keyboard).getByText('D')).toBeInTheDocument();
		expect(within(keyboard).getByText('F')).toBeInTheDocument();
		expect(within(keyboard).getByText('A')).toBeInTheDocument();
		expect(within(keyboard).getByText('C')).toBeInTheDocument();
	});

	it('mounts the improvisation guide on the result card, opening into the chord-scale answer', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Am7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		const result = screen.getByTestId('chord-result');
		const toggle = within(result).getByTestId('improvise-toggle');
		await fireEvent.click(toggle);

		const panel = within(result).getByTestId('improvise-panel');
		// Dorian leads the minor family's scale choices (chordScale.ts).
		const chips = within(panel).getAllByTestId('improvise-scale-chip');
		expect(chips[0].textContent).toContain('dorian');
	});
});

describe('lookup page input trimming', () => {
	it('stamping "Cm7 " with a trailing space (mobile autocomplete artifact) resolves the chord directly', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7 ' } });

		const button = screen.getByRole('button', { name: /stamp/i });
		await fireEvent.click(button);

		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
		expect(screen.queryByTestId('error-bar')).not.toBeInTheDocument();
	});
});

describe('lookup page keyboard reactivity across repeat lookups', () => {
	it('stamping Cm7 then Fmaj7 updates the keyboard highlights to the new chord (no stale E♭)', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);

		let keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(within(keyboard).getByText('E♭')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Fmaj7' } });
		await fireEvent.click(button);

		keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(within(keyboard).queryByText('E♭')).not.toBeInTheDocument();
		expect(within(keyboard).queryByText('B♭')).not.toBeInTheDocument();
		expect(within(keyboard).getByText('F')).toBeInTheDocument();
		expect(within(keyboard).getByText('A')).toBeInTheDocument();
		expect(within(keyboard).getByText('C')).toBeInTheDocument();
		expect(within(keyboard).getByText('E')).toBeInTheDocument();
	});
});

describe('lookup page dual naming and interval formula', () => {
	it('typing Cm7 and stamping renders the interval-formula chip labels and dual-named notes', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /stamp/i });
		await fireEvent.click(button);

		// IntervalView (Phase 26) defaults to the stacked-thirds view; the
		// interval-formula testid only mounts after switching the toggle to
		// Formula, which reproduces the original row this test was written
		// against (R/m3/P5/m7 labels).
		await fireEvent.click(screen.getByRole('button', { name: 'Formula view' }));

		const formula = screen.getByTestId('interval-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('m3')).toBeInTheDocument();
		expect(within(formula).getByText('P5')).toBeInTheDocument();
		expect(within(formula).getByText('m7')).toBeInTheDocument();
		expect(within(formula).getByText('C')).toBeInTheDocument();
		expect(within(formula).getByText('Do')).toBeInTheDocument();
	});
});

describe('lookup page identity', () => {
	it('shows the "Chord lookup" heading and "No chord yet" empty state before any input', () => {
		renderPage();

		expect(screen.getByText('Chord lookup')).toBeInTheDocument();
		expect(screen.getByText('No chord yet')).toBeInTheDocument();
	});
});

describe('lookup page non-blocking error', () => {
	it('stamping a valid chord then an invalid one shows the error bar while keeping the previous result visible', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);

		expect(screen.getByTestId('error-bar')).toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});

describe('lookup page recent lookups', () => {
	it('does not render a recent-chip row before the first successful lookup', () => {
		renderPage();

		expect(screen.queryByTestId('recent-chip-row')).not.toBeInTheDocument();
	});

	it('shows a recent-chip row after stamping, and re-stamps on chip click', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		await fireEvent.input(input, { target: { value: 'Fmaj7' } });
		await fireEvent.click(button);

		const row = screen.getByTestId('recent-chip-row');
		expect(within(row).getByText('Cm7')).toBeInTheDocument();
		expect(within(row).getByText('Fmaj7')).toBeInTheDocument();

		await fireEvent.click(within(row).getByRole('button', { name: 'Look up Cm7 again' }));

		const result = screen.getByTestId('chord-result');
		const glyphShadow = within(result).getAllByTestId('chord-glyph-shadow')[0];
		expect(within(glyphShadow).getByText('C')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();
	});
});

describe('lookup page sharp/flat helpers', () => {
	it('clicking the sharp helper inserts the glyph into the input value', async () => {
		renderPage();

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'F' } });

		const sharpButton = screen.getByRole('button', { name: 'Insert sharp' });
		await fireEvent.click(sharpButton);

		expect(input.value).toContain('♯');
	});

	it('clicking the flat helper inserts the glyph into the input value', async () => {
		renderPage();

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'B' } });

		const flatButton = screen.getByRole('button', { name: 'Insert flat' });
		await fireEvent.click(flatButton);

		expect(input.value).toContain('♭');
	});
});

describe('lookup page did-you-mean suggestion', () => {
	it('stamping an unrecognized-but-close symbol shows a tappable suggestion that stamps the candidate on click', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cmn7' } });
		await fireEvent.click(button);

		const errorBar = screen.getByTestId('error-bar');
		expect(errorBar).toHaveTextContent(/DID YOU MEAN/);

		const suggestion = within(errorBar).getByTestId('suggestion');
		expect(suggestion).toHaveTextContent('Cm7');

		await fireEvent.click(suggestion);

		const result = screen.getByTestId('chord-result');
		const glyphShadow = within(result).getAllByTestId('chord-glyph-shadow')[0];
		expect(within(glyphShadow).getByText('C')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();
	});

	it('stamping an unrelated unrecognized symbol falls back to a plain rotating hint with no suggestion token', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);

		const errorBar = screen.getByTestId('error-bar');
		expect(errorBar).toBeInTheDocument();
		expect(within(errorBar).queryByTestId('suggestion')).not.toBeInTheDocument();
	});

	it('keeps the previously rendered chord-result visible while showing the suggestion bar (non-blocking)', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Cmn7' } });
		await fireEvent.click(button);

		expect(screen.getByTestId('error-bar')).toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});

describe('lookup page focus behavior', () => {
	it('does NOT autofocus the input on a cold entry (B6: no soft keyboard on launch)', () => {
		// A plain mount with no client-side navigation is exactly the cold-entry
		// case (installed app launch, bookmark, shared link). Focusing here is
		// what used to pop the phone's soft keyboard over the page before the
		// user asked for anything. The mid-session "navigated here from the tab
		// bar" case still focuses, and is covered in
		// src/routes/lookupEntryFocus.test.ts where afterNavigate is drivable.
		renderPage();

		const input = screen.getByRole('textbox');
		expect(document.activeElement).not.toBe(input);
	});

	it('re-selects the input content after a successful stamp for type-over entry', async () => {
		renderPage();

		const input = screen.getByRole('textbox') as HTMLInputElement;
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);

		expect(document.activeElement).toBe(input);
		expect(input.selectionStart).toBe(0);
		expect(input.selectionEnd).toBe(input.value.length);
	});
});

describe('lookup page interval register (Track C)', () => {
	it('shows the idle register line under the keyboard after a stamp', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('Tap a key to inspect it.');
	});

	it('tapping a highlighted key plays it and fills the register with its full naming (en default)', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('E♭ · Mi♭ · m3 · minor 3rd · 3 semitones');
		expect(playNoteMock).toHaveBeenCalledWith('Eb4');
	});

	it('tapping a formula column does the same as tapping its key (en default)', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		await fireEvent.click(screen.getByRole('button', { name: 'Inspect B♭' }));

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('B♭ · Si♭ · m7 · minor 7th · 10 semitones');
		expect(playNoteMock).toHaveBeenCalledWith('Bb4');
	});

	it('clears the register back to idle when a new chord is stamped', async () => {
		renderPage();

		const input = screen.getByRole('textbox');
		const stamp = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(stamp);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		expect(screen.getByTestId('inspect-register')).toHaveTextContent('minor 3rd');

		await fireEvent.input(input, { target: { value: 'Fmaj7' } });
		await fireEvent.click(stamp);

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('Tap a key to inspect it.');
	});

	it('interval chips carry the French long name as tooltip and aria-label (unaffected by the UI locale toggle)', async () => {
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		// Switch to the Formula view (IntervalView defaults to stacked) so the
		// `m3` label under test is the tone chip, not a stacked-view gap marker.
		await fireEvent.click(screen.getByRole('button', { name: 'Formula view' }));

		const formula = screen.getByTestId('interval-formula');
		const chip = within(formula).getByText('m3');
		expect(chip).toHaveAttribute('title', 'tierce mineure');
	});
});

describe('lookup page French locale (I18N-02)', () => {
	it('renders the input placeholder and inspect idle line in French under fr, with chord symbols immune', async () => {
		setLocale('fr');
		renderPage();

		expect(screen.getByPlaceholderText('Tapez un accord : Cm7, F♯ø7, B♭maj7...')).toBeInTheDocument();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /tamponner/i }));

		expect(screen.getByTestId('inspect-register')).toHaveTextContent(
			"Touche une note pour l'inspecter."
		);

		// Chord symbol notation stays byte-identical regardless of locale.
		const glyphShadow = screen.getAllByTestId('chord-glyph-shadow')[0];
		expect(within(glyphShadow).getByText('C')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();
	});

	it('switches the inspect register long-name to longFr under fr while the interval shorthand stays identical', async () => {
		setLocale('fr');
		renderPage();

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /tamponner/i }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('E♭ · Mi♭ · m3 · tierce mineure · 3 demi-tons');
	});

	it('renders a STARTER_CHORD symbol identically in en and fr (notation immunity)', () => {
		setLocale('en');
		const { container: enContainer } = renderPage();
		const enStarter = within(enContainer).getAllByTestId('starter-chord')[0].textContent?.trim();
		cleanup();

		setLocale('fr');
		const { container: frContainer } = renderPage();
		const frStarter = within(frContainer).getAllByTestId('starter-chord')[0].textContent?.trim();

		expect(frStarter).toBe(enStarter);
		expect(frStarter).toBe('Cm7');
	});
});
