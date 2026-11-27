import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MetronomeControls from './MetronomeControls.svelte';
import { HW_TEMPO_MAX, HW_TEMPO_MIN } from '$lib/homework/tempo';

afterEach(cleanup);

function setup(props: Partial<{ bpm: number; countInBars: number; lockTempo: boolean; lockCountIn: boolean; showCountIn: boolean }> = {}) {
	const onBpm = vi.fn();
	const onCountIn = vi.fn();
	render(MetronomeControls, { bpm: 70, countInBars: 1, onBpm, onCountIn, ...props });
	return { onBpm, onCountIn };
}

describe('MetronomeControls', () => {
	it('shows the tempo', () => {
		setup({ bpm: 84 });
		expect(screen.getByTestId('metronome-bpm')).toHaveTextContent('84');
	});

	it('steps the tempo slower and faster by five', async () => {
		const { onBpm } = setup({ bpm: 70 });
		await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Slower' }));
		expect(onBpm.mock.calls).toEqual([[75], [65]]);
	});

	it('disables slower at the floor and faster at the ceiling', () => {
		setup({ bpm: HW_TEMPO_MIN });
		expect(screen.getByRole('button', { name: 'Slower' })).toBeDisabled();
		cleanup();
		setup({ bpm: HW_TEMPO_MAX });
		expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
	});

	it('sets the tempo from a preset and marks the active one', async () => {
		const { onBpm } = setup({ bpm: 60 });
		const presets = screen.getByTestId('metronome-presets');
		expect(presets.querySelector('[aria-pressed="true"]')).toHaveTextContent('60');
		await fireEvent.click(screen.getByRole('button', { name: '100' }));
		expect(onBpm).toHaveBeenCalledWith(100);
	});

	it('sets the tempo from the slider, clamped', async () => {
		const { onBpm } = setup();
		const slider = screen.getByTestId('metronome-slider');
		await fireEvent.input(slider, { target: { value: '120' } });
		expect(onBpm).toHaveBeenCalledWith(120);
	});

	it('picks the count-in length and marks the active one', async () => {
		const { onCountIn } = setup({ countInBars: 1 });
		const row = screen.getByTestId('metronome-countin');
		expect(row.querySelector('[aria-pressed="true"]')).toHaveTextContent('1 bar');
		await fireEvent.click(screen.getByRole('button', { name: '2 bars' }));
		await fireEvent.click(screen.getByRole('button', { name: 'None' }));
		expect(onCountIn.mock.calls).toEqual([[2], [0]]);
	});

	it('locks the tempo controls but not the count-in when only the tempo is locked', () => {
		setup({ lockTempo: true });
		expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
		expect(screen.getByTestId('metronome-slider')).toBeDisabled();
		expect(screen.getByRole('button', { name: '2 bars' })).not.toBeDisabled();
	});

	it('locks the count-in chips while running', () => {
		setup({ lockCountIn: true });
		expect(screen.getByRole('button', { name: '2 bars' })).toBeDisabled();
	});

	it('hides the count-in when not offered', () => {
		setup({ showCountIn: false });
		expect(screen.queryByTestId('metronome-countin')).toBeNull();
	});
});
