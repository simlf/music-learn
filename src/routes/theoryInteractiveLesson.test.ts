import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * LEARN-01 placement/coexistence test (Phase 19, Plan 04): proves
 * InteractiveLesson is wired onto /theory as the FIRST section, above the
 * existing static reference lessons, and that the static sections
 * (section-symbol, section-sevenths) still render unchanged. `$lib/audio/audio`
 * is mocked since both the page's own hearResolution and InteractiveLesson
 * call into the audio engine on mount-adjacent interactions.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => true
}));

const { default: TheoryPage } = await import('./theory/+page.svelte');

function renderPage() {
	return render(TheoryPage);
}

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('/theory: interactive lesson placement and coexistence', () => {
	it('renders the interactive lesson section', () => {
		renderPage();

		expect(screen.getByTestId('section-interactive-lesson')).toBeInTheDocument();
	});

	it('places the interactive lesson section before section-symbol in document order', () => {
		renderPage();

		const sections = Array.from(document.querySelectorAll('[data-testid^="section-"]'));
		const sectionIds = sections.map((el) => el.getAttribute('data-testid'));

		expect(sectionIds[0]).toBe('section-interactive-lesson');
		expect(sectionIds).toContain('section-symbol');
		expect(sectionIds.indexOf('section-interactive-lesson')).toBeLessThan(
			sectionIds.indexOf('section-symbol')
		);
	});

	it('keeps the existing static sections rendered (coexistence, not rip-and-replace)', () => {
		renderPage();

		expect(screen.getByTestId('section-symbol')).toBeInTheDocument();
		expect(screen.getByTestId('section-sevenths')).toBeInTheDocument();
	});

	it('mounts the real InteractiveLesson component (step 1 title visible)', () => {
		renderPage();

		expect(screen.getByText('The bottom note')).toBeInTheDocument();
	});

	it('renders the theory page heading and interactive lesson step 1 in French (I18N-02)', () => {
		setLocale('fr');
		renderPage();

		expect(screen.getByText('Théorie')).toBeInTheDocument();
		expect(screen.getByText('La note du bas')).toBeInTheDocument();
	});
});
