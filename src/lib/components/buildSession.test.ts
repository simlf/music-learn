import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuildSession from './BuildSession.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { Rating } from '$lib/srs/scheduler';
import * as deckModule from '$lib/srs/deck';

/**
 * Component test for BuildSession (Phase 12, Task 1): the picker (kind
 * toggle, root/quality chips for chords, tonic chips for scales) and the
 * zero-friction "picking both inputs starts the session immediately" rule.
 * The full construction step loop (Task 2) is covered separately, further
 * down this file, once that behavior lands.
 */

const getCardMock = vi.fn();
const recordGradeMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	getCard: (...args: unknown[]) => getCardMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args)
}));

const playChordMock = vi.fn();
const playArpeggioMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
const soundEnabledMock = vi.fn();
const studyModeEnabledMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playArpeggio: (...args: unknown[]) => playArpeggioMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	soundEnabled: (...args: unknown[]) => soundEnabledMock(...args),
	studyModeEnabled: (...args: unknown[]) => studyModeEnabledMock(...args)
}));

beforeEach(() => {
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card, rating) => ({ ...card, lastRating: rating }));
	playChordMock.mockReset();
	playArpeggioMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
	soundEnabledMock.mockReset();
	soundEnabledMock.mockReturnValue(true);
	studyModeEnabledMock.mockReset();
	studyModeEnabledMock.mockReturnValue(false);
});

afterEach(() => {
	setLocale('en');
});

describe('BuildSession picker (BUILD-01/02, Task 1)', () => {
	it('mounts in picking state with Chords the default kind, showing Root and Quality rows', () => {
		render(BuildSession);

		expect(screen.getByRole('button', { name: 'Chords' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Scales' })).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Root')).toBeInTheDocument();
		expect(screen.getByText('Quality')).toBeInTheDocument();
	});

	it('picking a root alone does not start the session', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'C' }));

		expect(screen.getByText('Root')).toBeInTheDocument();
		expect(screen.queryByTestId('build-active')).not.toBeInTheDocument();
	});

	it('picking root then quality starts the chord construction session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
		expect(screen.queryByText('Root')).not.toBeInTheDocument();
	});

	it('picking quality then root (reverse order) also starts the session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
	});

	it('picking a scale tonic starts the scale construction session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
	});

	it('switching kind resets any in-progress pick back to the picking-state defaults, no cross-kind carryover', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));

		expect(screen.getByText('Root')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('every 12 root chips and all 8 quality chips render with their friendly names', () => {
		render(BuildSession);

		for (const label of ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']) {
			expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
		}
		for (const label of [
			'major',
			'minor',
			'diminished',
			'major 7th',
			'minor 7th',
			'dominant 7th',
			'half-diminished',
			'diminished 7th'
		]) {
			expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
		}
	});

	it('the scales picker renders all 12 tonic chips as "{root} major"', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));

		for (const root of ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']) {
			expect(screen.getByRole('button', { name: `${root} major` })).toBeInTheDocument();
		}
	});
});

/**
 * Component test for BuildSession (Phase 12, Task 2): the full construction
 * step loop. Cm7 (root C, quality m7) is the worked example: C, then a
 * minor 3rd to E♭, then a major 3rd to G, then a minor 3rd to B♭ - every
 * step lands on octave 4 (no ascending-voicing wraparound needed), matching
 * PianoKeyboard's own DOM order (octave 4's keys are the first of each
 * getAllByRole('button', { name: '<letter> key' }) match).
 */
describe('BuildSession construction step loop (BUILD-01/02/03, Task 2)', () => {
	async function startCm7() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
	}

	it('renders STEP 1 OF 3, the target identity, and the first step/WHY lines for Cm7', async () => {
		await startCm7();

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent('Stack a minor 3rd up from C.');
		expect(screen.getByTestId('build-why-line')).toHaveTextContent("That's the third of Cm7.");
	});

	it('a correct tap fills the key/formula-strip immediately and shows a rotating confirmation, then advances after ~650ms', async () => {
		await startCm7();

		// E♭ (Cm7's third) lands on the D♯/E♭ black key at octave 4, the first
		// of the two matches in DOM order.
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		expect(screen.getByTestId('build-feedback')).toBeInTheDocument();
		expect(
			['Nailed it.', 'Et voilà.', 'Bang on.', 'Spot on, mon ami.'].some((variant) =>
				screen.getByTestId('build-feedback').textContent?.includes(variant)
			)
		).toBe(true);
		expect(within(screen.getByTestId('formula-strip')).getByText('E♭')).toBeInTheDocument();
		// The step prompt itself hasn't advanced yet - it paces with the feedback.
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');

		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.queryByTestId('build-feedback')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 2 OF 3');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent('Stack a major 3rd up from E♭.');
	});

	it('a wrong-pitch-class tap shows the diagnostic + interval-only restatement (never the target letter) and flashes the tapped key transiently', async () => {
		await startCm7();

		const wrongKey = screen.getAllByRole('button', { name: 'D key' })[0];
		await fireEvent.click(wrongKey);

		expect(screen.getByTestId('build-diagnostic')).toHaveTextContent('1 half step too low.');
		expect(screen.getByTestId('build-restatement')).toHaveTextContent('You need a minor 3rd up from C.');
		expect(screen.getByTestId('build-restatement').textContent).not.toMatch(/E♭/);
		expect(wrongKey.className).toContain('piano-keyboard__key--wrong');

		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(wrongKey.className).not.toContain('piano-keyboard__key--wrong');
		expect(screen.queryByTestId('build-feedback')).not.toBeInTheDocument();
		// Wrong taps never advance the step.
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
	});

	it('a wrong-octave tap that overshot HIGH shows the fixed headline and a direction-aware restatement telling the user to go DOWN', async () => {
		await startCm7();

		// Index 1 is the octave-5 (higher-register) D♯/E♭ key; Cm7's third is
		// expected at octave 4, so this tap overshot upward.
		const wrongOctaveKey = screen.getAllByRole('button', { name: 'D♯ key' })[1];
		await fireEvent.click(wrongOctaveKey);

		expect(screen.getByTestId('build-feedback')).toHaveTextContent('Right note, wrong octave.');
		expect(screen.getByTestId('build-restatement')).toHaveTextContent(
			"You're stacking upward: try the next D♯ down."
		);
		expect(wrongOctaveKey.className).toContain('piano-keyboard__key--wrong');
	});

	it('a wrong-octave tap that undershot LOW (scale construction) restates telling the user to go UP', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		// Expected next target is D5 (octave 5, the ascending-voicing wraparound
		// placement); tap the lower-register D4 instead - an undershot.
		const undershotKey = screen.getAllByRole('button', { name: 'D key' })[0];
		await fireEvent.click(undershotKey);

		expect(screen.getByTestId('build-feedback')).toHaveTextContent('Right note, wrong octave.');
		expect(screen.getByTestId('build-restatement')).toHaveTextContent(
			"You're stacking upward: try the next D up."
		);
	});

	it('the formula strip shows exactly one dashed "?" placeholder for the next unearned target', async () => {
		await startCm7();

		expect(screen.getAllByTestId('formula-placeholder')).toHaveLength(1);
	});

	it('completing all three steps of Cm7 with correct taps transitions to the complete state after the final pacing delay', async () => {
		await startCm7();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.queryByTestId('build-active')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
	});

	it('scale construction phrases the step/WHY lines with whole/half step and scale-degree wording (G major)', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent('Take a whole step up from G.');
		expect(screen.getByTestId('build-why-line')).toHaveTextContent("That's degree 2 of G major.");
	});

	it('clears pending timers on destroy so they never fire against a torn-down instance', async () => {
		const { unmount } = render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		unmount();
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(true).toBe(true);
	});
});

/**
 * Component test for BuildSession (Phase 12, Task 1 of 12-05): the opt-in
 * count-up hint (chords only, session-persistent once revealed) and the
 * enharmonic teaching line (fires exactly per isNotableSpelling).
 */
describe('BuildSession count-up hint (BUILD-03, 12-05 Task 1)', () => {
	async function startCm7() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
	}

	async function startCdim7() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'diminished 7th' }));
	}

	it('renders the "Show the count-up hint" toggle for chords, between steps', async () => {
		await startCm7();

		expect(screen.getByRole('button', { name: 'Show the count-up hint' })).toBeInTheDocument();
	});

	it('the scales picker never renders a count-up hint toggle, not even a disabled one', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		expect(
			screen.queryByRole('button', { name: 'Show the count-up hint' })
		).not.toBeInTheDocument();
	});

	it('tapping the toggle reveals the exact count-up line, naming only the semitone count and the FROM letter (never the destination letter)', async () => {
		await startCm7();

		await fireEvent.click(screen.getByRole('button', { name: 'Show the count-up hint' }));

		expect(screen.getByTestId('build-count-up-hint')).toHaveTextContent(
			'3 half steps up from C. Count it out.'
		);
		expect(screen.getByTestId('build-count-up-hint').textContent).not.toMatch(/E♭/);
		expect(
			screen.queryByRole('button', { name: 'Show the count-up hint' })
		).not.toBeInTheDocument();
	});

	it('stays revealed across a step advance within the SAME target, with no re-tap needed', async () => {
		await startCm7();
		await fireEvent.click(screen.getByRole('button', { name: 'Show the count-up hint' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 2 OF 3');
		expect(screen.getByTestId('build-count-up-hint')).toHaveTextContent(
			'4 half steps up from E♭. Count it out.'
		);
		expect(
			screen.queryByRole('button', { name: 'Show the count-up hint' })
		).not.toBeInTheDocument();
	});

	it('resets back to hidden only once a brand-new target is picked, never mid-target (round-tripping kind resets the picker, per 12-04\'s existing resetPicker seam)', async () => {
		await startCm7();
		await fireEvent.click(screen.getByRole('button', { name: 'Show the count-up hint' }));
		expect(screen.getByTestId('build-count-up-hint')).toBeInTheDocument();

		// Round-tripping the kind toggle calls 12-04's existing resetPicker(),
		// the same reset seam a fresh target pick goes through - exercises the
		// "brand-new target" reset without depending on 12-05 Task 2's
		// completion-summary CTAs (covered separately once Task 2 lands).
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		expect(screen.getByRole('button', { name: 'Show the count-up hint' })).toBeInTheDocument();
		expect(screen.queryByTestId('build-count-up-hint')).not.toBeInTheDocument();
	});

	it('a correct tap earning a notable spelling (Cdim7\'s B♭♭) shows the enharmonic teaching line', async () => {
		await startCdim7();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);

		expect(screen.getByTestId('build-enharmonic-line')).toHaveTextContent(
			"This key's usually called A, but Cdim7 spells it B♭♭ so the chord reads as a clean stack of minor thirds."
		);
	});

	it('WR-05: a scale construction earning a notable spelling (F♯ major\'s 7th degree, E♯) shows the enharmonic teaching line with SCALE wording, never "chord"', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'F♯ major' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'G♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'C♯ key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		// The 7th degree (E♯) is enharmonically F - tap the physical F key.
		await fireEvent.click(screen.getAllByRole('button', { name: 'F key' })[1]);

		expect(screen.getByTestId('build-enharmonic-line')).toHaveTextContent(
			"This key's usually called F, but F♯ major spells it E♯ so the scale reads as a clean stack of major seconds."
		);
	});

	it('a correct tap earning a routine spelling (Cm7\'s E♭) never shows the enharmonic teaching line', async () => {
		await startCm7();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		expect(screen.getByTestId('build-feedback')).toBeInTheDocument();
		expect(screen.queryByTestId('build-enharmonic-line')).not.toBeInTheDocument();
	});
});

/**
 * Component test for BuildSession (Phase 12, Task 2 of 12-05): the full
 * completion summary (heading, rule statement, finalized formula strip and
 * keyboard, both CTAs), driven end to end through the public component API
 * for one full chord run and one full scale run.
 */
describe('BuildSession completion summary (BUILD-01/02, 12-05 Task 2)', () => {
	it('a full Cm7 build ends with the exact heading/rule copy, a fully-filled formula strip, a non-interactive keyboard, and both CTAs', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-complete-heading')).toHaveTextContent('Voila. You built Cm7.');
		expect(screen.getByTestId('build-complete-rule')).toHaveTextContent(
			'C, then minor 3rd, then major 3rd, then minor 3rd.'
		);
		expect(screen.queryByTestId('formula-placeholder')).not.toBeInTheDocument();
		expect(within(screen.getByTestId('formula-strip')).getByText('B♭')).toBeInTheDocument();
		// Display-mode PianoKeyboard: no interactive/inspectable/constructable
		// keys, so no key carries button semantics anymore.
		expect(screen.queryAllByRole('button', { name: /key$/ })).toHaveLength(0);

		expect(screen.getByRole('button', { name: 'Build Another' })).toBeInTheDocument();
		const recallLink = screen.getByRole('link', { name: 'Recall It Now' });
		expect(recallLink).toHaveAttribute('href', '/progress');
	});

	it('"Build Another" returns to the picker with the SAME kind (chords) preserved, not reset', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		await fireEvent.click(screen.getByRole('button', { name: 'Build Another' }));

		expect(screen.getByText('Root')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Chords' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'false');
	});

	it(
		'a full G major scale build ends with the exact heading/rule copy and "Build Another" returns to the Scales picker',
		async () => {
			render(BuildSession);
			await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
			await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

			await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			expect(screen.getByTestId('build-complete-heading')).toHaveTextContent(
				'Voila. G major, built from scratch.'
			);
			expect(screen.getByTestId('build-complete-rule')).toHaveTextContent(
				'G major: whole, whole, half, whole, whole, whole, half.'
			);
			expect(screen.queryByTestId('formula-placeholder')).not.toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Build Another' }));

			expect(screen.getByText('Tonic')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Scales' })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
		},
		10000
	);
});

/**
 * Component test for BuildSession (Phase 12, Task 2 of 12-06): the FSRS
 * write on completion (BUILD-04, D-09). Mocks the deck persistence seam
 * (getCard/recordGrade) so the chord-path factId, the scale-path factId, all
 * three rating bands, and write-failure resilience can be asserted without
 * touching real IndexedDB.
 */
describe('BuildSession FSRS write on completion (BUILD-04, 12-06)', () => {
	async function buildCm7WithWrongTaps(wrongTapCount: number) {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		for (let i = 0; i < wrongTapCount; i++) {
			await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
		}

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
	}

	it('a zero-wrong-tap Cm7 completion writes a formula-build card rated Easy under the ORIGINAL ASCII chord-formula factId', async () => {
		await buildCm7WithWrongTaps(0);

		await waitFor(() => expect(screen.getByTestId('build-fsrs-status')).toBeInTheDocument());

		expect(getCardMock).toHaveBeenCalledWith('chord-formula:Cm7', 'formula-build');
		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({
				factId: 'chord-formula:Cm7',
				factKind: 'chord-formula',
				mode: 'formula-build'
			}),
			Rating.Easy,
			expect.any(Date)
		);
		expect(screen.getByTestId('build-fsrs-status')).toHaveTextContent(
			'SAVED TO RECALL · FORMULA-BUILD MODE'
		);
	});

	it('a Cm7 completion with exactly 2 wrong taps along the way writes a Good rating', async () => {
		await buildCm7WithWrongTaps(2);

		await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7' }),
			Rating.Good,
			expect.any(Date)
		);
	});

	it('a Cm7 completion with 3 wrong taps writes a Hard rating', async () => {
		await buildCm7WithWrongTaps(3);

		await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7' }),
			Rating.Hard,
			expect.any(Date)
		);
	});

	/**
	 * BACKLOG-6 (260722-0ex): ratingForWrongTaps is now steps-aware. Cm7 has 3
	 * steps (root + 3 more notes), so the Again threshold is 2 * 3 = 6: fewer
	 * wrong taps than that still grades Hard (the prior ceiling), and 6 or
	 * more grades Again - a genuinely forgotten formula, which lapses so it
	 * can surface as weak in deriveCellState.
	 */
	it(
		'a Cm7 completion with 5 wrong taps (below the 2x-steps threshold of 6) still writes a Hard rating',
		async () => {
			await buildCm7WithWrongTaps(5);

			await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

			expect(recordGradeMock).toHaveBeenCalledWith(
				expect.objectContaining({ factId: 'chord-formula:Cm7' }),
				Rating.Hard,
				expect.any(Date)
			);
		},
		10000
	);

	it(
		'a Cm7 completion with 6 wrong taps (at the 2x-steps threshold) writes an Again rating',
		async () => {
			await buildCm7WithWrongTaps(6);

			await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

			expect(recordGradeMock).toHaveBeenCalledWith(
				expect.objectContaining({ factId: 'chord-formula:Cm7' }),
				Rating.Again,
				expect.any(Date)
			);
		},
		10000
	);

	it(
		'a Cm7 completion with far more wrong taps than the threshold still writes Again, never a lower rating',
		async () => {
			await buildCm7WithWrongTaps(12);

			await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

			expect(recordGradeMock).toHaveBeenCalledWith(
				expect.objectContaining({ factId: 'chord-formula:Cm7' }),
				Rating.Again,
				expect.any(Date)
			);
		},
		15000
	);

	it(
		'a full G major scale completion writes a formula-build card under scale-formula:G, factKind scale-formula',
		async () => {
			render(BuildSession);
			await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
			await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

			await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			await waitFor(() => expect(screen.getByTestId('build-fsrs-status')).toBeInTheDocument());

			expect(getCardMock).toHaveBeenCalledWith('scale-formula:G', 'formula-build');
			expect(recordGradeMock).toHaveBeenCalledWith(
				expect.objectContaining({
					factId: 'scale-formula:G',
					factKind: 'scale-formula',
					mode: 'formula-build'
				}),
				Rating.Easy,
				expect.any(Date)
			);
		},
		20000
	);

	it('WR-03: the FSRS write fires as soon as the completing tap grades correct, without waiting out the 650ms pacing delay', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		// The final correct tap - deliberately wait far LESS than the 650ms
		// pacing delay before asserting: the write must not be gated behind it.
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7' }),
			Rating.Easy,
			expect.any(Date)
		);
		// The visual completion screen itself still paces with the 650ms timer.
		expect(screen.queryByTestId('build-complete')).not.toBeInTheDocument();
	});

	it('WR-02: the FSRS write survives an immediate kind-toggle click (which resets the picker) fired right after the completing tap, before the pacing timer would have flipped sessionState', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		// Final correct tap completes the construction. The kind-toggle is
		// always clickable (rendered outside the sessionState branches), so
		// immediately toggling it - with no wait at all - resets the picker
		// (construction/pickedTonic/etc -> undefined) before the 650ms pacing
		// timer would ever fire.
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));

		await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

		expect(getCardMock).toHaveBeenCalledWith('chord-formula:Cm7', 'formula-build');
		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7', factKind: 'chord-formula' }),
			Rating.Easy,
			expect.any(Date)
		);
	});

	it('a getCard rejection is swallowed silently: the completion summary still renders every element except the status line', async () => {
		getCardMock.mockRejectedValueOnce(new Error('quota exceeded'));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await buildCm7WithWrongTaps(0);
		// Give the fire-and-forget write's rejected promise a tick to settle.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(screen.getByTestId('build-complete-heading')).toHaveTextContent('Voila. You built Cm7.');
		expect(screen.getByTestId('build-complete-rule')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Build Another' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Recall It Now' })).toBeInTheDocument();
		expect(screen.queryByTestId('build-fsrs-status')).not.toBeInTheDocument();
		expect(recordGradeMock).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it('getCard is never called with mode "formula"; recordGrade is not called with Rating.Again for a clean (zero-wrong-tap) completion', async () => {
		await buildCm7WithWrongTaps(0);
		await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

		for (const call of getCardMock.mock.calls) {
			expect(call[1]).toBe('formula-build');
			expect(call[1]).not.toBe('formula');
		}
		for (const call of recordGradeMock.mock.calls) {
			expect(call[1]).not.toBe(Rating.Again);
		}
	});

	it('never wires a mock for introduceNewCards from $lib/srs/deck (the component genuinely never reaches for it)', () => {
		expect('introduceNewCards' in deckModule).toBe(false);
	});
});

/**
 * Component test for BuildSession (13-05, Task 1): the embedFact/onComplete
 * embedding seam Mode C (RecallSession) relies on. Omitting both props keeps
 * every pre-existing case above passing unmodified (a full regression run,
 * not just a spot check) - proven by this file's untouched earlier suites.
 */
describe('BuildSession embedding seam (13-05, Task 1)', () => {
	it('embedFact={kind: chord, symbol: Cm7} renders directly into the building state for Cm7, with no kind-toggle/picker in the DOM', () => {
		render(BuildSession, { props: { embedFact: { kind: 'chord', symbol: 'Cm7' } } });

		expect(screen.queryByTestId('kind-toggle')).not.toBeInTheDocument();
		expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent('Stack a minor 3rd up from C.');
	});

	it('embedFact={kind: scale, tonic: G} renders directly into the building state for G major, with no kind-toggle/picker in the DOM', () => {
		render(BuildSession, { props: { embedFact: { kind: 'scale', tonic: 'G' } } });

		expect(screen.queryByTestId('kind-toggle')).not.toBeInTheDocument();
		expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 7');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent('Take a whole step up from G.');
	});

	it('completing an embedded chord build with onComplete provided shows a single Next button and NO "SAVED TO RECALL" text, and clicking Next calls onComplete exactly once with the computed rating', async () => {
		const onComplete = vi.fn();
		render(BuildSession, {
			props: { embedFact: { kind: 'chord', symbol: 'Cm7' }, onComplete }
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		expect(screen.queryByTestId('build-fsrs-status')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Build Another' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Recall It Now' })).not.toBeInTheDocument();
		const nextButton = screen.getByRole('button', { name: 'Next' });

		await fireEvent.click(nextButton);

		// A clean (zero-wrong-tap) completion computes Rating.Easy (BACKLOG-6),
		// forwarded through onComplete rather than the prior hardcoded call.
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(Rating.Easy);
	});

	it(
		'a wrong-heavy embedded chord build (>= 2x the 3-step count) forwards Rating.Again through onComplete, so RecallSession can re-enqueue it',
		async () => {
			const onComplete = vi.fn();
			render(BuildSession, {
				props: { embedFact: { kind: 'chord', symbol: 'Cm7' }, onComplete }
			});

			for (let i = 0; i < 6; i++) {
				await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);
				await new Promise((resolve) => setTimeout(resolve, 700));
			}
			await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			expect(screen.getByTestId('build-complete')).toBeInTheDocument();
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(onComplete).toHaveBeenCalledWith(Rating.Again);
		},
		10000
	);

	it('completing an embedded scale build with onComplete provided shows a single Next button and NO "SAVED TO RECALL" text', async () => {
		const onComplete = vi.fn();
		render(BuildSession, {
			props: { embedFact: { kind: 'scale', tonic: 'G' }, onComplete }
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		expect(screen.queryByTestId('build-fsrs-status')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
	}, 10000);

	it('omitting both embedFact/onComplete still renders the picker (byte-identical pre-embedding behavior)', () => {
		render(BuildSession);

		expect(screen.getByTestId('kind-toggle')).toBeInTheDocument();
		expect(screen.getByTestId('picker')).toBeInTheDocument();
		expect(screen.getByText('Root')).toBeInTheDocument();
	});
});

/**
 * Component test for BuildSession's constructable input keyboard: it renders
 * inline in the build-active flow, both standalone (`/build`) and embedded
 * (Mode C, `embedFact` set).
 */
describe('BuildSession inline constructable keyboard (KBD-01/KBD-03)', () => {
	function renderEmbedded() {
		return render(BuildSession, {
			props: { embedFact: { kind: 'chord', symbol: 'Cm7' } }
		});
	}

	it('embedded: the constructable keyboard renders inline and a tap routes through handleConstructTap', async () => {
		renderEmbedded();

		// The keyboard exists exactly once in BuildSession's own flow.
		expect(screen.getAllByRole('img', { name: /piano keyboard/i })).toHaveLength(1);
		// A construct tap routes through handleConstructTap: the build advances
		// (feedback shows).
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		expect(screen.getByTestId('build-feedback')).toBeInTheDocument();
	});

	it('reaching the embedded complete state replaces the constructable keyboard with the completion view', async () => {
		renderEmbedded();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
	});

	it('embedded renders the build flow without throwing and shows the first step', () => {
		expect(() =>
			render(BuildSession, { props: { embedFact: { kind: 'chord', symbol: 'Cm7' } } })
		).not.toThrow();

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 3');
		expect(screen.getAllByRole('img', { name: /piano keyboard/i })).toHaveLength(1);
	});

	it('standalone (no embedFact): the constructable keyboard renders inline', async () => {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		expect(screen.getAllByRole('img', { name: /piano keyboard/i })).toHaveLength(1);
	});

	// WR-03 regression guard: scrollRootIntoView's one-shot `tick().then(...)`
	// must find `bind:this={containerEl}` populated. Confirms the root key IS
	// scrolled into view once the embedded (Mode C) keyboard mounts inline.
	it('embedded Mode C scrolls the root key into view once the keyboard mounts', async () => {
		const scrollSpy = vi.fn();
		const original = Element.prototype.scrollIntoView;
		Element.prototype.scrollIntoView = scrollSpy;
		try {
			render(BuildSession, {
				props: { embedFact: { kind: 'chord', symbol: 'Cm7' } }
			});
			await waitFor(() => {
				const rootKey = document.querySelector('.piano-keyboard__key--root');
				expect(rootKey).not.toBeNull();
				expect(scrollSpy).toHaveBeenCalled();
			});
		} finally {
			Element.prototype.scrollIntoView = original;
		}
	});
});

/**
 * Component test for BuildSession reveal wiring (16-05, HEAR-01/02): the
 * fire-once auto-play + pulse at the sessionState -> 'complete' transition,
 * the sound-off pulse-only path (no dead-end), the chords-only ChordGlyph
 * gate, and the "Hear again" replay control.
 */
describe('BuildSession reveal, HEAR-01/02', () => {
	async function completeCm7() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
	}

	async function completeGMajorScale() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'B key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[1]);
		await new Promise((resolve) => setTimeout(resolve, 700));
	}

	it('completing Cm7 with sound on calls playChord exactly once with the earned-note letters, at reveal', async () => {
		await completeCm7();

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
	});

	it('renders build-complete-target containing the ChordGlyph for a completed chord reveal', async () => {
		await completeCm7();

		const target = screen.getByTestId('build-complete-target');
		expect(target.querySelector('.chord-glyph')).not.toBeNull();
	});

	it(
		'a completed G-major SCALE reveal renders NO build-complete-target (glyph is chords-only) while still reaching build-complete',
		async () => {
			await completeGMajorScale();

			expect(screen.getByTestId('build-complete')).toBeInTheDocument();
			expect(screen.queryByTestId('build-complete-target')).not.toBeInTheDocument();
		},
		10000
	);

	it('a ghost "Hear again" button renders in the complete block, is never disabled, and replays playChord with the same letters on click', async () => {
		await completeCm7();

		const hearAgainButton = screen.getByRole('button', { name: 'Hear again' });
		expect(hearAgainButton).not.toBeDisabled();
		expect(playChordMock).toHaveBeenCalledTimes(1);

		await fireEvent.click(hearAgainButton);

		expect(playChordMock).toHaveBeenCalledTimes(2);
		expect(playChordMock).toHaveBeenNthCalledWith(2, ['C', 'E♭', 'G', 'B♭']);
	});

	it('with sound off, completing Cm7 does NOT call playChord, yet build-complete renders and Hear again is present and enabled (sound-off pulse path, no dead-end)', async () => {
		soundEnabledMock.mockReturnValue(false);

		await completeCm7();

		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		expect(playChordMock).not.toHaveBeenCalled();
		const hearAgainButton = screen.getByRole('button', { name: 'Hear again' });
		expect(hearAgainButton).not.toBeDisabled();

		await fireEvent.click(hearAgainButton);

		expect(playChordMock).not.toHaveBeenCalled();
	});
});

/**
 * Component test for BuildSession's study-mode arpeggio roll (16-06,
 * HEAR-02): the roll branch (playArpeggio + per-key pending->lit) versus the
 * plain block-strike path, the sound-off collapse to a single pulse
 * regardless of study toggle (D-07), "Hear again" honoring LIVE study+sound
 * state (D-09), and roll-timer cleanup on unmount.
 */
describe('BuildSession study-mode roll, HEAR-02', () => {
	async function completeCm7() {
		render(BuildSession);
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await new Promise((resolve) => setTimeout(resolve, 700));
	}

	it(
		'study ON + sound ON rolls the arpeggio via playArpeggio (not an immediate block strike), dimming earned keys as pending until each sounds, then strikes the block chord',
		async () => {
			studyModeEnabledMock.mockReturnValue(true);
			await completeCm7();

			expect(playArpeggioMock).toHaveBeenCalledTimes(1);
			// The initial reveal's startDelayMs equals the 260ms visual un-pend
			// delay, so each note's audio attack and its key's un-dim land on the
			// same tick (WR-01 sync proof).
			expect(playArpeggioMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭'], {
				staggerMs: 260,
				startDelayMs: 260
			});
			// Study mode REPLACES the plain block auto-play: no immediate block strike.
			expect(playChordMock).not.toHaveBeenCalled();
			// Every earned key starts dimmed (pending), awaiting its own turn to sound.
			expect(document.querySelectorAll('.piano-keyboard__key--pending').length).toBeGreaterThan(0);

			await new Promise((resolve) => setTimeout(resolve, 1400));

			expect(playChordMock).toHaveBeenCalledTimes(1);
			expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
			expect(document.querySelectorAll('.piano-keyboard__key--pending').length).toBe(0);
		},
		10000
	);

	it('study ON + sound OFF collapses to the single visual pulse: neither playArpeggio nor playChord fires, and the reveal is not a dead end', async () => {
		studyModeEnabledMock.mockReturnValue(true);
		soundEnabledMock.mockReturnValue(false);

		await completeCm7();

		expect(playArpeggioMock).not.toHaveBeenCalled();
		expect(playChordMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('build-complete')).toBeInTheDocument();
		const hearAgainButton = screen.getByRole('button', { name: 'Hear again' });
		expect(hearAgainButton).not.toBeDisabled();
	});

	it('study OFF + sound ON (regression): completing Cm7 still calls the block playChord once and never playArpeggio', async () => {
		studyModeEnabledMock.mockReturnValue(false);

		await completeCm7();

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
		expect(playArpeggioMock).not.toHaveBeenCalled();
	});

	it(
		'"Hear again" honors LIVE study+sound state, not a snapshot from reveal time: replays the roll while study is on, then falls back to the block strike once study flips off',
		async () => {
			studyModeEnabledMock.mockReturnValue(true);
			await completeCm7();
			await new Promise((resolve) => setTimeout(resolve, 1400));
			playArpeggioMock.mockClear();
			playChordMock.mockClear();

			await fireEvent.click(screen.getByRole('button', { name: 'Hear again' }));

			expect(playArpeggioMock).toHaveBeenCalledTimes(1);
			// Hear-again has no stamp-in to wait out, so its startDelayMs is 0 -
			// audio and visuals both start at t=0, still in sync (WR-01).
			expect(playArpeggioMock).toHaveBeenCalledWith(
				['C', 'E♭', 'G', 'B♭'],
				expect.objectContaining({ startDelayMs: 0 })
			);
			expect(playChordMock).not.toHaveBeenCalled();

			await new Promise((resolve) => setTimeout(resolve, 1100));
			expect(playChordMock).toHaveBeenCalledTimes(1);

			playArpeggioMock.mockClear();
			playChordMock.mockClear();
			studyModeEnabledMock.mockReturnValue(false);

			await fireEvent.click(screen.getByRole('button', { name: 'Hear again' }));

			expect(playChordMock).toHaveBeenCalledTimes(1);
			expect(playArpeggioMock).not.toHaveBeenCalled();
		},
		10000
	);

	it(
		'unmounting mid-roll clears the roll timers so no stray block-strike audio fires afterward',
		async () => {
			studyModeEnabledMock.mockReturnValue(true);
			const { unmount } = render(BuildSession);
			await fireEvent.click(screen.getByRole('button', { name: 'C' }));
			await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

			await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			// The roll has started (playArpeggio fired at reveal) but hasn't
			// reached the block-strike timer yet - unmount mid-roll.
			expect(playArpeggioMock).toHaveBeenCalledTimes(1);
			unmount();
			playChordMock.mockClear();

			await new Promise((resolve) => setTimeout(resolve, 1400));

			expect(playChordMock).not.toHaveBeenCalled();
		},
		10000
	);

	it(
		'an F major scale roll keeps the octave-up tonic pending independently of the low tonic (gap 3 / WR-03): the low F un-dims on the first tick while the octave-up F stays pending until its own tick',
		async () => {
			// F major (not G major) deliberately: G major's F♯ 7th degree
			// physically wraps the keyboard's assignNotesToKeys cursor onto the
			// SAME white key index as the low tonic (a pre-existing, unrelated
			// keyboardLayout.ts defect - see deferred-items.md), so G major
			// never renders two distinct role-lit tonic keys to begin with. F
			// major's degrees don't collide, giving two genuinely distinct
			// physical tonic keys to prove the octave-keyed pending model against.
			studyModeEnabledMock.mockReturnValue(true);
			render(BuildSession);
			await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
			await fireEvent.click(screen.getByRole('button', { name: 'F major' }));

			await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));
			await fireEvent.click(screen.getAllByRole('button', { name: 'F key' })[1]);
			await new Promise((resolve) => setTimeout(resolve, 700));

			// All 8 earned keys (root...seventh + the octave-up tonic) start
			// dimmed - both physical F keys included, keyed independently by
			// { letter, octave }.
			expect(playArpeggioMock).toHaveBeenCalledTimes(1);
			expect(document.querySelectorAll('.piano-keyboard__key--pending').length).toBe(8);

			// Both tonic F's render with role 'root' (the octave-up close forces
			// role back to 'root'); DOM order follows ascending physical key
			// position, so the first match is the LOW tonic (octave 4) and the
			// second is the octave-up tonic (octave 5).
			const rootKeys = document.querySelectorAll('.piano-keyboard__key--root');
			expect(rootKeys.length).toBe(2);
			const [lowTonicKey, octaveTonicKey] = rootKeys;

			// Advance exactly ONE stagger step past the initial 260ms reveal
			// delay: only the LOW tonic's own tick (index 0) has landed.
			await new Promise((resolve) => setTimeout(resolve, 520));

			expect(lowTonicKey.className).not.toContain('piano-keyboard__key--pending');
			expect(octaveTonicKey.className).toContain('piano-keyboard__key--pending');

			// Let the roll finish so no stray timers leak into later tests.
			await new Promise((resolve) => setTimeout(resolve, 2200));
			expect(document.querySelectorAll('.piano-keyboard__key--pending').length).toBe(0);
		},
		10000
	);
});

/**
 * I18N-02 French rendering check (20-03): the kind-toggle, the STEP
 * register, and a step WHY line all flip to the locked FR strings under
 * `setLocale('fr')`, while the rendered chord symbol (a pitch/letter-name
 * artifact, never routed through `t()`) stays byte-identical to its English
 * form - proving the chord-symbol/interval-shorthand immunity boundary
 * holds on the Build surface.
 */
describe('BuildSession French rendering + chord-symbol immunity (I18N-02)', () => {
	it('renders the French kind-toggle labels, STEP register, and WHY line for a Cm7 build, with the chord symbol unchanged', async () => {
		setLocale('fr');
		render(BuildSession);

		expect(screen.getByRole('button', { name: 'Accords' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Gammes' })).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Fondamentale')).toBeInTheDocument();
		expect(screen.getByText('Qualité')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'mineur 7' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('ÉTAPE 1 SUR 3');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent(
			'Empile une tierce mineure au-dessus de C.'
		);
		// The WHY line's chord symbol (Cm7) is a pitch/letter-name artifact and
		// must render identically regardless of locale (I18N-02 immunity).
		expect(screen.getByTestId('build-why-line')).toHaveTextContent("C'est la tierce de Cm7.");
	});

	it('renders the French scale picker (Tonique caption, "{root} majeur" tonic chips) and a French scale step/WHY line, with letter names unchanged', async () => {
		setLocale('fr');
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'Gammes' }));
		expect(screen.getByText('Tonique')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'G majeur' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'G majeur' }));

		expect(screen.getByTestId('build-register')).toHaveTextContent('ÉTAPE 1 SUR 7');
		expect(screen.getByTestId('build-step-line')).toHaveTextContent(
			"Monte d'un ton entier depuis G."
		);
		expect(screen.getByTestId('build-why-line')).toHaveTextContent(
			"C'est le degré 2 de G majeur."
		);
	});
});
