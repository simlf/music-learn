import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

	it('highlights the seven C major degrees in their degree-class colors', () => {
		render(ScalesPage);

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		for (const role of ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']) {
			expect(keyboard.querySelector(`.piano-keyboard__key--${role}`)).not.toBeNull();
		}
	});

	it('switching tonic re-spells the keyboard (D♭ major shows G♭, drops B)', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getByRole('button', { name: 'D♭ major' }));

		expect(screen.getByTestId('scale-title')).toHaveTextContent('D♭ major');
		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(within(keyboard).getAllByText('G♭').length).toBeGreaterThan(0);
		expect(within(keyboard).queryByText('B')).not.toBeInTheDocument();
	});
});

describe('scales page inspect flow', () => {
	it('shows the idle register line before any tap', () => {
		render(ScalesPage);

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('Tap a key to inspect it.');
	});

	it('tapping a scale degree plays it and names its interval from the tonic', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('A · La · M6 · sixte majeure · 9 demi-tons');
		expect(playNoteMock).toHaveBeenCalledWith('A4');
	});

	it('tapping a non-scale black key still reads from the tonic with the simpler enharmonic', async () => {
		render(ScalesPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[0]);

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('quarte augmentée');
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
