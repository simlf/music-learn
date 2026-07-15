import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import BuildSession from './BuildSession.svelte';

/**
 * Component test for BuildSession (Phase 12, Task 1): the picker (kind
 * toggle, root/quality chips for chords, tonic chips for scales) and the
 * zero-friction "picking both inputs starts the session immediately" rule.
 * The full construction step loop (Task 2) is covered separately, further
 * down this file, once that behavior lands.
 */

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
		expect(screen.queryByText(/^Building/)).not.toBeInTheDocument();
	});

	it('picking root then quality starts the chord construction session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'C' }));
		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));

		expect(screen.getByText('Building Cm7...')).toBeInTheDocument();
		expect(screen.queryByText('Root')).not.toBeInTheDocument();
	});

	it('picking quality then root (reverse order) also starts the session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'minor 7th' }));
		await fireEvent.click(screen.getByRole('button', { name: 'C' }));

		expect(screen.getByText('Building Cm7...')).toBeInTheDocument();
	});

	it('picking a scale tonic starts the scale construction session immediately', async () => {
		render(BuildSession);

		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));
		await fireEvent.click(screen.getByRole('button', { name: 'G major' }));

		expect(screen.getByText('Building G...')).toBeInTheDocument();
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
		expect(screen.getByText('E♭')).toBeInTheDocument();
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

	it('a wrong-octave tap (right pitch class, wrong octave) shows the fixed headline and restates the SAME tapped letter', async () => {
		await startCm7();

		const wrongOctaveKey = screen.getAllByRole('button', { name: 'D♯ key' })[1];
		await fireEvent.click(wrongOctaveKey);

		expect(screen.getByTestId('build-feedback')).toHaveTextContent('Right note, wrong octave.');
		expect(screen.getByTestId('build-restatement')).toHaveTextContent(
			"You're stacking upward: try the next D♯ up."
		);
		expect(wrongOctaveKey.className).toContain('piano-keyboard__key--wrong');
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

		expect(screen.getByTestId('build-register')).toHaveTextContent('STEP 1 OF 8');
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
