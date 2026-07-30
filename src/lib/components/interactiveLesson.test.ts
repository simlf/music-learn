import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InteractiveLesson from './InteractiveLesson.svelte';
import { LESSON_SEEDS_KEY } from '$lib/practice/drillSeeds';
import { setLocale } from '$lib/i18n/locale.svelte';
import { INTERVAL_NAMING_LESSON } from '$lib/lessons/intervalNamingLesson';

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

	it('no min-width in the active step can push the page sideways (regression: 375px mobile overflow bug)', () => {
		// A hardcoded `min-width: 352px` (8 keys * 44px) on this step's keyboard
		// WRAPPER once forced the mini keyboard past a 375px/320px viewport,
		// causing horizontal PAGE overflow. That is the hazard, and the wrapper
		// must still stay free to shrink with its step card.
		//
		// The one legitimate exception is PianoKeyboard's own key board, which
		// carries `minBoardWidthPx` so a white key never falls under the 44px
		// fingertip floor (measured settled in Chromium: 38.00px keys at a 320px
		// viewport, 43.00px at 360px, before that min-width existed). It cannot
		// push the page, because it sits inside `.piano-keyboard`, which is an
		// `overflow-x: auto` scroll container - so the overflow is absorbed by
		// the keyboard scrolling inside itself. Verified in a real browser at
		// 320/360/375/390px: documentElement.scrollWidth never exceeds
		// clientWidth (tests/e2e/tap-targets.spec.ts and hubs.spec.ts).
		//
		// So the rule is not "no min-width anywhere" but "nothing with a
		// min-width may be un-scrollable", which is what this asserts.
		render(InteractiveLesson);

		const activeStep = screen.getByTestId('lesson-step-0');
		for (const el of activeStep.querySelectorAll<HTMLElement>('[style]')) {
			if (!/min-width/.test(el.getAttribute('style') ?? '')) continue;

			expect(el.className, 'only the keyboard board may carry a min-width').toContain(
				'piano-keyboard__board'
			);
			expect(
				el.parentElement?.className,
				'the board must sit inside the scrolling .piano-keyboard wrapper'
			).toContain('piano-keyboard');
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

/**
 * Generalized-props coverage (unit 4, interval naming): `steps`, `seeds`,
 * `previewRole`, `subtitleKey`, `showHandoff` and `onComplete` are additive
 * over the original zero-prop thirds lesson. Every default above reproduces
 * the shipped thirds lesson byte-identically (the whole file above this
 * point renders `<InteractiveLesson />` with no props and passes unedited,
 * which IS that proof). This block exercises the props themselves using the
 * real second lesson (`INTERVAL_NAMING_LESSON`), not a synthetic fixture, so
 * a regression in either the lesson content or the generalized shell would
 * fail here.
 */
describe('InteractiveLesson generalized props (unit 4)', () => {
	async function completeIntervalNamingSteps() {
		render(InteractiveLesson, {
			props: { steps: INTERVAL_NAMING_LESSON, previewRole: 'second', showHandoff: false }
		});
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
	}

	it('renders a second lesson\'s own steps in place of the thirds lesson when `steps` is passed', () => {
		render(InteractiveLesson, { props: { steps: INTERVAL_NAMING_LESSON } });

		expect(screen.getByText('The bottom note, again')).toBeInTheDocument();
		expect(screen.queryByText('The bottom note')).not.toBeInTheDocument();
	});

	it('an augmented-second tap replaces the major-second tap under the shared "second" role (generalized replace-on-role)', async () => {
		render(InteractiveLesson, {
			props: { steps: INTERVAL_NAMING_LESSON, previewRole: 'second' }
		});
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));

		expect(document.querySelector('.piano-keyboard__key--second')?.textContent).toContain('D');

		await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));

		const secondKeys = document.querySelectorAll('.piano-keyboard__key--second');
		expect(secondKeys).toHaveLength(1);
		expect(secondKeys[0].textContent).toContain('D♯');
	});

	it('with `previewRole="second"`, "Hear it" on the augmented-second step plays the root plus D♯, not the thirds-lesson default', async () => {
		render(InteractiveLesson, {
			props: { steps: INTERVAL_NAMING_LESSON, previewRole: 'second' }
		});
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));
		playChordMock.mockClear();

		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));

		expect(playChordMock).toHaveBeenCalledWith(['C', 'D♯']);
	});

	it('with `showHandoff={false}`, finishing every step never renders the handoff card and never writes lesson seeds', async () => {
		await completeIntervalNamingSteps();

		expect(screen.queryByTestId('lesson-handoff')).not.toBeInTheDocument();
		expect(localStorage.getItem(LESSON_SEEDS_KEY)).toBeNull();
	});

	it('`onComplete` fires exactly once, the instant the last step completes, even with `showHandoff={false}`', async () => {
		const onComplete = vi.fn();
		render(InteractiveLesson, {
			props: {
				steps: INTERVAL_NAMING_LESSON,
				previewRole: 'second',
				showHandoff: false,
				onComplete: (...args: unknown[]) => onComplete(...args)
			}
		});
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'D key' }));
		await fireEvent.click(screen.getByRole('button', { name: 'D♯ key' }));
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('`subtitleKey` overrides the subtitle line without touching the shared heading', () => {
		render(InteractiveLesson, {
			props: { steps: INTERVAL_NAMING_LESSON, subtitleKey: 'theory.intervalNaming.subtitle' }
		});

		expect(screen.getByText("Play it, don't just read it")).toBeInTheDocument();
		expect(screen.queryByText('Four small steps.', { exact: false })).not.toBeInTheDocument();
	});
});
