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
