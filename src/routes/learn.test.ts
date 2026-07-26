import { render, screen, cleanup, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * LEARN-01 render/smoke test (Phase 28 Plan 04): proves the /learn hub
 * renders all three parts (Theory lessons, Scale Explore, Interval
 * Reference) on one surface, that Scale Explore is exploreOnly (no mode
 * toggle), that the Interval Reference block renders exactly five
 * IntervalView instances, that the footer CTA links to /practice, that the
 * hub renders in French, and that no em/en dashes leak into the rendered
 * copy. Mirrors theoryInteractiveLesson.test.ts's mock-then-dynamic-import
 * convention.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => true
}));

const { default: LearnPage } = await import('./learn/+page.svelte');

function renderPage() {
	return render(LearnPage);
}

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('/learn: hub structure and section presence', () => {
	it('renders the Learn hub page title', () => {
		renderPage();
		expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
	});

	it('renders the Theory section with the extracted lesson sections', () => {
		renderPage();
		const theorySection = screen.getByTestId('learn-theory');
		expect(theorySection).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-interactive-lesson')).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-symbol')).toBeInTheDocument();
		expect(within(theorySection).getByTestId('section-sevenths')).toBeInTheDocument();
	});

	it('renders the Scale Explore section with the tonic picker and no mode toggle (exploreOnly)', () => {
		renderPage();
		const exploreSection = screen.getByTestId('learn-explore');
		expect(exploreSection).toBeInTheDocument();
		expect(within(exploreSection).getByTestId('tonic-row')).toBeInTheDocument();
		expect(within(exploreSection).getByTestId('scale-title')).toBeInTheDocument();
		expect(within(exploreSection).queryByTestId('mode-toggle')).not.toBeInTheDocument();
	});

	it('renders the Interval Reference block with exactly five IntervalView instances', () => {
		renderPage();
		const intervalSection = screen.getByTestId('learn-interval-reference');
		expect(intervalSection).toBeInTheDocument();
		const views = within(intervalSection).getAllByTestId('interval-view');
		expect(views).toHaveLength(5);
	});

	it('renders the footer "Go to Practice" link to /practice', () => {
		renderPage();
		const link = screen.getByRole('link', { name: /Practice/ });
		expect(link).toHaveAttribute('href', '/practice');
	});

	it('renders all copy in French (I18N-02)', () => {
		setLocale('fr');
		renderPage();
		expect(screen.getByText('Apprendre')).toBeInTheDocument();
	});

	it('renders no em or en dashes in the page copy', () => {
		renderPage();
		expect(document.body.textContent).not.toMatch(/—|–/);
	});
});
