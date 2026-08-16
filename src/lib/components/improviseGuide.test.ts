import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImproviseGuide from './ImproviseGuide.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

// Audio contract consumers never construct a real AudioContext in Vitest:
// the panel's keyboard is inspectable, so taps route through playNote.
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: vi.fn(() => Promise.resolve()),
	playChord: vi.fn(),
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

beforeEach(() => {
	setLocale('en');
	playNoteMock.mockClear();
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
		// The WHY names the chord tone it rubs against (E, a half step below F).
		expect(careful[0].textContent).toContain('A half step above E');
	});

	it('shows the classic avoid note over a major seventh: F careful, marked passing on the keyboard', async () => {
		render(ImproviseGuide, { chord: spellChord('Cmaj7') });
		const panel = await openPanel();

		const careful = within(panel)
			.getAllByTestId('improvise-note-row')
			.filter((row) => row.dataset.kind === 'careful');
		expect(careful.length).toBe(1);
		expect(careful[0].textContent).toContain('F');
		expect(careful[0].textContent).toContain('A half step above E');

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
