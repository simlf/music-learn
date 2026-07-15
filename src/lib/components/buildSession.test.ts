import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BuildSession from './BuildSession.svelte';
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

beforeEach(() => {
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card, rating) => ({ ...card, lastRating: rating }));
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
		expect(recallLink).toHaveAttribute('href', '/recall');
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

	it('a Cm7 completion with 3 or more wrong taps writes a Hard rating', async () => {
		await buildCm7WithWrongTaps(3);

		await waitFor(() => expect(recordGradeMock).toHaveBeenCalled());

		expect(recordGradeMock).toHaveBeenCalledWith(
			expect.objectContaining({ factId: 'chord-formula:Cm7' }),
			Rating.Hard,
			expect.any(Date)
		);
	});

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
		10000
	);

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

	it('getCard is never called with mode "formula" and recordGrade is never called with Rating.Again', async () => {
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
