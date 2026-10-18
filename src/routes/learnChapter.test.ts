import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { PATH_KEY, checklistTicks } from '$lib/path/pathState';
import { consumeCompSongSeed } from '$lib/practice/compSongSeed';
import { consumeDrillSeeds } from '$lib/practice/drillSeeds';
import { SHELL_CYCLE_KEYS, positionForBar, shellCycleBars, voiceRootedShell } from '$lib/practice/shellCycle';

/**
 * /learn/[chapter]: the method-book chapter template rendering chapter 15.
 * Proves the four blocks in their fixed order, the repertoire handoffs (the
 * existing comp-song and drill-seed channels), the per-device checklist, and
 * that the exercise ticks its own checklist line after a clean cycle.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: vi.fn()
}));

const gotoMock = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: ChapterPage } = await import('./learn/[chapter]/+page.svelte');
const { load, entries } = await import('./learn/[chapter]/+page');

const CHAPTER_ID = 'shells-in-every-key';

function renderPage() {
	// The page reads only `data`; the route's other props are irrelevant here.
	return render(ChapterPage, { data: { chapterId: CHAPTER_ID } } as never);
}

beforeEach(() => {
	setLocale('en');
	localStorage.clear();
	gotoMock.mockClear();
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('/learn/[chapter] route', () => {
	it('prerenders every chapter and 404s an unknown one', () => {
		expect(entries()).toEqual([{ chapter: CHAPTER_ID }]);
		expect(load({ params: { chapter: CHAPTER_ID } } as never)).toEqual({ chapterId: CHAPTER_ID });
		expect(() => load({ params: { chapter: 'nope' } } as never)).toThrow();
	});
});

describe('chapter 15 on the four-block template', () => {
	it('renders the book chrome and the one idea', () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 1, name: 'Shells in every key' })).toBeInTheDocument();
		expect(screen.getByText('Part II · The left hand · Chapter 15')).toBeInTheDocument();
		expect(screen.getByTestId('chapter-idea').textContent).toContain('pick the order that keeps your hand still');
		expect(screen.getByRole('link', { name: 'Back to Learn' })).toHaveAttribute('href', '/learn');
	});

	it('renders Concept, At the piano, In the repertoire, Practice checklist, in that order', () => {
		renderPage();
		const blocks = ['chapter-concept', 'chapter-piano', 'chapter-repertoire', 'chapter-checklist'].map((id) =>
			screen.getByTestId(id)
		);
		for (let i = 1; i < blocks.length; i++) {
			expect(blocks[i - 1].compareDocumentPosition(blocks[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		}
		expect(within(blocks[0]).getByText('1 · Concept')).toBeInTheDocument();
		expect(within(blocks[1]).getByText('2 · At the piano')).toBeInTheDocument();
		expect(within(blocks[2]).getByText('3 · In the repertoire')).toBeInTheDocument();
		expect(within(blocks[3]).getByText('4 · Practice checklist')).toBeInTheDocument();
	});

	it('draws the concept from the engine: Autumn Leaves ii V I in B♭ with alternating positions', () => {
		renderPage();
		const columns = screen.getAllByTestId('shells-concept-column');
		expect(columns.map((column) => column.textContent?.replace(/\s+/g, ''))).toEqual([
			'Cm7iiB♭7E♭3CR3rdunder7th',
			'F7VA3E♭7FR7thunder3rd',
			'B♭maj7IA7D3B♭R3rdunder7th'
		]);
	});

	it('marks the exercise CHECKED and embeds the key-cycle drill', () => {
		renderPage();
		expect(screen.getByTestId('chapter-grading').textContent).toContain('Checked');
		expect(within(screen.getByTestId('chapter-piano')).getByTestId('shell-cycle')).toBeInTheDocument();
	});

	it('shows both tunes as changes only, with their bar strips', () => {
		renderPage();
		const tunes = screen.getAllByTestId('chapter-tune');
		expect(tunes).toHaveLength(2);
		expect(tunes[0].textContent).toContain('Autumn Leaves');
		expect(tunes[0].textContent).toContain('1945 · changes only');
		expect(within(tunes[0]).getByTestId('chapter-tune-strip').textContent).toContain('B♭maj7');
		expect(tunes[1].textContent).toContain('All the Things You Are');
		expect(tunes[1].textContent).toContain('1939 · changes only');
	});

	it('Play over it hands the bars to the comping loop on /learn', async () => {
		renderPage();
		const autumn = screen.getAllByTestId('chapter-tune')[0];
		await fireEvent.click(within(autumn).getByRole('button', { name: 'Play over it' }));
		expect(gotoMock).toHaveBeenCalledWith('/learn');
		expect(consumeCompSongSeed()).toEqual({
			songName: 'Autumn Leaves',
			symbols: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm', 'Gm']
		});
	});

	it('Drill these chords seeds each chord once and opens /practice', async () => {
		renderPage();
		const autumn = screen.getAllByTestId('chapter-tune')[0];
		await fireEvent.click(within(autumn).getByRole('button', { name: 'Drill these chords' }));
		expect(gotoMock).toHaveBeenCalledWith('/practice');
		expect(consumeDrillSeeds()).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm']);
	});

	it('self-check lines tick, persist on this device, and show no count anywhere', async () => {
		renderPage();
		const line = screen
			.getAllByTestId('checklist-item')
			.find((item) => item.dataset.item === 'eyes-off')!;
		await fireEvent.click(within(line).getByRole('checkbox'));
		expect(checklistTicks(CHAPTER_ID)).toEqual(['eyes-off']);
		cleanup();

		renderPage();
		const again = screen.getAllByTestId('checklist-item').find((item) => item.dataset.item === 'eyes-off')!;
		expect(again.dataset.ticked).toBe('true');
		expect(within(again).getByRole('checkbox')).toBeChecked();
		expect(screen.getByTestId('chapter-checklist').textContent).not.toMatch(/\d+\s*\/\s*\d+/);
	});

	it('app-checked lines have no checkbox: only the exercise ticks them', () => {
		localStorage.setItem(PATH_KEY, JSON.stringify({ checklist: { [CHAPTER_ID]: ['minor-cycle'] } }));
		renderPage();
		const lines = screen.getAllByTestId('checklist-item');
		const major = lines.find((item) => item.dataset.item === 'major-cycle')!;
		const minor = lines.find((item) => item.dataset.item === 'minor-cycle')!;
		expect(within(major).queryByRole('checkbox')).toBeNull();
		expect(major.textContent).toContain('The app ticks this');
		expect(major.dataset.ticked).toBe('false');
		expect(minor.dataset.ticked).toBe('true');
	});

	it('a clean major cycle ticks its checklist line and persists it', async () => {
		renderPage();
		const keysFor = (chroma: number) =>
			screen
				.getAllByRole('button', { name: / key(, selected)?$/ })
				.filter((key) => chromaOf((key.getAttribute('aria-label') ?? '').replace(/ key(, selected)?$/, '')) === chroma);
		for (const key of SHELL_CYCLE_KEYS.major) {
			for (const [index, bar] of shellCycleBars('major', key).entries()) {
				for (const note of voiceRootedShell(spellChord(bar.symbol), positionForBar(index)).notes) {
					const el = keysFor(chromaOf(note.letter)!)[note.octave - 4];
					fireEvent.pointerDown(el);
					fireEvent.click(el);
				}
				await fireEvent.click(screen.getByTestId('shell-cycle-check'));
			}
		}
		const major = screen.getAllByTestId('checklist-item').find((item) => item.dataset.item === 'major-cycle')!;
		expect(major.dataset.ticked).toBe('true');
		expect(checklistTicks(CHAPTER_ID)).toEqual(['major-cycle']);
	});

	it('renders in French', () => {
		setLocale('fr');
		renderPage();
		expect(screen.getByRole('heading', { level: 1, name: 'Les shells dans toutes les tonalités' })).toBeInTheDocument();
		expect(screen.getByText('1 · Concept')).toBeInTheDocument();
		expect(screen.getByText('2 · Au piano')).toBeInTheDocument();
		expect(screen.getByText('4 · Liste de travail')).toBeInTheDocument();
	});

	it('renders no em or en dashes', () => {
		for (const locale of ['en', 'fr'] as const) {
			setLocale(locale);
			const { container } = renderPage();
			expect(container.textContent).not.toMatch(/[–—]/);
			cleanup();
		}
	});
});
