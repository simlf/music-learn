import { render, screen, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

/**
 * MIDI-04's POSITIVE CONTROL (WR-09). Companion to the negative case in
 * `tests/masthead.e2e.test.ts`.
 *
 * The negative case there ("no midi-status element in plain jsdom") is nearly
 * vacuous on its own: `midi.svelte.ts` starts at `{ kind: 'unsupported' }`
 * BEFORE any code runs, deliberately, so adapter-static's prerender emits no
 * MIDI markup. That means the negative assertion would still pass if
 * `initMidi()` were deleted, if `midiUnsupportedReason()` always returned null,
 * or if the whole feature-detect branch were inverted. It proves the default,
 * not the detection.
 *
 * This file supplies the discriminator: with `navigator.requestMIDIAccess`
 * present, the masthead MUST render the chip. That can only happen if the root
 * layout mounts MidiStatus AND `initMidi()` runs AND the feature detect resolves
 * to supported, so the pair of files brackets the real behaviour.
 *
 * WHY ITS OWN FILE: `initMidi()` is once-per-module-load by design (a second
 * layout mount must not disturb a live connection), so the two cases need two
 * virgin module graphs. `vi.resetModules()` + re-import cannot give that within
 * one file - the re-imported layout binds to a SECOND `svelte` instance, and
 * mounting it with the first instance's `render` throws `effect_orphan`. Vitest
 * isolates per file, so one file per case is the mechanism that actually works.
 *
 * The stub MUST be installed before the layout is imported and mounted, and it
 * MUST go on `Navigator.prototype` rather than the `navigator` instance, since
 * some engines resolve `requestMIDIAccess` through the prototype chain
 * (`tests/e2e/midi.spec.ts` targets the prototype for the same reason).
 */
Object.defineProperty(Navigator.prototype, 'requestMIDIAccess', {
	value: () => Promise.resolve({}),
	configurable: true
});

// Same minimal $page stub as tests/masthead.e2e.test.ts: +layout.svelte reads
// $page.url.pathname to mark the active nav link, and the real SvelteKit client
// router is not present when rendering the layout standalone.
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

afterEach(() => {
	cleanup();
});

afterAll(() => {
	Reflect.deleteProperty(Navigator.prototype, 'requestMIDIAccess');
});

describe('MidiStatus renders MIDI chrome once Web MIDI is detected (MIDI-04 positive control)', () => {
	it('renders the masthead midi-status chip, in its idle state, with requestMIDIAccess present', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const chip = screen.getByTestId('midi-status');
		expect(chip).toBeInTheDocument();
		// `idle`, not `connected`: detection alone must never request access.
		expect(chip).toHaveAttribute('data-midi-state', 'idle');
	});
});
