import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImproviseGuide from './ImproviseGuide.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

// Audio contract consumers never construct a real AudioContext in Vitest:
// the panel's keyboard is inspectable, so taps route through playNote, and the
// listen affordances route through playNotesOverChord.
const playNoteMock = vi.fn();
const playNotesOverChordMock = vi.fn();
const stopChordDemoMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: vi.fn(() => Promise.resolve()),
	playChord: vi.fn(),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	playNotesOverChord: (...args: unknown[]) => playNotesOverChordMock(...args),
	stopChordDemo: (...args: unknown[]) => stopChordDemoMock(...args)
}));

beforeEach(() => {
	setLocale('en');
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

	it('opens into chord tones, scale chips, keyboard and note rows', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();

		// The chord tones, letter chips in role colors.
		for (const letter of ['A', 'C', 'E', 'G']) {
			expect(within(panel).getAllByText(letter).length).toBeGreaterThan(0);
		}

		// Three scale choices for a minor seventh, dorian selected by default.
		const chips = within(panel).getAllByTestId('improvise-scale-chip');
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
			'A dorian',
			'A natural minor (aeolian)',
			'A minor pentatonic'
		]);
		expect(chips[0]).toHaveAttribute('aria-pressed', 'true');

		// Dorian has no careful note: every row is a color row.
		const rows = within(panel).getAllByTestId('improvise-note-row');
		expect(rows.length).toBe(3);
		expect(rows.every((row) => row.dataset.kind === 'color')).toBe(true);
	});
});

describe('ImproviseGuide: scale switching and careful notes', () => {
	it('switching to aeolian surfaces the careful ♭13 with its clash explanation', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();

		const aeolianChip = within(panel)
			.getAllByTestId('improvise-scale-chip')
			.find((chip) => chip.textContent?.includes('aeolian'))!;
		await fireEvent.click(aeolianChip);
		expect(aeolianChip).toHaveAttribute('aria-pressed', 'true');

		const careful = within(panel)
			.getAllByTestId('improvise-note-row')
			.filter((row) => row.dataset.kind === 'careful');
		expect(careful.length).toBe(1);
		expect(careful[0].textContent).toContain('F');
		expect(careful[0].textContent).toContain('♭13');
		// The WHY names the chord tone it rubs against (E, a half step below F)
		// AND what that tone does in the chord: here the 5th, not the 3rd.
		expect(careful[0].textContent).toContain('F sits one half step above E, the 5th');
		expect(careful[0].textContent).toContain('minor 9th');
		// A ♭13 over a minor seventh has no "fine on another chord" context.
		expect(within(careful[0]).queryByTestId('improvise-careful-fine-on')).toBeNull();
	});

	it('shows the classic avoid note over a major seventh: F careful, marked passing on the keyboard', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const careful = within(panel)
			.getAllByTestId('improvise-note-row')
			.filter((row) => row.dataset.kind === 'careful');
		expect(careful.length).toBe(1);
		expect(careful[0].textContent).toContain('F');
		// The classic avoid note, explained specifically: which tone it hits (E),
		// what that tone is (the 3rd), the interval (a minor 9th), the nuance
		// (passing is fine) and where the same note is expected instead (C7).
		expect(careful[0].textContent).toContain('F sits one half step above E, the 3rd');
		expect(careful[0].textContent).toContain('minor 9th');
		expect(careful[0].textContent).toContain('Passing between two chord tones it is normal');
		expect(within(careful[0]).getByTestId('improvise-careful-fine-on').textContent).toContain(
			'over C7 or in a blues, F is expected'
		);

		// The keyboard hatches the scale's non-chord tones as ghosts; the
		// careful note's marker is parenthesized ("(11)"), colors are not.
		const ghostMarkers = [...panel.querySelectorAll('[data-ghost]')].map((key) =>
			key.getAttribute('data-ghost')
		);
		expect(ghostMarkers).toContain('(11)');
		expect(ghostMarkers).toContain('9');
		expect(ghostMarkers).toContain('13');
	});

	it('answers a diminished seventh with the caution line instead of scales', async () => {
		render(ImproviseGuide, { chord: spellChord('Cdim7') });
		const panel = await openPanel();
		expect(within(panel).getByTestId('improvise-dim-caution')).toBeInTheDocument();
		expect(within(panel).queryAllByTestId('improvise-scale-chip')).toEqual([]);
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

describe('ImproviseGuide: the blue-note row', () => {
	it('answers "why does B♭ work over C" in the panel body, not only in the concepts fold', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		const panel = await openPanel();

		const row = within(panel).getByTestId('improvise-blue-row');
		expect(row.textContent).toContain('B♭');
		expect(row.textContent).toContain('one whole step below the root');
		expect(row.textContent).toContain('nothing to rub against');
	});

	it('qualifies the claim when the chord holds its own major 7th (Cmaj7)', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const row = within(panel).getByTestId('improvise-blue-row');
		expect(row.textContent).toContain('holds its own B a half step away');
	});

	it('qualifies it on a 6th chord too, naming the 6th the ♭7 rubs against (C6)', async () => {
		render(ImproviseGuide, { chord: spellChord('C6') });
		const panel = await openPanel();

		const row = within(panel).getByTestId('improvise-blue-row');
		expect(row.textContent).toContain('holds its own A a half step away');
		expect(row.textContent).not.toContain('nothing to rub against');
	});

	it('shows no blue-note row off the major family', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		expect(within(panel).queryByTestId('improvise-blue-row')).toBeNull();
	});
});

describe('ImproviseGuide: hearing it', () => {
	it('tapping a key holds the chord under it, without doubling the tapped note', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const keys = panel.querySelectorAll('[role="button"][aria-label]');
		expect(keys.length).toBeGreaterThan(0);
		await fireEvent.click(keys[0]);

		// The keyboard sounds the key itself; this panel adds only the chord.
		expect(playNoteMock).toHaveBeenCalled();
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], []);
	});

	it('a color note listens as chord plus that note', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const listen = within(panel).getAllByTestId('improvise-listen-color');
		await fireEvent.click(listen[0]);
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], ['D']);
	});

	it('a careful note listens as the chord tone first, then the half step above it', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		await fireEvent.click(within(panel).getByTestId('improvise-listen-careful'));
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
	});

	it('the blue note listens over the chord', async () => {
		render(ImproviseGuide, { chord: spellChord('C') });
		const panel = await openPanel();

		await fireEvent.click(within(panel).getByTestId('improvise-listen-blue'));
		expect(playNotesOverChordMock).toHaveBeenCalledWith('C', ['C', 'E', 'G'], ['B♭']);
	});

	it('cuts a running demo when the scale choice changes', async () => {
		render(ImproviseGuide, { chord: spellChord('Am7') });
		const panel = await openPanel();
		stopChordDemoMock.mockClear();

		const aeolian = within(panel)
			.getAllByTestId('improvise-scale-chip')
			.find((chip) => chip.textContent?.includes('aeolian'))!;
		await fireEvent.click(aeolian);
		expect(stopChordDemoMock).toHaveBeenCalled();
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
	});
});
