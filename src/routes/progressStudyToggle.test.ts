import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * STUDY MODE toggle test for /progress (Phase 16, Plan 04, Task 1). Mirrors
 * the SOUND toggle exactly (D-04): a verbatim sibling row in the Practice
 * Settings card. With no stored token, the page lands in `token-missing`
 * (see +page.svelte's `load()`), and the Practice Settings card still
 * renders since it sits outside the pageState conditional.
 */

vi.mock('$lib/api/client', () => ({
	getApiToken: () => '',
	setApiToken: vi.fn()
}));

vi.mock('$lib/api/progress', () => ({
	fetchStats: vi.fn(() => Promise.resolve({ items: [], weakest: [] })),
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	localDateString: () => '2026-07-16'
}));

const setStudyModeEnabledMock = vi.fn();
const setSoundEnabledMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	soundEnabled: () => false,
	setSoundEnabled: (...args: unknown[]) => setSoundEnabledMock(...args),
	studyModeEnabled: () => false,
	setStudyModeEnabled: (...args: unknown[]) => setStudyModeEnabledMock(...args)
}));

const { default: ProgressPage } = await import('./progress/+page.svelte');

beforeEach(() => {
	setStudyModeEnabledMock.mockClear();
	setSoundEnabledMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('STUDY MODE toggle on /progress (HEAR-02)', () => {
	it('renders the STUDY MODE label and a "Toggle study mode" button defaulting to STUDY MODE OFF', () => {
		render(ProgressPage);

		expect(screen.getByText('STUDY MODE')).toBeInTheDocument();
		const button = screen.getByRole('button', { name: 'Toggle study mode' });
		expect(button).toHaveTextContent('STUDY MODE OFF');
	});

	it('clicking the button flips its text to STUDY MODE ON and calls setStudyModeEnabled(true)', async () => {
		render(ProgressPage);

		const button = screen.getByRole('button', { name: 'Toggle study mode' });
		await fireEvent.click(button);

		expect(button).toHaveTextContent('STUDY MODE ON');
		expect(setStudyModeEnabledMock).toHaveBeenCalledWith(true);
	});

	it('the SOUND toggle still renders alongside it (no regression)', () => {
		render(ProgressPage);

		expect(screen.getByText('SOUND')).toBeInTheDocument();
		const soundButton = screen.getByRole('button', { name: 'Toggle sound' });
		expect(soundButton).toHaveTextContent('SOUND OFF');
	});
});
