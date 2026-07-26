import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * LEARN-02 reachability test (Phase 28 Plan 05): proves the additive "Scale
 * practice" disclosure on `/practice` is collapsed by default and, once
 * expanded, reveals a tonic picker and the reused ScaleKeyboardDrill - i.e.
 * the scale-keyboard drill is reachable through the Practice hub. `$lib/srs/deck`
 * is mocked (empty deck) so `load()` resolves deterministically to the
 * `empty-no-deck` pageState without touching IndexedDB; the disclosure
 * itself renders outside/after that pageState machine regardless of which
 * state it lands on (REG-01). Mirrors theoryInteractiveLesson.test.ts's
 * mock-then-dynamic-import convention.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => true
}));

vi.mock('$lib/srs/deck', () => ({
	getDueCards: vi.fn(() => Promise.resolve([])),
	getAllCards: vi.fn(() => Promise.resolve([])),
	introduceNewCards: vi.fn(() => Promise.resolve(0)),
	recordGrade: vi.fn()
}));

const { default: PracticePage } = await import('./practice/+page.svelte');

function renderPage() {
	return render(PracticePage);
}

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('/practice: Scale practice disclosure reachability (LEARN-02)', () => {
	it('does not render the scale-practice-card on initial render (collapsed by default)', async () => {
		renderPage();

		expect(screen.queryByTestId('scale-practice-card')).not.toBeInTheDocument();
	});

	it('renders the collapsed "Scale practice" ghost toggle with aria-expanded false', async () => {
		renderPage();

		const toggle = await screen.findByRole('button', { name: 'Scale practice' });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('expands to reveal the tonic picker and the scale keyboard drill on click', async () => {
		renderPage();

		const toggle = await screen.findByRole('button', { name: 'Scale practice' });
		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('scale-practice-card')).toBeInTheDocument();
		expect(screen.getByTestId('scale-practice-tonic-row')).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-drill')).toBeInTheDocument();
	});
});
