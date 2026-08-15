import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import { setMidiState } from '$lib/midi/midi.svelte';
import MidiStatus from './MidiStatus.svelte';

/**
 * Component test for MidiStatus (Phase 38 Plan 03, MIDI-01/MIDI-04).
 *
 * Drives the real `$lib/midi/midi.svelte` module via `setMidiState` +
 * `flushSync`, mirroring `streakBadge.test.ts`'s directness; only
 * `connectMidi` is replaced by a counting stub, via the same `vi.mock` +
 * `importOriginal` spread pattern `midi.test.ts` uses for `./webmidi`.
 */

const connectMidiMock = vi.fn();

vi.mock('$lib/midi/midi.svelte', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/midi/midi.svelte')>();
	return {
		...actual,
		connectMidi: (...args: unknown[]) => connectMidiMock(...args)
	};
});

afterEach(() => {
	cleanup();
	flushSync(() => setMidiState({ kind: 'unsupported' }));
	setLocale('en');
	connectMidiMock.mockReset();
});

describe('MidiStatus self-hiding (MIDI-04)', () => {
	it('renders nothing at the default unsupported state', () => {
		const { container } = render(MidiStatus);

		expect(screen.queryByTestId('midi-status')).toBeNull();
		// No wrapper element, no placeholder, no skeleton: only Svelte's own
		// {#if} block anchor (a comment node) may remain in the container.
		expect(container.querySelectorAll('*').length).toBe(0);
	});
});

describe('MidiStatus per-state English copy', () => {
	it('idle renders CONNECT MIDI with data-midi-state="idle"', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('CONNECT MIDI');
		expect(el).toHaveAttribute('data-midi-state', 'idle');
	});

	it('enabling renders MIDI: CONNECTING with data-midi-state="enabling"', () => {
		flushSync(() => setMidiState({ kind: 'enabling' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: CONNECTING');
		expect(el).toHaveAttribute('data-midi-state', 'enabling');
	});

	it('connected renders MIDI: {device name} with data-midi-state="connected"', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: Yamaha P-125');
		expect(el).toHaveAttribute('data-midi-state', 'connected');
	});

	it('no-device renders MIDI: NO DEVICE with data-midi-state="no-device"', () => {
		flushSync(() => setMidiState({ kind: 'no-device' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: NO DEVICE');
		expect(el).toHaveAttribute('data-midi-state', 'no-device');
	});

	it('disconnected renders MIDI: DISCONNECTED with data-midi-state="disconnected"', () => {
		flushSync(() => setMidiState({ kind: 'disconnected' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: DISCONNECTED');
		expect(el).toHaveAttribute('data-midi-state', 'disconnected');
	});

	it('denied renders MIDI: BLOCKED with data-midi-state="denied"', () => {
		flushSync(() => setMidiState({ kind: 'denied' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: BLOCKED');
		expect(el).toHaveAttribute('data-midi-state', 'denied');
	});

	it('error renders MIDI: ERROR with data-midi-state="error"', () => {
		flushSync(() => setMidiState({ kind: 'error' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).toHaveTextContent('MIDI: ERROR');
		expect(el).toHaveAttribute('data-midi-state', 'error');
	});
});

describe('MidiStatus element kind and interactivity', () => {
	it('connected renders a non-interactive <span>, not a button', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' }));
		render(MidiStatus);

		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByTestId('midi-status').tagName).toBe('SPAN');
	});

	it('idle renders a <button>', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').tagName).toBe('BUTTON');
	});

	it('no-device renders a <button>', () => {
		flushSync(() => setMidiState({ kind: 'no-device' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').tagName).toBe('BUTTON');
	});

	it('disconnected renders a <button>', () => {
		flushSync(() => setMidiState({ kind: 'disconnected' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').tagName).toBe('BUTTON');
	});

	it('denied renders a <button>', () => {
		flushSync(() => setMidiState({ kind: 'denied' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').tagName).toBe('BUTTON');
	});

	it('error renders a <button>', () => {
		flushSync(() => setMidiState({ kind: 'error' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').tagName).toBe('BUTTON');
	});

	/**
	 * WR-05. The chip is aria-disabled while connecting, NOT natively
	 * disabled: the UA blurs a button the instant it becomes `disabled`, which
	 * dropped a keyboard user back onto <body> for the whole attempt and made
	 * them re-traverse the masthead to reach the retry the next state offers.
	 */
	it('enabling renders an aria-disabled, aria-busy <button> that is still natively enabled (keeps focus)', () => {
		flushSync(() => setMidiState({ kind: 'enabling' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el.tagName).toBe('BUTTON');
		expect(el).toHaveAttribute('aria-disabled', 'true');
		expect(el).toHaveAttribute('aria-busy', 'true');
		expect(el).toBeEnabled();
	});

	it('a focused chip keeps focus when the state moves to enabling', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status') as HTMLButtonElement;
		el.focus();
		expect(document.activeElement).toBe(el);

		flushSync(() => setMidiState({ kind: 'enabling' }));
		expect(document.activeElement).toBe(screen.getByTestId('midi-status'));
	});

	it('no retryable state is aria-busy or aria-disabled', () => {
		for (const kind of ['idle', 'no-device', 'disconnected', 'denied', 'error'] as const) {
			flushSync(() => setMidiState({ kind }));
			render(MidiStatus);

			const el = screen.getByTestId('midi-status');
			expect(el).toHaveAttribute('aria-busy', 'false');
			expect(el).toHaveAttribute('aria-disabled', 'false');
			cleanup();
		}
	});

	it('clicking the idle button calls the stubbed connectMidi exactly once', async () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		await fireEvent.click(screen.getByTestId('midi-status'));

		expect(connectMidiMock).toHaveBeenCalledTimes(1);
	});

	it('clicking the aria-disabled enabling button calls connectMidi zero more times', async () => {
		flushSync(() => setMidiState({ kind: 'enabling' }));
		render(MidiStatus);

		await fireEvent.click(screen.getByTestId('midi-status'));

		expect(connectMidiMock).not.toHaveBeenCalled();
	});
});

/**
 * WR-05. The chip is the app's only MIDI affordance, and every retryable
 * state's visible copy is a STATUS, so the accessible name has to name the
 * action too, and the state changes have to be announced at all.
 */
describe('MidiStatus accessibility', () => {
	it('names the action on idle rather than exposing a bare status', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		expect(screen.getByRole('button', { name: 'Connect MIDI' })).toBeInTheDocument();
	});

	it('names the retry on every retryable state, keeping the visible label inside the accessible name', () => {
		const cases: Array<[Parameters<typeof setMidiState>[0]['kind'], string]> = [
			['no-device', 'MIDI: NO DEVICE, retry connecting'],
			['disconnected', 'MIDI: DISCONNECTED, retry connecting'],
			['denied', 'MIDI: BLOCKED, retry connecting'],
			['error', 'MIDI: ERROR, retry connecting']
		];

		for (const [kind, expected] of cases) {
			flushSync(() => setMidiState({ kind } as Parameters<typeof setMidiState>[0]));
			render(MidiStatus);

			const el = screen.getByTestId('midi-status');
			expect(el).toHaveAttribute('aria-label', expected);
			// WCAG 2.5.3 Label in Name: the visible text is part of the name.
			expect(expected).toContain(el.textContent?.trim());
			cleanup();
		}
	});

	it('leaves the accessible name as the visible status while enabling (no false retry promise)', () => {
		flushSync(() => setMidiState({ kind: 'enabling' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		expect(el).not.toHaveAttribute('aria-label');
		expect(el).toHaveAccessibleName('MIDI: CONNECTING');
	});

	it('exposes one persistent polite live region carrying the status text', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);

		const live = screen.getByTestId('midi-status-live');
		expect(live).toHaveAttribute('role', 'status');
		expect(live).toHaveAttribute('aria-live', 'polite');
		expect(live).toHaveTextContent('CONNECT MIDI');
	});

	it('keeps the SAME live-region element across enabling -> connected, so the change is announced', () => {
		flushSync(() => setMidiState({ kind: 'enabling' }));
		render(MidiStatus);

		const live = screen.getByTestId('midi-status-live');
		expect(live).toHaveTextContent('MIDI: CONNECTING');

		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' }));

		// Same node, new text: that is what a screen reader actually announces.
		expect(screen.getByTestId('midi-status-live')).toBe(live);
		expect(live).toHaveTextContent('MIDI: Yamaha P-125');
	});

	it('renders no live region at all on an unsupported browser (MIDI-04 is unaffected)', () => {
		const { container } = render(MidiStatus);

		expect(screen.queryByTestId('midi-status-live')).toBeNull();
		expect(container.querySelectorAll('*').length).toBe(0);
	});

	/**
	 * WR-06. Blocked MIDI is the one state the app cannot fix for the user, so
	 * the chip has to say where the fix lives instead of being a dead end.
	 */
	it('describes the recovery path when blocked, and offers it as a tooltip too', () => {
		flushSync(() => setMidiState({ kind: 'denied' }));
		render(MidiStatus);

		const el = screen.getByTestId('midi-status');
		const help = screen.getByTestId('midi-status-help');

		expect(el).toHaveAttribute('aria-describedby', help.id);
		expect(help).toHaveTextContent('Allow MIDI in your browser site settings, then tap again.');
		expect(el).toHaveAttribute(
			'title',
			'Allow MIDI in your browser site settings, then tap again.'
		);
		// Still activatable: the Permissions API reports a settings change live,
		// so a tap after the user allows MIDI genuinely reconnects.
		expect(el.tagName).toBe('BUTTON');
		expect(el).toBeEnabled();
	});

	it('renders no recovery guidance in any state other than denied', () => {
		for (const kind of ['idle', 'enabling', 'no-device', 'disconnected', 'error'] as const) {
			flushSync(() => setMidiState({ kind }));
			render(MidiStatus);

			expect(screen.queryByTestId('midi-status-help')).toBeNull();
			expect(screen.getByTestId('midi-status')).not.toHaveAttribute('aria-describedby');
			expect(screen.getByTestId('midi-status')).not.toHaveAttribute('title');
			cleanup();
		}
	});

	it('translates the recovery path under fr', () => {
		flushSync(() => setMidiState({ kind: 'denied' }));
		render(MidiStatus);
		flushSync(() => setLocale('fr'));

		expect(screen.getByTestId('midi-status-help')).toHaveTextContent(
			'Autorisez le MIDI dans les paramètres du site de votre navigateur, puis touchez de nouveau.'
		);
	});

	it('hides the connected chip from the accessibility tree so the name is not read twice', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByTestId('midi-status-live')).toHaveTextContent('MIDI: Yamaha P-125');
	});
});

describe('MidiStatus device-name handling', () => {
	it('deviceName "" renders MIDI: MIDI DEVICE (the readable fallback)', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: '' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI: MIDI DEVICE');
	});

	it('deviceName "   " (whitespace only) also renders MIDI: MIDI DEVICE', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: '   ' }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI: MIDI DEVICE');
	});

	it('a 40-character device name renders only its first 24 characters', () => {
		const raw = 'A'.repeat(40);
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: raw }));
		render(MidiStatus);

		expect(screen.getByTestId('midi-status').textContent?.trim()).toBe(`MIDI: ${raw.slice(0, 24)}`);
	});
});

/**
 * WR-03. The device name is untrusted external data and is substituted into a
 * chrome string. If it were passed to String.replace as a string replacement,
 * `$`-sequences would be read as substitution patterns and the hardware could
 * rewrite our own copy around itself.
 */
describe('MidiStatus device names containing $ replacement patterns render literally', () => {
	const cases: Array<[string, string]> = [
		['X$&Y', 'MIDI: X$&Y'],
		['A$`B', 'MIDI: A$`B'],
		["P$'Q", "MIDI: P$'Q"],
		['$$', 'MIDI: $$'],
		['$1', 'MIDI: $1'],
		['$<name>', 'MIDI: $<name>']
	];

	for (const [raw, expected] of cases) {
		it(`deviceName ${JSON.stringify(raw)} renders as ${JSON.stringify(expected)}`, () => {
			flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: raw }));
			render(MidiStatus);

			expect(screen.getByTestId('midi-status').textContent?.trim()).toBe(expected);
		});
	}
});

describe('MidiStatus escaping (threat T-38-09)', () => {
	it('renders a script-tag-shaped device name as visible text with no script element materializing', () => {
		const raw = '<script>alert(1)</script>';
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: raw }));
		const { container } = render(MidiStatus);

		expect(container.querySelector('script')).toBeNull();
		expect(screen.getByTestId('midi-status').textContent).toContain(raw.slice(0, 24));
	});
});

describe('MidiStatus French copy', () => {
	it('idle, no-device, disconnected, and connected each read in French after setLocale("fr")', () => {
		flushSync(() => setMidiState({ kind: 'idle' }));
		render(MidiStatus);
		flushSync(() => setLocale('fr'));
		expect(screen.getByTestId('midi-status')).toHaveTextContent('CONNECTER MIDI');

		flushSync(() => setMidiState({ kind: 'no-device' }));
		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI : AUCUN APPAREIL');

		flushSync(() => setMidiState({ kind: 'disconnected' }));
		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI : DÉCONNECTÉ');

		flushSync(() =>
			setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' })
		);
		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI : Yamaha P-125');
	});

	it('deviceName "" renders MIDI : APPAREIL MIDI under fr (the instrument name itself is never translated)', () => {
		flushSync(() => setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: '' }));
		render(MidiStatus);
		flushSync(() => setLocale('fr'));

		expect(screen.getByTestId('midi-status')).toHaveTextContent('MIDI : APPAREIL MIDI');
	});
});
