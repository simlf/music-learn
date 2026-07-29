import { render, screen, within, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TheoryLessons from './TheoryLessons.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for the major-scale build lesson added to TheoryLessons
 * (x3-scale-lesson): a pedagogy audit found that `createScaleConstruction`
 * plus BuildSession's scale branch produced the app's only statement of the
 * major-scale step pattern (W-W-H-W-W-W-H), but were unreachable - both
 * BuildSession mount sites (`/practice`, RecallSession) only ever passed a
 * CHORD embedFact. This section makes that branch reachable from /learn by
 * embedding BuildSession directly, with a curated 3-tonic picker (C, G, F)
 * rather than the full 12-tonic MAJOR_SCALE_ROOTS set.
 *
 * The critical invariant under test (owner decision, x3-scale-lesson task):
 * this lesson must NEVER create an FSRS card. scale-formula is deliberately
 * absent from srs/facts.ts's CATALOG, and BuildSession's own
 * recordConstructionOutcome otherwise self-commits a card on every
 * completion (proven by buildSession.test.ts's "embedding seam" suite) - so
 * this file mocks `$lib/srs/deck` and asserts those mocks are NEVER called
 * through a full build, and separately asserts `$lib/practice/answerTelemetry`
 * is never reached either (no practice queue is involved: this is a /learn
 * surface, not a `/practice` family).
 *
 * Mirrors buildSession.test.ts's/interactiveLesson.test.ts's audio-mock
 * harness so BuildSession's embedded PianoKeyboard/reveal calls never throw.
 */

const getCardMock = vi.fn();
const recordGradeMock = vi.fn();
vi.mock('$lib/srs/deck', () => ({
	getCard: (...args: unknown[]) => getCardMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args)
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const playArpeggioMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
const soundEnabledMock = vi.fn();
const studyModeEnabledMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	playArpeggio: (...args: unknown[]) => playArpeggioMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	soundEnabled: (...args: unknown[]) => soundEnabledMock(...args),
	studyModeEnabled: (...args: unknown[]) => studyModeEnabledMock(...args)
}));

function scaleSection() {
	return screen.getByTestId('section-scale');
}

/**
 * Taps A, B, C, D, E, F♯, G in the order a G major construction expects them
 * (root G is pre-placed). Every key query is scoped `within(build)`: this
 * lesson section's keyboard is NOT the only one on the page - the thirds
 * lesson (InteractiveLesson) renders its own 1-octave constructable keyboard
 * a section above, which also contains keys like "A key" - so an unscoped
 * `screen.getAllByRole` would silently pick the wrong keyboard's key.
 */
async function completeGMajor() {
	await fireEvent.click(within(scaleSection()).getByRole('button', { name: 'G major' }));
	const build = within(scaleSection()).getByTestId('build-session');

	await fireEvent.click(within(build).getAllByRole('button', { name: 'A key' })[0]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'B key' })[0]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'C key' })[1]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'D key' })[1]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'E key' })[1]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'F♯ key' })[1]);
	await new Promise((resolve) => setTimeout(resolve, 700));
	await fireEvent.click(within(build).getAllByRole('button', { name: 'G key' })[1]);
	await new Promise((resolve) => setTimeout(resolve, 700));
}

beforeEach(() => {
	getCardMock.mockReset();
	recordGradeMock.mockReset();
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	playArpeggioMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
	soundEnabledMock.mockReset();
	soundEnabledMock.mockReturnValue(false);
	studyModeEnabledMock.mockReset();
	studyModeEnabledMock.mockReturnValue(false);
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('major-scale build lesson: reachability (x3-scale-lesson audit fix)', () => {
	it('renders a tonic row offering exactly C, G and F major, with no build session mounted before a tonic is picked', () => {
		render(TheoryLessons);
		const section = scaleSection();

		const row = within(section).getByTestId('scale-tonic-row');
		const chips = within(row)
			.getAllByRole('button')
			.map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
		expect(chips).toEqual(['C major', 'G major', 'F major']);

		expect(within(section).queryByTestId('build-session')).not.toBeInTheDocument();
	});

	it('tapping a tonic mounts BuildSession directly into its building state for that tonic, teaching whole/half steps', async () => {
		render(TheoryLessons);

		await fireEvent.click(
			within(scaleSection()).getByRole('button', { name: 'G major' })
		);

		const build = within(scaleSection()).getByTestId('build-session');
		expect(within(build).getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
		expect(within(build).getByTestId('build-step-line')).toHaveTextContent(
			'Take a whole step up from G.'
		);
	});

	it(
		'completing a full G major build states the exact ruler pattern the audit found unreachable, and creates no card',
		async () => {
			render(TheoryLessons);
			await completeGMajor();

			const build = within(scaleSection()).getByTestId('build-session');
			expect(within(build).getByTestId('build-complete-rule')).toHaveTextContent(
				'G major: whole, whole, half, whole, whole, whole, half.'
			);

			// The critical no-card invariant (owner decision): this lesson must
			// never touch the FSRS deck, regardless of how the construction
			// completed.
			expect(getCardMock).not.toHaveBeenCalled();
			expect(recordGradeMock).not.toHaveBeenCalled();
			expect(within(build).queryByTestId('build-fsrs-status')).not.toBeInTheDocument();

			// And it never posts a practice answer event either: this is a
			// /learn surface, not a `/practice` queue item.
			expect(recordPracticeAnswerMock).not.toHaveBeenCalled();
		},
		20000
	);

	it('tapping Next after completion returns to the tonic row rather than showing "Recall It Now" (there is nothing saved to recall)', async () => {
		render(TheoryLessons);
		await completeGMajor();

		const build = within(scaleSection()).getByTestId('build-session');
		expect(within(build).queryByRole('link', { name: 'Recall It Now' })).not.toBeInTheDocument();
		expect(within(build).queryByRole('button', { name: 'Build Another' })).not.toBeInTheDocument();

		await fireEvent.click(within(build).getByRole('button', { name: 'Next' }));

		expect(within(scaleSection()).queryByTestId('build-session')).not.toBeInTheDocument();
		expect(within(scaleSection()).getByTestId('scale-tonic-row')).toBeInTheDocument();
	}, 20000);

	it('switching to a different tonic chip mid-build remounts a fresh construction rather than keeping the stale one', async () => {
		render(TheoryLessons);
		const section = scaleSection();

		await fireEvent.click(within(section).getByRole('button', { name: 'G major' }));
		const gBuild = within(section).getByTestId('build-session');
		await fireEvent.click(within(gBuild).getAllByRole('button', { name: 'A key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(within(section).getByRole('button', { name: 'F major' }));

		const build = within(section).getByTestId('build-session');
		expect(within(build).getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
		expect(within(build).getByTestId('build-step-line')).toHaveTextContent(
			'Take a whole step up from F.'
		);
	});

	it('teaches the mechanism: the pattern is one fixed ruler transposed, never twelve separate patterns', () => {
		render(TheoryLessons);
		const text = scaleSection().textContent ?? '';

		expect(text).toContain(
			'whole, whole, half, whole, whole, whole, half'
		);
		expect(text).toMatch(/the letters change, but the gaps between them never do/);
	});

	it('renders in French with the app\'s own French unit words (ton/demi-ton) and "tons" for keys', async () => {
		setLocale('fr');
		render(TheoryLessons);

		const text = scaleSection().textContent ?? '';
		expect(text).toContain('ton, ton, demi-ton, ton, ton, ton, demi-ton');
		expect(text).toMatch(/tous les tons/);

		const chips = within(scaleSection())
			.getAllByRole('button', { name: /majeur/ })
			.map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
		expect(chips).toEqual(['C majeur', 'G majeur', 'F majeur']);
	});

	it('renders no em or en dashes in the new section copy', () => {
		render(TheoryLessons);
		expect(scaleSection().textContent).not.toMatch(/—|–/);
	});
});

/**
 * Guide tones and voice leading (guided-path unit 11). Content pin for the
 * shell-voicing pedagogy audit fix: the app already asserted the 3rd + 7th
 * shell (shellVoicing.ts) without ever teaching WHY those two notes carry a
 * chord change, and voicings.subtract.teach's old copy claimed a global
 * "3rd + 7th tritone" that was false for 3 of 5 seventh families (6a13ade).
 * This unit is the missing reason: the 7th of one chord in a ii V I falls a
 * half step to become the 3rd of the next, while the other voice holds. No
 * tritone claim appears anywhere in this unit - that mechanism belongs to
 * the dominant lesson (theory.test.ts's "only ever attributes the tritone to
 * a dominant chord" gate would fail on a guideTones key that mentioned it).
 */
describe('guide tones and voice leading (unit 11)', () => {
	function guideTonesSection() {
		return screen.getByTestId('section-guide-tones');
	}

	it('sits right after the function/ii-V-I section, the material it depends on', () => {
		render(TheoryLessons);
		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="section-"]')
		).map((element) => element.dataset.testid);

		expect(sections.indexOf('section-guide-tones')).toBe(sections.indexOf('section-function') + 1);
	});

	it('states the one idea: a falling half step, not the notes alone, is why two notes read as music', () => {
		render(TheoryLessons);
		const text = guideTonesSection().textContent ?? '';

		expect(text).toContain('The shell is two notes: the 3rd and the 7th');
		expect(text).toContain('falls a half step to become the 3rd of the next');
	});

	it('defaults to the ii chord (Dm7), lighting only its shell (F and C)', () => {
		render(TheoryLessons);
		const section = guideTonesSection();

		const chips = within(section)
			.getByTestId('guide-tone-pick-row')
			.querySelectorAll('button');
		expect(Array.from(chips).map((c) => c.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'ii Dm7',
			'V G7',
			'I Cmaj7'
		]);

		const keyboard = within(section).getByTestId('guide-tone-caption');
		expect(keyboard).toHaveTextContent(
			'F is the 3rd. It says Dm7 is minor. C is the 7th. Together, that is all Dm7 needs.'
		);

		const lit = section.querySelectorAll(
			'.piano-keyboard__key--third, .piano-keyboard__key--seventh'
		);
		expect(
			Array.from(lit).map((key) => key.querySelector('.note-label__letter')?.textContent)
		).toEqual(['F', 'C']);
	});

	it('tapping V shows the resolution into G7: F holds, C falls a half step to B', async () => {
		render(TheoryLessons);
		const section = guideTonesSection();

		await fireEvent.click(within(section).getByRole('button', { name: /G7/ }));

		expect(within(section).getByTestId('guide-tone-caption')).toHaveTextContent(
			"F holds: it was Dm7's 3rd, now it is G7's 7th. C falls one half step to B, G7's 3rd."
		);
		const lit = section.querySelectorAll(
			'.piano-keyboard__key--third, .piano-keyboard__key--seventh'
		);
		expect(
			Array.from(lit).map((key) => key.querySelector('.note-label__letter')?.textContent)
		).toEqual(['B', 'F']);
	});

	it('tapping I shows the resolution into Cmaj7: B holds, F falls a half step to E', async () => {
		render(TheoryLessons);
		const section = guideTonesSection();

		await fireEvent.click(within(section).getByRole('button', { name: /Cmaj7/ }));

		expect(within(section).getByTestId('guide-tone-caption')).toHaveTextContent(
			"B holds: it was G7's 3rd, now it is Cmaj7's 7th. F falls one half step to E, Cmaj7's 3rd."
		);
		const lit = section.querySelectorAll(
			'.piano-keyboard__key--third, .piano-keyboard__key--seventh'
		);
		expect(
			Array.from(lit).map((key) => key.querySelector('.note-label__letter')?.textContent)
		).toEqual(['E', 'B']);
	});

	it('never mentions a tritone: that mechanism belongs to the dominant lesson, not here', () => {
		render(TheoryLessons);
		expect(guideTonesSection().textContent).not.toMatch(/tritone/i);
	});

	it('"Hear it move" plays the three two-note shells in sequence, never the full triads', async () => {
		vi.useFakeTimers();
		try {
			render(TheoryLessons);
			await fireEvent.click(
				within(guideTonesSection()).getByRole('button', { name: 'Hear it move' })
			);

			expect(playChordMock).toHaveBeenCalledWith(['F', 'C']);
			vi.advanceTimersByTime(800);
			expect(playChordMock).toHaveBeenCalledWith(['B', 'F']);
			vi.advanceTimersByTime(800);
			expect(playChordMock).toHaveBeenCalledWith(['E', 'B']);
			expect(playChordMock).not.toHaveBeenCalledWith(['D', 'F', 'A', 'C']);
		} finally {
			vi.useRealTimers();
		}
	});

	it('points at the shell voicing drill as the proof, without creating a card or posting an answer event', async () => {
		render(TheoryLessons);
		const section = guideTonesSection();

		expect(section.textContent).toContain(
			'The shell voicing drill on /practice already grades this, in every key.'
		);

		await fireEvent.click(within(section).getByRole('button', { name: /G7/ }));
		await fireEvent.click(within(section).getByRole('button', { name: /Cmaj7/ }));
		await fireEvent.click(within(section).getByRole('button', { name: 'Hear it move' }));

		expect(getCardMock).not.toHaveBeenCalled();
		expect(recordGradeMock).not.toHaveBeenCalled();
		expect(recordPracticeAnswerMock).not.toHaveBeenCalled();
	});

	it('renders the whole unit in French, with musically correct terms (tons de guidage, demi-ton)', () => {
		setLocale('fr');
		render(TheoryLessons);
		const text = guideTonesSection().textContent ?? '';

		expect(text).toContain('Tons de guidage');
		expect(text).toContain(
			"Le shell, ce sont deux notes : la tierce et la septième. Joue un ii V I et la septième d'un accord descend d'un demi-ton"
		);
		expect(
			within(guideTonesSection())
				.getByTestId('guide-tone-pick-row')
				.querySelectorAll('button')
		).toHaveLength(3);
		expect(screen.getByRole('button', { name: 'Écouter le mouvement' })).toBeInTheDocument();
	});

	it('renders no em or en dashes in the new section copy', () => {
		render(TheoryLessons);
		expect(guideTonesSection().textContent).not.toMatch(/—|–/);
	});
});
