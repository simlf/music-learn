import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImproviseGuide from './ImproviseGuide.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

// Audio contract consumers never construct a real AudioContext in Vitest:
// the panel's keyboard is inspectable, so taps route through playNote, and the
// walk plus the caption's listen affordance route through playNotesOverChord.
const playNoteMock = vi.fn();
const playNotesOverChordMock = vi.fn();
const stopChordDemoMock = vi.fn();
let soundOn = true;
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: vi.fn(() => Promise.resolve()),
	playChord: vi.fn(),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	playNotesOverChord: (...args: unknown[]) => playNotesOverChordMock(...args),
	stopChordDemo: (...args: unknown[]) => stopChordDemoMock(...args),
	soundEnabled: () => soundOn
}));

beforeEach(() => {
	setLocale('en');
	soundOn = true;
	playNoteMock.mockClear();
	playNotesOverChordMock.mockClear();
	stopChordDemoMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

async function openPanel() {
	await fireEvent.click(screen.getByTestId('improvise-toggle'));
	return screen.getByTestId('improvise-panel');
}

/** Taps a key on the panel's keyboard by its accessible name, as a player would. */
async function tapKey(panel: HTMLElement, letter: string) {
	// A one-octave board repeats the tonic at both ends, so take the first.
	await fireEvent.click(within(panel).getAllByRole('button', { name: `${letter} key` })[0]);
	return within(panel).getByTestId('improvise-caption');
}

describe('ImproviseGuide: presence and gating', () => {
	it('renders a closed toggle for a supported chord, panel hidden until tapped', () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		expect(screen.getByTestId('improvise-toggle')).toBeInTheDocument();
		expect(screen.queryByTestId('improvise-panel')).not.toBeInTheDocument();
	});

	it('renders nothing at all for a quality with no honest answer (augmented)', () => {
		render(ImproviseGuide, { chord: spellChord('Caug') });
		expect(screen.queryByTestId('improvise-guide')).not.toBeInTheDocument();
	});

	it('opens into a scale choice, a keyboard, a walk button and an empty caption', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();

		// Three scale choices for a minor seventh, dorian selected by default.
		const chips = within(panel).getAllByTestId('improvise-scale-chip');
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
			'A dorian',
			'A natural minor (aeolian)',
			'A minor pentatonic'
		]);
		expect(chips[0]).toHaveAttribute('aria-pressed', 'true');

		// One primary action, and one caption slot waiting to be filled.
		expect(within(panel).getByTestId('improvise-walk')).toBeInTheDocument();
		expect(within(panel).getByTestId('improvise-caption').dataset.kind).toBe('idle');
		expect(within(panel).queryByTestId('improvise-caption-why')).toBeNull();
	});

	it('answers a diminished seventh with the caution line instead of scales', async () => {
		render(ImproviseGuide, { chord: spellChord('Cdim7') });
		const panel = await openPanel();
		expect(within(panel).getByTestId('improvise-dim-caution')).toBeInTheDocument();
		expect(within(panel).queryAllByTestId('improvise-scale-chip')).toEqual([]);
	});
});

describe('ImproviseGuide: the keyboard says what each note is', () => {
	/** The rendered ghost markers, paired with the tone flag driving their treatment. */
	function ghosts(panel: HTMLElement) {
		return [...panel.querySelectorAll('[data-ghost]')].map((key) => ({
			marker: key.getAttribute('data-ghost'),
			tone: key.getAttribute('data-ghost-tone')
		}));
	}

	it('flags a careful note with the vermilion tone, never with parentheses', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const marks = ghosts(panel);
		// The classic avoid note over a major seventh: the 4, flagged.
		expect(marks).toContainEqual({ marker: '11', tone: 'careful' });
		// Colors carry the same marker vocabulary with no flag.
		expect(marks).toContainEqual({ marker: '9', tone: null });
		expect(marks).toContainEqual({ marker: '13', tone: null });
		// The parenthesized marker the old legend pointed at is gone entirely.
		expect(marks.every((mark) => !mark.marker?.includes('('))).toBe(true);
	});

	it('draws the blue note on the board as an outside tone, so it can be found', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		const panel = await openPanel();
		expect(ghosts(panel)).toContainEqual({ marker: '♭7', tone: 'outside' });
	});

	it('has no careful flag anywhere on a scale that has no careful note (dorian)', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		expect(ghosts(panel).some((mark) => mark.tone === 'careful')).toBe(false);
	});

	it('rings the careful note and the chord tone it rubs, so the half step is visible', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		await tapKey(panel, 'F');

		const focus = [...panel.querySelectorAll('.piano-keyboard__key--focus-ring')];
		const clash = [...panel.querySelectorAll('.piano-keyboard__key--clash-ring')];
		expect(focus.map((key) => key.getAttribute('aria-label'))).toEqual(['F key']);
		expect(clash.map((key) => key.getAttribute('aria-label'))).toEqual(['E key']);
	});

	it('the legend names the outside tone only when the chord actually has a blue note', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		expect((await openPanel()).textContent).toContain('Dashed outline');
		cleanup();

		render(ImproviseGuide, { chord: spellChord('Am7') });
		expect((await openPanel()).textContent).not.toContain('Dashed outline');
	});
});

describe('ImproviseGuide: tap a key, read the verdict', () => {
	it('reads a chord tone as home', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'E');

		expect(caption.dataset.kind).toBe('chord-tone');
		expect(caption.textContent).toContain('chord tone');
		expect(caption.textContent).toContain('Always safe');
	});

	it('reads a color tone with the tension line that belongs to its degree', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'D');

		expect(caption.dataset.kind).toBe('color');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'One whole step above the root'
		);
	});

	it('reads a careful note by naming the chord tone it collides with and what that tone does', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'F');

		expect(caption.dataset.kind).toBe('careful');
		expect(caption.textContent).toContain('handle with care');
		// PR #75's pedagogy, unchanged: which tone (E), what it does (the 3rd),
		// and the interval that makes it rub.
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'F sits one half step above E, the 3rd'
		);
		expect(caption.textContent).toContain('minor 9th');
	});

	it('names the colliding degree per note, never one sentence reused (Bm7b5 rubs the root)', async () => {
		render(ImproviseGuide, { chord: spellChord('Bm7b5') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'C');

		expect(caption.dataset.kind).toBe('careful');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'the root the whole chord stands on'
		);
	});

	it('reads the blue note, qualified when the chord holds a tone a half step away', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		let panel = await openPanel();
		let caption = await tapKey(panel, 'A♯');
		expect(caption.dataset.kind).toBe('blue');
		expect(caption.textContent).toContain('B♭');
		expect(caption.textContent).toContain('one whole step below the root');
		expect(caption.textContent).toContain('nothing to rub against');
		cleanup();

		// Over Cmaj7 the chord's own B is a half step from it, so the claim is qualified.
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		panel = await openPanel();
		caption = await tapKey(panel, 'A♯');
		expect(caption.dataset.kind).toBe('blue');
		expect(caption.textContent).toContain('holds its own B a half step away');
	});

	it('reads a note outside the scale honestly instead of saying nothing', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		// D♯ is in neither A dorian nor the chord, and no chord tone sits a half
		// step below it (D is in the scale but not in Am7), so nothing rubs.
		const caption = await tapKey(panel, 'D♯');

		expect(caption.dataset.kind).toBe('outside');
		expect(caption.textContent).toContain('outside');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'passing through it is fine'
		);
	});

	it('an outside note that still rubs says so, with the same one rule', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		// F is outside A dorian, and it is a half step above the chord's own E.
		const caption = await tapKey(panel, 'F');

		expect(caption.dataset.kind).toBe('outside');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'one half step above E'
		);
	});

	it('folds the nuance away until asked, and only a careful note has any', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'F');

		// Not printed up front: this is what made the panel a wall of text.
		expect(within(caption).queryByTestId('improvise-caption-detail')).toBeNull();
		await fireEvent.click(within(caption).getByTestId('improvise-detail-toggle'));

		const detail = within(caption)
			.getAllByTestId('improvise-caption-detail')
			.map((line) => line.textContent)
			.join(' ');
		expect(detail).toContain('Passing between two chord tones it is normal');
		expect(detail).toContain('over C7 or in a blues, F is expected');

		// A colour tone has nothing extra to fold out.
		await tapKey(panel, 'D');
		expect(within(panel).queryByTestId('improvise-detail-toggle')).toBeNull();
	});
});

describe('ImproviseGuide: hearing it', () => {
	it('tapping a key holds the chord under it, without doubling the tapped note', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		await tapKey(panel, 'D');

		// The keyboard sounds the key itself; this panel adds only the chord.
		expect(playNoteMock).toHaveBeenCalled();
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], []);
	});

	it('walks the whole scale over a chord that is struck once and held', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		await fireEvent.click(within(panel).getByTestId('improvise-walk'));
		const [root, chordNotes, melodies, opts] = playNotesOverChordMock.mock.calls.at(-1)!;
		expect(root).toBe('C');
		expect(chordNotes).toEqual(['C', 'E', 'G', 'B']);
		expect(melodies).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
		// The left hand HOLDS the chord: that is the gesture the copy describes.
		expect(opts.sustainChord).toBe(true);
		expect(typeof opts.onStep).toBe('function');
	});

	it('the caption names each note as it sounds, without spelling out its explanation', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		await fireEvent.click(within(panel).getByTestId('improvise-walk'));
		const { onStep } = playNotesOverChordMock.mock.calls.at(-1)![3];

		onStep(3); // C ionian, step 3 = F
		await Promise.resolve();
		const caption = await within(panel).findByTestId('improvise-caption');
		expect(caption.dataset.kind).toBe('careful');
		expect(caption.textContent).toContain('F');
		// Seven explanations flickering past unread is what this replaced, and a
		// polite live region would have queued seven announcements with them.
		expect(within(caption).queryByTestId('improvise-caption-why')).toBeNull();
		expect(caption.getAttribute('aria-live')).toBe('off');

		onStep(null);
		await Promise.resolve();
		expect((await within(panel).findByTestId('improvise-caption')).dataset.kind).toBe('idle');
		expect(within(panel).getByTestId('improvise-caption').getAttribute('aria-live')).toBe('polite');
	});

	it('a plain note listens as the chord with that note over it', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		await tapKey(panel, 'D');
		playNotesOverChordMock.mockClear();

		await fireEvent.click(within(panel).getByTestId('improvise-listen-note'));
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], ['D']);
	});

	it('a rubbing note listens as the chord tone first, then the half step above it', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		await tapKey(panel, 'F');
		playNotesOverChordMock.mockClear();

		await fireEvent.click(within(panel).getByTestId('improvise-listen-compare'));
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
	});

	it('cuts a running demo when the scale choice changes, and clears what it was reading', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		await tapKey(panel, 'B');
		stopChordDemoMock.mockClear();

		const aeolian = within(panel)
			.getAllByTestId('improvise-scale-chip')
			.find((chip) => chip.textContent?.includes('aeolian'))!;
		await fireEvent.click(aeolian);
		expect(stopChordDemoMock).toHaveBeenCalled();
		expect(within(panel).getByTestId('improvise-caption').dataset.kind).toBe('idle');
	});

	it('offers no playback affordance at all when sound is off, and says why', async () => {
		soundOn = false;
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		expect(within(panel).queryByTestId('improvise-walk')).toBeNull();
		expect(within(panel).getByTestId('improvise-sound-off')).toBeInTheDocument();

		// The board still teaches: tapping a key still fills the caption.
		const caption = await tapKey(panel, 'F');
		expect(caption.dataset.kind).toBe('careful');
		expect(within(caption).queryByTestId('improvise-listen-compare')).toBeNull();
	});
});

describe('ImproviseGuide: scale switching', () => {
	it('lydian raises the 4 out of the way, so the careful flag disappears', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const lydian = within(panel)
			.getAllByTestId('improvise-scale-chip')
			.find((chip) => chip.textContent?.includes('lydian'))!;
		await fireEvent.click(lydian);
		expect(lydian).toHaveAttribute('aria-pressed', 'true');

		const flagged = [...panel.querySelectorAll('[data-ghost-tone="careful"]')];
		expect(flagged).toEqual([]);
	});

	it('aeolian surfaces the careful ♭13 against the 5th, not the 3rd', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();

		const aeolian = within(panel)
			.getAllByTestId('improvise-scale-chip')
			.find((chip) => chip.textContent?.includes('aeolian'))!;
		await fireEvent.click(aeolian);

		const caption = await tapKey(panel, 'F');
		expect(caption.dataset.kind).toBe('careful');
		expect(caption.textContent).toContain('♭13');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'F sits one half step above E, the 5th'
		);
	});
});

describe('ImproviseGuide: concept explainers', () => {
	it('folds out the four concepts, with the blue note specific to the chord own ♭7', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		const panel = await openPanel();

		await fireEvent.click(within(panel).getByTestId('improvise-concepts-toggle'));
		const concepts = within(panel).getByTestId('improvise-concepts');
		expect(concepts.textContent).toContain('Chord scale');
		expect(concepts.textContent).toContain('Tensions (9, 11, 13)');
		expect(concepts.textContent).toContain('Avoid notes');

		// The captain's own observation, answered with this chord's letters.
		const blue = within(concepts).getByTestId('improvise-blue-body');
		expect(blue.textContent).toContain('B♭ over C');
		expect(blue.textContent).toContain('C7');
	});

	it('falls back to the generic blues paragraph off the major family', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		await fireEvent.click(within(panel).getByTestId('improvise-concepts-toggle'));
		const blue = within(panel).getByTestId('improvise-blue-body');
		expect(blue.textContent).toContain('♭3');
		expect(blue.textContent).not.toContain('over A');
	});
});

describe('ImproviseGuide: locale', () => {
	it('renders the French copy with verbatim tonics and localized mode names', async () => {
		setLocale('fr');
		render(ImproviseGuide, { chord: spellChord('Am7') });
		expect(screen.getByTestId('improvise-toggle').textContent).toContain(
			'Quoi jouer par-dessus ?'
		);
		const panel = await openPanel();
		const chips = within(panel).getAllByTestId('improvise-scale-chip');
		expect(chips[0].textContent?.trim()).toBe('A dorien');
		expect(within(panel).getByTestId('improvise-walk').textContent).toContain(
			"Jouer la gamme sur l'accord"
		);
	});

	it('reads a careful note in French, naming the same colliding tone', async () => {
		setLocale('fr');
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();
		const caption = await tapKey(panel, 'F');

		expect(caption.textContent).toContain('à manier avec soin');
		expect(within(caption).getByTestId('improvise-caption-why').textContent).toContain(
			'F est un demi-ton au-dessus de E, la tierce'
		);
	});
});
