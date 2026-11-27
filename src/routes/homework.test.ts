import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

const replaceStateMock = vi.fn();
vi.mock('$app/navigation', () => ({
	replaceState: (...a: unknown[]) => replaceStateMock(...a)
}));
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playClick: vi.fn(),
	ensureAudioReady: vi.fn(async () => {}),
	soundEnabled: () => true
}));
vi.mock('$lib/midi/midi.svelte', () => ({
	midiState: () => ({ kind: 'unsupported' }),
	connectMidi: vi.fn()
}));
vi.mock('$lib/midi/noteStream', () => ({ listenNotes: () => () => {} }));

const { default: HomeworkPage } = await import('./homework/+page.svelte');

async function open(page: string, ex: string) {
	await fireEvent.input(screen.getByTestId('homework-page'), { target: { value: page } });
	await fireEvent.input(screen.getByTestId('homework-exercise'), { target: { value: ex } });
	await fireEvent.submit(screen.getByTestId('homework-form'));
}

beforeEach(() => {
	replaceStateMock.mockClear();
	localStorage.clear();
	window.history.replaceState({}, '', '/homework');
});
afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('homework page: opening an exercise by page and number', () => {
	it('opens a rhythm exercise from the page and exercise numbers', async () => {
		render(HomeworkPage);
		await fireEvent.click(screen.getByTestId('kind-rhythm'));
		await open('2', '9');
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 2, exercise 9');
		expect(screen.getByTestId('rhythm-drill')).toBeInTheDocument();
		expect(screen.queryByTestId('homework-error')).toBeNull();
	});

	it('opens a note-reading exercise, which is the default book', async () => {
		render(HomeworkPage);
		await open('18', '2');
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 18, exercise 2');
		expect(screen.getByTestId('reading-drill')).toBeInTheDocument();
		expect(screen.getByTestId('reading-staff')).toHaveAttribute('data-clef', 'bass');
	});

	it('tolerates spaces and leading zeros', async () => {
		render(HomeworkPage);
		await open(' 05 ', '01');
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 5, exercise 1');
	});

	it('takes focus out of the text boxes so the answer keys reach the drill', async () => {
		render(HomeworkPage);
		const box = screen.getByTestId('homework-exercise');
		box.focus();
		expect(document.activeElement).toBe(box);
		await open('5', '1');
		expect(document.activeElement).not.toBe(box);
		await fireEvent.keyDown(window, { key: 'g' });
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');
	});

	it('opens with the Open button too', async () => {
		render(HomeworkPage);
		await fireEvent.input(screen.getByTestId('homework-page'), { target: { value: '6' } });
		await fireEvent.input(screen.getByTestId('homework-exercise'), { target: { value: '3' } });
		await fireEvent.click(screen.getByTestId('homework-open'));
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 6, exercise 3');
	});

	it('explains bad input', async () => {
		render(HomeworkPage);
		await open('five', '1');
		expect(screen.getByTestId('homework-error')).toHaveTextContent('whole numbers');
		expect(screen.queryByTestId('homework-exercise-view')).toBeNull();
	});

	it('names the pages that exist when the page does not', async () => {
		render(HomeworkPage);
		await open('99', '1');
		expect(screen.getByTestId('homework-error')).toHaveTextContent('Pages available: 5, 6, 18');
	});

	it('names the exercises that exist when the exercise does not', async () => {
		render(HomeworkPage);
		await open('5', '7');
		expect(screen.getByTestId('homework-error')).toHaveTextContent('Page 5 has no such exercise');
		expect(screen.getByTestId('homework-error')).toHaveTextContent('available on that page: 1, 2');
	});

	it('closes an open exercise and shows the error when a later lookup fails', async () => {
		render(HomeworkPage);
		await open('5', '1');
		await open('5', '99');
		expect(screen.queryByTestId('homework-exercise-view')).toBeNull();
		expect(screen.getByTestId('homework-error')).toBeInTheDocument();
	});

	it('clears the error after a good lookup', async () => {
		render(HomeworkPage);
		await open('99', '1');
		await open('5', '1');
		expect(screen.queryByTestId('homework-error')).toBeNull();
	});

	it('does not mix the two books: a reading page is unknown to rhythm', async () => {
		render(HomeworkPage);
		await fireEvent.click(screen.getByTestId('kind-rhythm'));
		await open('18', '1');
		expect(screen.getByTestId('homework-error')).toHaveTextContent('Pages available: 1, 2, 3, 4');
	});
});

describe('homework page: the catalog shortcuts', () => {
	it('lists every available exercise for the chosen book', () => {
		render(HomeworkPage);
		const catalog = screen.getByTestId('homework-catalog');
		for (const id of ['pick-5-1', 'pick-5-2', 'pick-6-3', 'pick-6-4', 'pick-18-1', 'pick-18-2']) {
			expect(catalog.querySelector(`[data-testid="${id}"]`)).not.toBeNull();
		}
	});

	it('opens an exercise from a shortcut and fills the boxes', async () => {
		render(HomeworkPage);
		await fireEvent.click(screen.getByTestId('pick-6-4'));
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 6, exercise 4');
		expect(screen.getByTestId('homework-page')).toHaveValue('6');
		expect(screen.getByTestId('homework-exercise')).toHaveValue('4');
	});

	it('swaps the catalog and closes the exercise when the book changes', async () => {
		render(HomeworkPage);
		await open('5', '1');
		await fireEvent.click(screen.getByTestId('kind-rhythm'));
		expect(screen.queryByTestId('homework-exercise-view')).toBeNull();
		expect(screen.getByTestId('pick-4-24')).toBeInTheDocument();
		expect(screen.getByTestId('homework-book')).toHaveTextContent('Etude du rythme');
		expect(screen.getByTestId('kind-rhythm')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('kind-reading')).toHaveAttribute('aria-pressed', 'false');
	});
});

describe('homework page: URL and memory', () => {
	it('puts the open exercise in the URL so a reload or a bookmark returns to it', async () => {
		render(HomeworkPage);
		await open('4', '21');
		await fireEvent.click(screen.getByTestId('kind-rhythm'));
		await open('4', '21');
		const last = replaceStateMock.mock.calls.at(-1)!;
		expect(String(last[0])).toBe('?book=rhythm&page=4&ex=21');
	});

	it('opens the exercise named in the URL on load', async () => {
		window.history.replaceState({}, '', '/homework?book=rhythm&page=3&ex=17');
		render(HomeworkPage);
		await Promise.resolve();
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 3, exercise 17');
		expect(screen.getByTestId('rhythm-drill')).toBeInTheDocument();
		expect(screen.getByTestId('kind-rhythm')).toHaveAttribute('aria-pressed', 'true');
	});

	it('shows the error for a URL that names a missing exercise instead of crashing', async () => {
		window.history.replaceState({}, '', '/homework?book=reading&page=5&ex=40');
		render(HomeworkPage);
		await Promise.resolve();
		expect(screen.getByTestId('homework-error')).toBeInTheDocument();
	});

	it('ignores an unknown book in the URL', async () => {
		window.history.replaceState({}, '', '/homework?book=nope');
		render(HomeworkPage);
		await Promise.resolve();
		expect(screen.getByTestId('kind-reading')).toHaveAttribute('aria-pressed', 'true');
	});

	it('still works when the router refuses replaceState', async () => {
		replaceStateMock.mockImplementation(() => {
			throw new Error('router not ready');
		});
		render(HomeworkPage);
		await open('5', '1');
		expect(screen.getByTestId('homework-exercise-title')).toBeInTheDocument();
	});

	it('shows the best score from an earlier attempt', async () => {
		localStorage.setItem(
			'music-learn:homework-log',
			JSON.stringify({ 'reading:5:1': { attempts: 3, best: 92, last: 80, at: '2026-01-01T00:00:00Z' } })
		);
		render(HomeworkPage);
		await open('5', '1');
		expect(screen.getByTestId('homework-last')).toHaveTextContent('Best 92%, attempts: 3');
	});
});

describe('homework page: language', () => {
	it('speaks French', async () => {
		setLocale('fr');
		render(HomeworkPage);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Devoirs');
		await open('5', '1');
		expect(screen.getByTestId('homework-exercise-title')).toHaveTextContent('Page 5, exercice 1');
	});
});
