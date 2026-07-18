import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

// Masthead active-link check reads $page from $app/stores (see
// drills.e2e.test.ts for the stub rationale).
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/scales') })
}));

// +layout.svelte fetches the streak through $lib/api/progress on mount.
vi.mock('$lib/api/progress', () => ({
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	localDateString: () => '2026-07-14'
}));

// Inspect taps play through the audio contract; never a real AudioContext.
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const { default: ScalesPage } = await import('../src/routes/scales/+page.svelte');
const { default: RootLayout } = await import('../src/routes/+layout.svelte');

beforeEach(() => {
	playNoteMock.mockClear();
});

describe('scales page tonic picker', () => {
	it('offers all 12 tonics and starts on C major', () => {
		render(ScalesPage);

		const row = screen.getByTestId('tonic-row');
		expect(within(row).getAllByRole('button')).toHaveLength(12);
		expect(within(row).getByRole('button', { name: 'C major' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('scale-title')).toHaveTextContent('C major');
	});

	it('renders the seven C major degrees in their degree-class colors, tonic first', () => {
		render(ScalesPage);

		const strip = screen.getByTestId('degree-strip');
		for (const role of ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']) {
			expect(strip.querySelector(`.cell--${role}`)).not.toBeNull();
		}
		// Degree 1 (the tonic) is the first cell: the anchored-run fix.
		const cells = within(strip).getAllByRole('button');
		expect(cells).toHaveLength(7);
		expect(cells[0]).toHaveClass('cell--root');
		expect(cells[0]).toHaveAttribute('aria-label', 'C degree 1');
	});

	it('a non-C scale reads left to right from its tonic, not scattered (E major: E first, D# last)', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getByRole('button', { name: 'E major' }));

		expect(screen.getByTestId('scale-title')).toHaveTextContent('E major');
		const cells = within(screen.getByTestId('degree-strip')).getAllByRole('button');
		// The live bug put E's 6th/7th (C#, D#) at the far LEFT; anchored, E is
		// first and D# is last.
		expect(cells[0]).toHaveAttribute('aria-label', 'E degree 1');
		expect(cells[6]).toHaveAttribute('aria-label', 'D♯ degree 7');
	});

	it('switching tonic re-spells the strip (D♭ major shows G♭, drops B)', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getByRole('button', { name: 'D♭ major' }));

		expect(screen.getByTestId('scale-title')).toHaveTextContent('D♭ major');
		const strip = screen.getByTestId('degree-strip');
		expect(within(strip).getAllByText('G♭').length).toBeGreaterThan(0);
		expect(within(strip).queryByText('B')).not.toBeInTheDocument();
	});
});

describe('scales page inspect flow', () => {
	it('shows the idle register line before any tap', () => {
		render(ScalesPage);

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('Tap a key to inspect it.');
	});

	it('tapping a scale degree plays it and names its interval from the tonic', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getByRole('button', { name: 'A degree 6' }));

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('A · La · M6 · sixte majeure · 9 demi-tons');
		expect(playNoteMock).toHaveBeenCalledWith('A4');
	});

	it('plays a degree that crosses the octave at its true ascending pitch (E major D# sounds D#5)', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getByRole('button', { name: 'E major' }));
		playNoteMock.mockClear();
		await fireEvent.click(screen.getByRole('button', { name: 'D♯ degree 7' }));

		// D# is the 7th of E major: higher in pitch than the tonic E4, so it
		// must sound in octave 5, not fall back to octave 4.
		expect(playNoteMock).toHaveBeenCalledWith('D#5');
	});
});

describe('scales masthead nav link', () => {
	it('the masthead exposes a Scales link routing to /scales', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const link = screen.getByRole('link', { name: 'Scales' });
		expect(link).toHaveAttribute('href', '/scales');
	});
});

describe('scales page French locale (I18N-02)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('renders the page title, tonic quality suffix, mode toggle, and idle inspect line in French', () => {
		setLocale('fr');
		render(ScalesPage);

		expect(screen.getByRole('heading', { name: 'Gammes' })).toBeInTheDocument();
		expect(screen.getByTestId('scale-title')).toHaveTextContent('C majeur');
		expect(within(screen.getByTestId('tonic-row')).getByRole('button', { name: 'C majeur' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByRole('button', { name: 'Explorer' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Pratiquer' })).toBeInTheDocument();
		expect(screen.getByTestId('inspect-register')).toHaveTextContent("Touche une note pour l'inspecter.");
	});

	it('renders a degree-strip caption (aria-label) in French while the note letter and degree number stay identical to English', () => {
		setLocale('en');
		const { unmount } = render(ScalesPage);
		const enCell = within(screen.getByTestId('degree-strip')).getAllByRole('button')[0];
		const enLabel = enCell.getAttribute('aria-label');
		const enLetter = enCell.textContent;
		unmount();

		setLocale('fr');
		render(ScalesPage);
		const frCell = within(screen.getByTestId('degree-strip')).getAllByRole('button')[0];
		const frLabel = frCell.getAttribute('aria-label');
		const frLetter = frCell.textContent;

		expect(frLabel).toBe('C degré 1');
		expect(enLabel).toBe('C degree 1');
		expect(frLetter).toBe(enLetter);
	});
});
