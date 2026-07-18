import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScaleKeyboardDrill from './ScaleKeyboardDrill.svelte';
import { majorScaleNotes } from '$lib/theory/scale';
import { placeAscendingScaleKeys, type ScaleKeyPlacement } from '$lib/practice/scaleKeyboardDrill';
import { whiteLettersForOctaves, blackKeysForOctaves } from '$lib/components/keyboardLayout';
import type { SpelledNote } from '$lib/theory/types';
import { setLocale } from '$lib/i18n/locale.svelte';

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const whiteLetters = whiteLettersForOctaves(2);
const blackKeyPatterns = blackKeysForOctaves(2);

function renderDrill(props: { notes: SpelledNote[]; tonic: string }) {
	const drill = render(ScaleKeyboardDrill, { props });
	return { drill };
}

/** Board-geometry aria-label for a placement's key: always the raw board letter
 * (natural for white, sharp spelling for black), never the scale's own
 * enharmonic spelling, matching the component's tap targets exactly. */
function ariaLabelFor(kind: 'white' | 'black', keyIndex: number): string {
	if (kind === 'white') {
		const octave = 4 + Math.floor(keyIndex / 7);
		return `${whiteLetters[keyIndex]}${octave} key`;
	}
	const pattern = blackKeyPatterns[keyIndex];
	const octave = 4 + Math.floor(pattern.afterWhiteIndex / 7);
	return `${pattern.sharpLetter}${octave} key`;
}

// Every placement passed to tapButtonFor is one of the 8 canonical ascending
// placements, so its accessible name always carries the WR-04 scale-degree
// suffix (a static, fill-independent label - see the component's
// placementByKey/ariaLabelFor). The key-strip renders inline in the drill's
// own DOM while a drill is active.
function tapButtonFor(placement: ScaleKeyPlacement): HTMLElement {
	return screen.getByRole('button', {
		name: `${ariaLabelFor(placement.kind, placement.keyIndex)}, scale degree ${placement.degree}`
	});
}

async function tapAscending(placements: ScaleKeyPlacement[]) {
	for (const placement of placements) {
		await fireEvent.click(tapButtonFor(placement));
	}
}

async function tapDescending(placements: ScaleKeyPlacement[]) {
	// Degrees 7 down to 1 re-tap the same 7 keys used for degrees 1-7 ascending.
	for (let degree = 7; degree >= 1; degree -= 1) {
		await fireEvent.click(tapButtonFor(placements[degree - 1]));
	}
}

beforeEach(() => {
	playNoteMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('ScaleKeyboardDrill (tonic-anchored 2-octave keyboard, SCALE-04)', () => {
	it('renders with no key filled and the correct instruction/register on mount (C major)', () => {
		renderDrill({ notes: majorScaleNotes('C'), tonic: 'C' });

		expect(screen.getByText('Play C major ascending, then descending.')).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
	});

	it('renders the tappable key-strip inline in the component\'s own output while a drill is active', () => {
		const { drill } = renderDrill({ notes: majorScaleNotes('C'), tonic: 'C' });

		expect(drill.container.querySelector('[data-testid="scale-keyboard-register"]')).not.toBeNull();
		expect(drill.container.textContent).toContain('Play C major ascending, then descending.');
		expect(drill.container.querySelectorAll('[role="button"]').length).toBeGreaterThan(0);
	});

	it('tapping the tonic first fills the leftmost key and plays it; no key left of it is filled', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		await fireEvent.click(tapButtonFor(placements[0]));

		expect(tapButtonFor(placements[0])).toHaveClass('key--root');
		expect(playNoteMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 2 OF 8 · ASCENDING');
	});

	it('fills all 8 ascending degrees with role colors and ends on a key distinct from the tonic', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		await tapAscending(placements);

		const roleClasses = [
			'key--root',
			'key--second',
			'key--third',
			'key--fourth',
			'key--fifth',
			'key--sixth',
			'key--seventh',
			'key--root'
		];
		placements.forEach((placement, index) => {
			expect(tapButtonFor(placement)).toHaveClass(roleClasses[index]);
		});
		// The octave (degree 8) must land on a distinct key from the tonic.
		expect(placements[7].keyIndex).toBe(7);
		expect(placements[7].kind).toBe('white');
		expect(placements[0].keyIndex).not.toBe(placements[7].keyIndex);
		expect(playNoteMock).toHaveBeenCalledTimes(8);
	});

	it('advances the register through the ascending leg then flips to descending 7 down to 1', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		for (let degree = 1; degree <= 8; degree += 1) {
			await fireEvent.click(tapButtonFor(placements[degree - 1]));
			if (degree < 8) {
				expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent(
					`DEGREE ${degree + 1} OF 8 · ASCENDING`
				);
			}
		}
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 7 OF 8 · DESCENDING');

		await fireEvent.click(tapButtonFor(placements[6]));
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 6 OF 8 · DESCENDING');
	});

	it('a wrong pitch-class tap flashes gray, does not advance or play, and clears after ~320ms', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		// Degree 1 (tonic) is expected first; tap degree 3's key instead.
		const wrongButton = tapButtonFor(placements[2]);
		await fireEvent.click(wrongButton);

		expect(wrongButton).toHaveClass('key--wrong');
		expect(playNoteMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		expect(wrongButton).not.toHaveClass('key--root');

		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(wrongButton).not.toHaveClass('key--wrong');
	});

	it('completing all 15 taps shows the completion card, and Run it again resets to degree 1 ascending', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		await tapAscending(placements);
		await tapDescending(placements);

		expect(screen.getByTestId('scale-keyboard-complete')).toBeInTheDocument();
		expect(screen.getByText('Voila. C major, up and down, clean.')).toBeInTheDocument();
		expect(playNoteMock).toHaveBeenCalledTimes(15);

		await fireEvent.click(screen.getByRole('button', { name: 'Run it again' }));

		expect(screen.queryByTestId('scale-keyboard-complete')).not.toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		expect(tapButtonFor(placements[0])).not.toHaveClass('key--root');
	});

	it('resets to degree 1 ascending and updates the instruction when the tonic/notes change', async () => {
		const cNotes = majorScaleNotes('C');
		const cPlacements = placeAscendingScaleKeys(cNotes);
		const { drill } = renderDrill({ notes: cNotes, tonic: 'C' });

		await fireEvent.click(tapButtonFor(cPlacements[0]));
		expect(tapButtonFor(cPlacements[0])).toHaveClass('key--root');

		const gNotes = majorScaleNotes('G');
		await drill.rerender({ notes: gNotes, tonic: 'G' });

		expect(screen.getByText('Play G major ascending, then descending.')).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		const gPlacements = placeAscendingScaleKeys(gNotes);
		expect(tapButtonFor(gPlacements[0])).not.toHaveClass('key--root');
	});

	it('CR-01: tapping a non-canonical duplicate key (same pitch class, different physical key) fills the tapped key, not the canonical one', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		// Degree 1 (tonic C) is expected first. Its canonical placement is the
		// leftmost white C (keyIndex 0), but the fixed 2-octave board also has
		// a second C at white keyIndex 7 (degree 8's canonical placement) -
		// tap that one instead. Same chroma, so it must be accepted.
		expect(placements[0]).toMatchObject({ kind: 'white', keyIndex: 0 });
		expect(placements[7]).toMatchObject({ kind: 'white', keyIndex: 7 });

		const tappedKey = tapButtonFor(placements[7]);
		await fireEvent.click(tappedKey);

		// The tapped key itself gets the fill...
		expect(tappedKey).toHaveClass('key--root');
		// ...and the canonical (but untouched) tonic key gets nothing.
		expect(tapButtonFor(placements[0])).not.toHaveClass('key--root');
		expect(tapButtonFor(placements[0])).not.toHaveClass('key--wrong');
		// The tap was graded correct: audio played and the drill advanced.
		expect(playNoteMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 2 OF 8 · ASCENDING');
	});

	it('WR-04: per-key aria-labels carry scale-degree semantics, and the currently-expected key is aria-current', () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'C' });

		// A canonical placement key's accessible name includes its degree...
		const tonicKey = tapButtonFor(placements[0]);
		expect(tonicKey).toHaveAccessibleName('C4 key, scale degree 1');
		// ...and is marked as the currently-expected step (degree 1 is first).
		expect(tonicKey).toHaveAttribute('aria-current', 'step');

		// A non-canonical duplicate key (e.g. the higher octave C, degree 8's
		// canonical key) is not yet expected, so it carries no aria-current,
		// though it does have its own (different) degree semantics.
		const octaveKey = tapButtonFor(placements[7]);
		expect(octaveKey).toHaveAccessibleName('C5 key, scale degree 8');
		expect(octaveKey).not.toHaveAttribute('aria-current');

		// The register text is live so degree/direction changes are announced.
		expect(screen.getByTestId('scale-keyboard-register')).toHaveAttribute('aria-live', 'polite');
	});

	it('accepts F♯ major degree 7 (E♯) on the white F key and labels it E♯ (enharmonic acceptance by chroma)', async () => {
		const notes = majorScaleNotes('F♯');
		const placements = placeAscendingScaleKeys(notes);
		renderDrill({ notes, tonic: 'F♯' });

		// Degree 7 (E♯, chroma 5) is placed on the white F key per 10-01's
		// placeAscendingScaleKeys (proven under test there); confirm the fixture
		// still holds before relying on it, then walk degrees 1-6 ascending.
		expect(placements[6].kind).toBe('white');
		expect(placements[6].letter).toBe('E♯');

		for (let degree = 1; degree <= 6; degree += 1) {
			await fireEvent.click(tapButtonFor(placements[degree - 1]));
		}
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 7 OF 8 · ASCENDING');

		const degree7Button = tapButtonFor(placements[6]);
		await fireEvent.click(degree7Button);

		expect(degree7Button).toHaveClass('key--seventh');
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 8 OF 8 · ASCENDING');
		expect(degree7Button.textContent).toContain('E♯');
	});
});

/**
 * Locale-agnostic key lookup: unlike `tapButtonFor` above (which builds its
 * accessible name from the always-English test-local `ariaLabelFor` helper),
 * these French-locale tests must find keys without depending on the
 * (now-translated) aria-label wording. Board order is deterministic - every
 * white key first (DOM index === keyIndex), then every black key (DOM index
 * === whiteLetters.length + keyIndex) - matching the component's own
 * `{#each whiteKeys}` then `{#each blackKeys}` render order.
 */
function keyButtonByPlacement(container: HTMLElement, placement: ScaleKeyPlacement): HTMLElement {
	const buttons = Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];
	const domIndex =
		placement.kind === 'white' ? placement.keyIndex : whiteLetters.length + placement.keyIndex;
	return buttons[domIndex];
}

async function tapAscendingLocaleAgnostic(container: HTMLElement, placements: ScaleKeyPlacement[]) {
	for (const placement of placements) {
		await fireEvent.click(keyButtonByPlacement(container, placement));
	}
}

async function tapDescendingLocaleAgnostic(container: HTMLElement, placements: ScaleKeyPlacement[]) {
	for (let degree = 7; degree >= 1; degree -= 1) {
		await fireEvent.click(keyButtonByPlacement(container, placements[degree - 1]));
	}
}

describe('ScaleKeyboardDrill French locale (I18N-02)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('renders the prompt and register in French', () => {
		setLocale('fr');
		renderDrill({ notes: majorScaleNotes('C'), tonic: 'C' });

		expect(
			screen.getByText('Joue la gamme de C majeur en montant, puis en descendant.')
		).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGRÉ 1 SUR 8 · MONTANT');
	});

	it('renders the completion card and Recommencer button in French', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		setLocale('fr');
		const { drill } = renderDrill({ notes, tonic: 'C' });

		await tapAscendingLocaleAgnostic(drill.container, placements);
		await tapDescendingLocaleAgnostic(drill.container, placements);

		expect(screen.getByTestId('scale-keyboard-complete')).toBeInTheDocument();
		expect(
			screen.getByText('Voilà. Gamme de C majeur, montée puis descente, nickel.')
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Recommencer' })).toBeInTheDocument();
	});

	it('a tapped key\'s note letter and scale degree number render identically across locales', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);

		setLocale('en');
		const { drill: enDrill } = renderDrill({ notes, tonic: 'C' });
		const enButton = keyButtonByPlacement(enDrill.container, placements[0]);
		await fireEvent.click(enButton);
		const enLabel = enButton.textContent;
		const enAriaDegree = enButton.getAttribute('aria-label');
		enDrill.unmount();

		setLocale('fr');
		const { drill: frDrill } = renderDrill({ notes, tonic: 'C' });
		const frButton = keyButtonByPlacement(frDrill.container, placements[0]);
		await fireEvent.click(frButton);
		const frLabel = frButton.textContent;
		const frAriaDegree = frButton.getAttribute('aria-label');
		frDrill.unmount();

		// The filled note-letter chip (immune content) is identical across locales.
		expect(frLabel).toBe(enLabel);
		expect(frLabel).toContain('C');
		// The degree number embedded in the (locale-translated) aria-label is
		// the same immune digit in both languages, even though the words
		// around it ("scale degree" vs "degré de la gamme") differ.
		expect(enAriaDegree).toContain(' 1');
		expect(frAriaDegree).toContain(' 1');
	});
});
