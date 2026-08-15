<script lang="ts">
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';
	import { connectMidi, midiState, type MidiConnectionState } from '$lib/midi/midi.svelte';

	/**
	 * The masthead MIDI chip (MIDI-01/MIDI-04, Phase 38 Plan 03).
	 *
	 * Renders the live Web MIDI connection state from `$lib/midi/midi.svelte`.
	 * It renders NOTHING AT ALL when the state is `unsupported`, which is how
	 * MIDI-04's "no MIDI chrome on an unsupported browser" is satisfied by
	 * construction rather than by a conditional elsewhere in the app - the
	 * same self-hiding mechanism `StreakBadge.svelte` uses for a zero streak.
	 *
	 * This component is also the app's ONLY connect affordance. Auto-requesting
	 * MIDI access on mount would surface a permission prompt with no context on
	 * a first-ever visit, and, as of the Chrome 124 change, that prompt now
	 * covers all MIDI access rather than only system-exclusive access.
	 * `MicCheckPanel.svelte` already refuses to auto-start the microphone for
	 * exactly this reason; this component follows it. The on-screen keyboard
	 * remains the first-class input path; this chip is additive chrome, never
	 * a gate on anything.
	 *
	 * The hot-plug subscription lives in `$lib/midi/midi.svelte` for the whole
	 * app session, so this component needs no lifecycle hook at all, and no
	 * `onDestroy` teardown: the stale-promise guard for an in-flight connect
	 * lives in that module's own `intent` counter, not here.
	 *
	 * Placement tradeoff: the chip is visible at every viewport width rather
	 * than wrapped in a desktop-only container (unlike `LocaleToggle`), because
	 * MIDI-01 puts no viewport condition on seeing the connection state, and
	 * the masthead row already wraps. Consequence: on a Web-MIDI-capable phone
	 * the masthead grows to fit a 44px touch target; on a browser without Web
	 * MIDI the masthead is byte-identical to today.
	 */

	// Layout guard (T-38-10): a rogue or verbose USB descriptor must not be
	// able to shove the masthead around, so the displayed name is always
	// clamped, independent of the `.midi-status` CSS `max-width`/ellipsis
	// belt-and-braces below.
	const MAX_NAME_CHARS = 24;

	const state = $derived(midiState());
	const isEnabling = $derived(state.kind === 'enabling');

	/** Maps a connection-state kind to its message key. Mirrors MicCheckPanel.svelte's `unavailableCopyKey` switch shape. */
	function statusKey(kind: MidiConnectionState['kind']): MessageKey {
		switch (kind) {
			case 'idle':
				return 'midi.status.connect';
			case 'enabling':
				return 'midi.status.enabling';
			case 'connected':
				return 'midi.status.connected';
			case 'no-device':
				return 'midi.status.noDevice';
			case 'disconnected':
				return 'midi.status.disconnected';
			case 'denied':
				return 'midi.status.denied';
			case 'error':
			case 'unsupported':
			default:
				return 'midi.status.error';
		}
	}

	/** Trims and clamps a hardware-reported device name, falling back to a readable placeholder when empty/whitespace-only. */
	function displayName(raw: string): string {
		const trimmed = raw.trim();
		if (!trimmed) return t('midi.status.deviceFallback');
		return trimmed.slice(0, MAX_NAME_CHARS);
	}

	function label(): string {
		const key = statusKey(state.kind);
		if (state.kind === 'connected') {
			// The replacement MUST be a function, not a string. A string
			// replacement is interpreted as a pattern, where `$&`, `` $` ``,
			// `$'` and `$$` are substitution sequences - and the device name is
			// untrusted external data (a USB descriptor), so a name like
			// "X$&Y" would rewrite the chrome copy around itself. A replacer
			// function disables pattern interpretation entirely. Not an XSS
			// vector (Svelte escapes the interpolation), but device-controlled
			// data must not be able to mutate our own strings.
			const name = displayName(state.deviceName);
			return t(key).replace('{NAME}', () => name);
		}
		return t(key);
	}

	/**
	 * The chip's ACCESSIBLE NAME, which is not the visible label for most
	 * states.
	 *
	 * Every retryable state's visible copy is a status ("MIDI: NO DEVICE",
	 * "MIDI: ERROR", "MIDI: BLOCKED"), and a button whose entire accessible
	 * name is a status conveys nothing about what activating it does (WCAG
	 * 2.4.6 Headings and Labels / 4.1.2 Name, Role, Value). The action is
	 * APPENDED to the visible label rather than replacing it, so the visible
	 * text remains part of the accessible name (WCAG 2.5.3 Label in Name).
	 *
	 * `idle` needs no append: "CONNECT MIDI" already reads as an action.
	 * `enabling` returns undefined so the visible status IS the name, since
	 * naming a retry on a chip that is mid-attempt would be a lie; `aria-busy`
	 * carries the in-progress meaning instead.
	 */
	function ariaLabel(): string | undefined {
		if (state.kind === 'idle') return t('midi.aria.connect');
		if (state.kind === 'enabling') return undefined;
		return `${label()}, ${t('midi.aria.retry')}`;
	}

	/**
	 * The id of the recovery-guidance node, referenced by `aria-describedby`
	 * when blocked. A plain constant rather than a generated id because the
	 * masthead renders exactly one MIDI chip per document.
	 */
	const HELP_ID = 'midi-status-help';

	/**
	 * `denied` is the one state the app cannot resolve for the user. Once MIDI
	 * is blocked the browser auto-rejects every further request without
	 * prompting (which `enableMidi()` now detects up front instead of burning a
	 * request on), so a chip reading only "MIDI: BLOCKED" is a dead end: it
	 * looks actionable, does nothing observable, and never says the fix lives
	 * in site settings.
	 *
	 * The chip stays a BUTTON rather than becoming inert copy, deliberately:
	 * the Permissions API reports a settings change live, so a tap after the
	 * user allows MIDI genuinely reconnects. An inert chip would force a
	 * reload to discover that. The guidance rides along as an accessible
	 * description plus a pointer tooltip.
	 */
	const isDenied = $derived(state.kind === 'denied');

	/**
	 * Guards the click itself (belt-and-braces alongside the `aria-disabled`
	 * attribute below): this is the ONLY suppression of a click while
	 * `enabling`, because the chip deliberately uses `aria-disabled` rather
	 * than the native `disabled` attribute.
	 *
	 * Why not native `disabled`: the UA removes focus from a button the moment
	 * it becomes disabled, so a keyboard user who activated the chip was
	 * dropped back onto `<body>` for the whole duration of the connect attempt
	 * and had to re-traverse the masthead to reach the retry the very next
	 * state offers them. `aria-busy` + `aria-disabled` is the canonical
	 * "operation in progress, keep the focus where it is" pairing, and
	 * `connectMidi()` carries its own re-entrancy guard besides this one, so
	 * nothing depends on the browser refusing the click.
	 */
	function handleClick(): void {
		if (isEnabling) return;
		connectMidi();
	}
</script>

{#if state.kind !== 'unsupported'}
	<!--
		The status announcement, in ONE persistent live region that outlives
		every state change inside it (a live region inserted at the same moment
		its text appears is not reliably announced). Without this, an
		`enabling -> connected`/`denied`/`error` transition was completely
		silent: a screen-reader user who tapped the chip got no confirmation
		and no failure notice. `role="status"` follows the convention already
		set by `UpdatePrompt.svelte`.
	-->
	<span class="sr-only" role="status" aria-live="polite" data-testid="midi-status-live">
		{label()}
	</span>

	{#if state.kind === 'connected'}
		<!--
			aria-hidden because the live region above already carries this exact
			text in the accessibility tree. Without it a screen reader would read
			the connected device name twice in a row.
		-->
		<span
			class="midi-status midi-status--connected text-label font-mono uppercase"
			style="letter-spacing: 0.08em;"
			data-testid="midi-status"
			data-midi-state={state.kind}
			aria-hidden="true"
		>
			{label()}
		</span>
	{:else}
		<button
			type="button"
			class="midi-status midi-status--action text-label font-mono uppercase"
			style="letter-spacing: 0.08em;"
			data-testid="midi-status"
			data-midi-state={state.kind}
			aria-label={ariaLabel()}
			aria-busy={isEnabling}
			aria-disabled={isEnabling}
			aria-describedby={isDenied ? HELP_ID : undefined}
			title={isDenied ? t('midi.status.deniedHelp') : undefined}
			onclick={handleClick}
		>
			{label()}
		</button>
		{#if isDenied}
			<span class="sr-only" id={HELP_ID} data-testid="midi-status-help">
				{t('midi.status.deniedHelp')}
			</span>
		{/if}
	{/if}
{/if}

<style>
	/* min-height sits on the shared class, not only on the button, so the
	   masthead height stays identical across every state (span vs button)
	   and the chip never causes a layout shift when the connection changes. */
	.midi-status {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--color-muted);
		max-width: 18ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The ink hairline is the Print Shop signal that an element is tappable. */
	.midi-status--action {
		border: 2px solid var(--color-ink);
		background: transparent;
		padding: 0 var(--spacing-xs);
		cursor: pointer;
		font: inherit;
	}

	.midi-status--connected {
		padding: 0;
	}

	/* Matches aria-disabled, not :disabled: the chip stays natively enabled
	   while connecting so a keyboard user keeps focus on it (see handleClick). */
	.midi-status--action[aria-disabled='true'] {
		cursor: default;
	}
</style>
