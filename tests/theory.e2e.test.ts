import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TheoryPage from '../src/routes/theory/+page.svelte';

/** Theory has no playable keyboard; its lessons render display keyboards inline. */
function renderPage() {
	return { page: render(TheoryPage) };
}

// Masthead active-link check reads $page from $app/stores (see
// tests/masthead.e2e.test.ts for the stub rationale).
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/theory') })
}));

// Audio contract: never construct a real AudioContext in Vitest.
const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(() => Promise.resolve());
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: () => ensureAudioReadyMock(),
	playChord: (...args: unknown[]) => playChordMock(...args)
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

beforeEach(() => {
	playChordMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('theory page: six shape-first lessons', () => {
	it('renders the page title and every lesson section', () => {
		renderPage();

		expect(screen.getByRole('heading', { name: 'Theory', level: 1 })).toBeInTheDocument();
		expect(screen.getByTestId('section-symbol')).toBeInTheDocument();
		expect(screen.getByTestId('section-sevenths')).toBeInTheDocument();
		expect(screen.getByTestId('section-anchor')).toBeInTheDocument();
		expect(screen.getByTestId('section-dominant')).toBeInTheDocument();
		expect(screen.getByTestId('section-diminished')).toBeInTheDocument();
		expect(screen.getByTestId('section-solfege')).toBeInTheDocument();
	});

	it('shows real shapes: at least one display keyboard per chord lesson', () => {
		renderPage();

		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards.length).toBeGreaterThanOrEqual(5);
	});

	it('contains no em dashes anywhere in the rendered copy (D-05)', () => {
		renderPage();

		expect(document.body.textContent).not.toMatch(/—|–/);
	});
});

describe('theory page: the seventh-shapes picker', () => {
	it('starts on Cmaj7 and swaps the example when a quality is tapped', async () => {
		renderPage();
		const section = screen.getByTestId('section-sevenths');

		expect(within(section).getByText('Major triad + 7. At rest.')).toBeInTheDocument();

		await fireEvent.click(within(section).getByRole('button', { name: 'C7' }));
		expect(within(section).getByText('Major triad + ♭7. Pushes.')).toBeInTheDocument();

		await fireEvent.click(within(section).getByRole('button', { name: 'Cdim7' }));
		expect(within(section).getByText('Diminished triad + ♭♭7.')).toBeInTheDocument();
	});

	it('weaves the KEEP mnemonic in as a sidebar for the picked quality', async () => {
		renderPage();
		const section = screen.getByTestId('section-sevenths');

		await fireEvent.click(within(section).getByRole('button', { name: 'Cdim7' }));

		const aside = within(section).getByTestId('mnemonic-aside');
		expect(aside).toHaveTextContent('Minor 3rds all the way up.');
	});
});

describe('theory page: the white-key anchor', () => {
	it('tapping a diatonic seventh swaps the anchor example', async () => {
		renderPage();
		const section = screen.getByTestId('section-anchor');

		await fireEvent.click(within(section).getByRole('button', { name: 'G7' }));

		expect(within(section).getByText('The V7. Pulls home.')).toBeInTheDocument();
	});
});

describe('theory page: tappable sound through the audio contract', () => {
	it('Hear it in the dominant lesson plays the spelled G7', async () => {
		renderPage();
		const section = screen.getByTestId('section-dominant');

		await fireEvent.click(within(section).getByRole('button', { name: 'Hear it' }));

		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playChordMock).toHaveBeenCalledWith(['G', 'B', 'D', 'F']);
	});

	it('the resolution demo plays G7 first, then C major after the beat', async () => {
		vi.useFakeTimers();
		renderPage();
		const section = screen.getByTestId('section-dominant');

		await fireEvent.click(within(section).getByRole('button', { name: 'Hear G7 resolve' }));

		expect(playChordMock).toHaveBeenCalledWith(['G', 'B', 'D', 'F']);
		vi.runAllTimers();
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E', 'G']);
		vi.useRealTimers();
	});
});

describe('theory page: half versus fully diminished', () => {
	it('shows both shapes with the notation key captions', () => {
		renderPage();
		const section = screen.getByTestId('section-diminished');

		expect(within(section).getByText('Bø7 = Bm7b5. Same chord, two spellings.')).toBeInTheDocument();
		expect(within(section).getByText('B°7. The 7th flattened twice.')).toBeInTheDocument();
	});
});

describe('theory page: solfege map', () => {
	it('maps all seven letters to French syllables', () => {
		renderPage();
		const section = screen.getByTestId('section-solfege');

		for (const syllable of ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si']) {
			expect(within(section).getByText(syllable)).toBeInTheDocument();
		}
	});
});

describe('theory masthead nav link', () => {
	it('the masthead exposes a Theory link routing to /theory', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const link = screen.getByRole('link', { name: 'Theory' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/theory');
	});
});
