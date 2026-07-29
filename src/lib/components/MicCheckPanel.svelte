<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { isAppAudioActive } from '$lib/audio/audio';
	import {
		isMicAvailable,
		micUnavailableReason,
		startMicSession,
		type MicSession,
		type MicUnavailableReason
	} from '$lib/audio/micInput';
	import {
		buildChromaTarget,
		ChromaStabilityTracker,
		CHROMA_NAMES,
		DEFAULT_DETECTOR_PARAMS,
		type ChromaTarget,
		type DetectFrame,
		type PickedNote,
		type StabilityState
	} from '$lib/audio/chromaDetector';
	import type { ChordResult } from '$lib/theory/types';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * "Check it on your piano" (Spike 025, verdict GO WITH LIMITS): an opt-in
	 * microphone verifier for the currently looked-up chord. Deliberately NOT
	 * wired into any drill, grading, or FSRS card - this is a standalone
	 * confirmation panel, the technology's first slice in the real app, kept
	 * low-risk on purpose.
	 *
	 * Never auto-starts: `getUserMedia` is only ever requested from `start()`,
	 * itself only ever reachable via a user click on the button below.
	 *
	 * Teardown is the load-bearing part of this component (a microphone left
	 * open is the worst bug this feature could have): `stop()` releases the
	 * stream, the AudioContext and the analysis loop, and `onDestroy` calls it
	 * unconditionally, covering both an explicit Stop tap AND navigating away
	 * from the page (SvelteKit unmounts this component either way, and
	 * `onDestroy` is the single hook both funnel through).
	 *
	 * App-audio gating: every incoming frame is tagged with
	 * `isAppAudioActive()` (audio.ts) before being fed to the stability
	 * tracker. While the app's own speaker might be sounding, the frame is not
	 * evaluated at all (see chromaDetector.ChromaStabilityTracker.push) - this
	 * is what stops the panel from confirming its own answer (Spike 025
	 * measured a 97.2% false accept without this gate).
	 *
	 * The fifth: `buildChromaTarget` already excludes the physically
	 * unverifiable perfect fifth from grading (see chromaDetector.ts); the
	 * copy below states that plainly rather than silently relaxing a claim.
	 */

	interface Props {
		chord: ChordResult;
	}
	let { chord }: Props = $props();

	type Phase = 'idle' | 'requesting' | 'listening' | 'unavailable';

	let phase = $state<Phase>(isMicAvailable() ? 'idle' : 'unavailable');
	let unavailableReason = $state<MicUnavailableReason | null>(micUnavailableReason());
	let verdict = $state<StabilityState | null>(null);
	let heardNotes = $state<PickedNote[]>([]);

	let session: MicSession | null = null;
	const tracker = new ChromaStabilityTracker();
	/** Bumped on every start/stop (including destroy), so a start resolving after a stop never attaches. */
	let intent = 0;

	const target = $derived<ChromaTarget>(buildChromaTarget(chord));

	/** Resets the running verdict whenever the looked-up chord itself changes, so a stale target is never graded. */
	let lastSymbol: string | undefined;
	$effect(() => {
		const symbol = chord.symbol;
		if (lastSymbol !== undefined && symbol !== lastSymbol) {
			tracker.reset();
			verdict = null;
			heardNotes = [];
		}
		lastSymbol = symbol;
	});

	function onFrame(frame: DetectFrame): void {
		heardNotes = frame.notes;
		verdict = tracker.push(frame, target, performance.now(), isAppAudioActive());
	}

	async function start(): Promise<void> {
		if (phase === 'listening' || phase === 'requesting') return;
		const mine = ++intent;
		phase = 'requesting';
		tracker.reset();
		verdict = null;
		heardNotes = [];
		const result = await startMicSession(onFrame);
		if (mine !== intent) {
			// Stopped, or unmounted, while the permission prompt was pending.
			if (result.ok) result.stop();
			return;
		}
		if (!result.ok) {
			unavailableReason = result.reason;
			phase = 'unavailable';
			return;
		}
		session = result;
		phase = 'listening';
	}

	function stop(): void {
		intent += 1;
		session?.stop();
		session = null;
		phase = isMicAvailable() ? 'idle' : 'unavailable';
		tracker.reset();
		verdict = null;
		heardNotes = [];
	}

	function unavailableCopyKey(reason: MicUnavailableReason | null): MessageKey {
		switch (reason) {
			case 'insecure-context':
				return 'home.mic.unavailable-insecure';
			case 'permission-denied':
				return 'home.mic.unavailable-permission-denied';
			case 'no-device':
				return 'home.mic.unavailable-no-device';
			case 'unknown':
				return 'home.mic.unavailable-unknown';
			case 'unsupported':
			default:
				return 'home.mic.unavailable-unsupported';
		}
	}

	function noteName(note: PickedNote): string {
		const pc = ((note.midi % 12) + 12) % 12;
		const octave = Math.floor(note.midi / 12) - 1;
		return `${CHROMA_NAMES[pc]}${octave}`;
	}

	function heardLine(): string {
		return heardNotes.length ? heardNotes.map(noteName).join(' ') : t('home.mic.hearing-none');
	}

	function statusText(): string {
		if (!verdict) return t('home.mic.status-waiting');
		switch (verdict.status) {
			case 'muted':
				return t('home.mic.status-muted');
			case 'confirmed':
				return t('home.mic.status-confirmed');
			case 'holding':
				return t('home.mic.status-holding')
					.replaceAll('{RUN}', String(verdict.run))
					.replaceAll('{STABILITY}', String(DEFAULT_DETECTOR_PARAMS.stability));
			case 'quiet':
				return t('home.mic.status-waiting');
			case 'listening':
			default:
				if (verdict.missing.length > 0) {
					const names = verdict.missing.map((c) => CHROMA_NAMES[c]).join(', ');
					return t('home.mic.status-missing').replaceAll('{NOTES}', names);
				}
				if (verdict.maxOtherPc >= 0 && verdict.maxOther > 0) {
					return t('home.mic.status-extra').replaceAll('{NOTE}', CHROMA_NAMES[verdict.maxOtherPc]);
				}
				return t('home.mic.status-waiting');
		}
	}

	onDestroy(stop);
</script>

<div class="mic-panel border-ink border-2 mt-6 p-4" data-testid="mic-check-panel">
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('home.mic.label')}
	</p>
	<h2 class="text-heading font-bold">{t('home.mic.heading')}</h2>
	<p class="text-body mt-1">{t('home.mic.intro')}</p>
	<p class="text-body text-muted mt-1" data-testid="mic-check-fifth-note">
		{t('home.mic.fifthNote')}
	</p>

	{#if phase === 'unavailable'}
		<p class="text-body text-muted mt-4" data-testid="mic-check-status">
			{t(unavailableCopyKey(unavailableReason))}
		</p>
	{:else}
		<div class="mt-4">
			{#if phase === 'idle'}
				<Button type="button" variant="primary" data-testid="mic-check-start" onclick={start}>
					{t('home.mic.start')}
				</Button>
			{:else if phase === 'requesting'}
				<Button type="button" variant="primary" disabled data-testid="mic-check-start">
					{t('home.mic.requesting')}
				</Button>
			{:else}
				<Button type="button" variant="ghost" data-testid="mic-check-stop" onclick={stop}>
					{t('home.mic.stop')}
				</Button>
			{/if}
		</div>

		{#if phase === 'listening'}
			<div
				class="verdict-box mt-4 p-3"
				class:confirmed={verdict?.status === 'confirmed'}
				class:muted={verdict?.status === 'muted'}
				data-testid="mic-check-status"
			>
				<p class="text-body font-mono">{statusText()}</p>
			</div>
			{#if verdict?.status !== 'muted'}
				<p class="text-label text-muted font-mono mt-2" data-testid="mic-check-heard">
					{t('home.mic.hearing-prefix')}
					{heardLine()}
				</p>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.verdict-box {
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		transition:
			background-color 150ms ease-out,
			border-color 150ms ease-out;
	}

	.verdict-box.confirmed {
		border-color: var(--color-verdigris);
		background: var(--color-verdigris);
		color: var(--color-on-third);
	}

	.verdict-box.muted {
		border-color: var(--color-wrong-deep);
		color: var(--color-muted);
	}
</style>
