import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InteractiveLesson from './InteractiveLesson.svelte';
import { LESSON_SEEDS_KEY } from '$lib/practice/drillSeeds';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for InteractiveLesson (Phase 19, Task 2): the guided
 * do-then-check thirds lesson end to end (LEARN-01/02/03). Mirrors
 * buildSession.test.ts's audio-mock harness (playNote/playChord/
 * ensureAudioReady/soundEnabled mocked; everything else real), so grading
 * (gradeLessonTap) and the lesson-seeds localStorage round-trip are
 * exercised through the genuine modules, not stubs.
 */

const playNoteMock = vi.fn();
const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
const soundEnabledMock = vi.fn();

vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args),
	playChord: (...args: unknown[]) => playChordMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	soundEnabled: (...args: unknown[]) => soundEnabledMock(...args)
}));

beforeEach(() => {
	playNoteMock.mockReset();
	playChordMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
	soundEnabledMock.mockReset();
	soundEnabledMock.mockReturnValue(true);
	localStorage.clear();
});

/** Taps the anchor C (step 1), then the major third E (step 2), clicks
 *  Continue (step 3), then the minor third E♭ (step 4, reported as its
 *  sharp spelling "D♯" - grading is chroma-only, enharmonic-blind). */
async function completeAllSteps() {
	render(InteractiveLesson);
	await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
	await fireEvent.click(screen.getByRole('button', { name: 'E key' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
	await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));
}

describe('InteractiveLesson (LEARN-01/02/03)', () => {
	it('mounts with only the first step active, one interactive keyboard, and no other step titles doubly-active', () => {
		render(InteractiveLesson);

		expect(screen.getByText('The bottom note')).toBeInTheDocument();
		expect(screen.getAllByRole('img', { name: /piano keyboard/i })).toHaveLength(1);
	});

	it('the active step keyboard wrapper carries no fixed min-width (regression: 375px mobile overflow bug)', () => {
		// A hardcoded `min-width: 352px` (8 keys * 44px) on this wrapper once
		// forced the mini keyboard past a 375px/320px viewport, causing
		// horizontal page overflow. The wrapper must stay free to shrink with
		// its step card, matching the containment pattern the static /theory
		// lesson keyboards already rely on (PianoKeyboard's own width: 100%,
		// no min-width - see PianoKeyboard.svelte's "09-02 defect fix" note).
		render(InteractiveLesson);

		const activeStep = screen.getByTestId('lesson-step-0');
		for (const el of activeStep.querySelectorAll<HTMLElement>('[style]')) {
			expect(el.getAttribute('style') ?? '').not.toMatch(/min-width/);
		}
	});

	it('a correct tap on the anchor locks step 1 and reveals step 2', async () => {
		render(InteractiveLesson);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(screen.getByText('Why a third is four half steps')).toBeInTheDocument();
	});

	it('a wrong tap on step 2 shows the count-hint retry, does not advance, but still sounds its own key-touch note (G1: every tap sounds)', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		playNoteMock.mockClear();
		playChordMock.mockClear();

		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));

		const feedback = screen.getByTestId('lesson-feedback');
		expect(feedback.textContent).toContain('2');
		expect(feedback.textContent?.toLowerCase()).toContain('a major third is 4 half steps');
		// Every step's title always renders (locked steps show title + body
		// too, per the UI-SPEC) - the real advancement signal is which step's
		// own card still holds the live keyboard.
		expect(screen.getAllByRole('img', { name: /piano keyboard/i })).toHaveLength(1);
		const stillActiveStep = screen.getByTestId('lesson-step-1');
		expect(
			within(stillActiveStep).getByRole('img', { name: /piano keyboard/i })
		).toBeInTheDocument();
		// The wrong D tap still sounds via PianoKeyboard's own activation choke
		// point (G1 UAT fix: app-wide, every tap sounds, right or wrong); this
		// component itself never calls playNote/playChord for a wrong tap, only
		// the visual flash/hint (unchanged from before).
		expect(playNoteMock).toHaveBeenCalledTimes(1);
		expect(playNoteMock).toHaveBeenCalledWith('D4');
		expect(playChordMock).not.toHaveBeenCalled();
	});

	it('the correct major third advances to step 3 and colors E as a third on the keyboard', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'E key' }));

		expect(screen.getByText('Hear the bright one')).toBeInTheDocument();
		// Step 3's keyboard isn't constructable (targetChroma is null, a
		// hear-then-continue step), so its keys carry no button role - find
		// the earned E by its interval-color class instead.
		const thirdKey = document.querySelector('.piano-keyboard__key--third');
		expect(thirdKey?.textContent).toContain('E');
	});

	it('clicking "Hear it" on step 1 calls playNote and does not throw', async () => {
		render(InteractiveLesson);

		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));

		expect(playNoteMock).toHaveBeenCalled();
	});

	it('clicking "Hear it" on step 2 calls playChord with the root and the target third', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));

		expect(playChordMock).toHaveBeenCalledWith(['C', 'E']);
	});

	it('with sound disabled, a correct tap still advances the step, with no error thrown', async () => {
		soundEnabledMock.mockReturnValue(false);
		render(InteractiveLesson);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(screen.getByText('Why a third is four half steps')).toBeInTheDocument();
	});

	it('after completing all four steps, the handoff card renders with a real /practice link', async () => {
		await completeAllSteps();

		expect(screen.getByTestId('lesson-handoff')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: /try this in a drill/i });
		expect(link).toHaveAttribute('href', '/practice');
	});

	it('clicking the handoff CTA writes [\'C\',\'Cm\'] to the lesson-seeds localStorage key', async () => {
		await completeAllSteps();

		const link = screen.getByRole('link', { name: /try this in a drill/i });
		await fireEvent.click(link);

		expect(JSON.parse(localStorage.getItem(LESSON_SEEDS_KEY) ?? '[]')).toEqual(['C', 'Cm']);
	});

	/**
	 * T5 R1: the number + quality framing must survive all the way to the
	 * screen, not just live correctly in the data module. The rendered lesson
	 * is the app's very first theory surface, so it also sets the unit word
	 * ("half steps") every later surface reuses.
	 */
	it('renders the letters-versus-half-steps split on the major-third step, with the interval NUMBER as the emphasized span', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		const step = screen.getByTestId('lesson-step-1');
		expect(step.textContent).toContain('Letter names first: C, D, E');
		expect(step.textContent).toContain('The name counts letters, the quality counts half steps');
		// The verdigris `**...**` span is the interval number, never a note.
		expect(within(step).getByText('third')).toBeInTheDocument();
		expect(step.textContent).not.toMatch(/\bkeys up\b/);
	});

	it('keeps E♭ a third: the minor-third step still names the letters C, D, E and measures in half steps', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'E key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

		const step = screen.getByTestId('lesson-step-3');
		expect(step.textContent).toContain('Still the letters C, D, E');
		expect(step.textContent).toContain('three half steps instead of four');
		expect(step.textContent).not.toMatch(/black key is a/i);
	});

	it('the wrong-tap hint states the rule in half steps and reports the tapped count', async () => {
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));

		expect(screen.getByTestId('lesson-feedback').textContent?.trim()).toBe(
			'A major third is 4 half steps. That one was 2. Try again.'
		);
	});
});

describe('InteractiveLesson French locale (I18N-02)', () => {
	afterEach(() => {
		cleanup();
		setLocale('en');
	});

	it('renders step 1 title and the Écouter/Continuer controls in French', () => {
		setLocale('fr');
		render(InteractiveLesson);

		expect(screen.getByText('La note du bas')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Écouter' })).toBeInTheDocument();
	});

	it('renders the step 3 body with the **emphasis** span intact in French', async () => {
		setLocale('fr');
		render(InteractiveLesson);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'E key' }));

		expect(screen.getByText('tierce majeure')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Continuer' })).toBeInTheDocument();
	});

	it('a lesson chord symbol (C · Cm) renders identically across locales', async () => {
		setLocale('en');
		const { unmount } = render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'E key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
		await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));
		const enSymbol = screen.getByText('C · Cm').textContent;
		unmount();

		setLocale('fr');
		render(InteractiveLesson);
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'E key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
		await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));
		const frSymbol = screen.getByText('C · Cm').textContent;

		expect(frSymbol).toBe(enSymbol);
		expect(frSymbol).toBe('C · Cm');
	});
});
