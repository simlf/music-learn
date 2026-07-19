<script lang="ts">
	import type { InspectPayload } from './PianoKeyboard.svelte';
	import { t, currentLocale } from '$lib/i18n/locale.svelte';

	/**
	 * One-line mono interval register (R4): the readout for keyboard/formula
	 * inspect taps, in the Print Shop status-register voice. Reserves its
	 * line height so filling it never shifts the layout. Reads
	 * "E♭ · Mi · m3 · tierce mineure · 3 demi-tons" in fr (or the English
	 * long-name/semitone word in en); before the first tap it shows a quiet
	 * invitation. Only the human-language long-form companion (info.long vs
	 * info.longFr) and the semitone word switch with locale (I18N-02); the
	 * letter, solfège, and interval shorthand (info.short) stay identical in
	 * both languages - never re-derived here.
	 */
	interface Props {
		/** The latest inspect tap, or null before the first one. */
		payload: InspectPayload | null;
		/** Idle line shown while payload is null. Overrides the locale default when provided. */
		idleText?: string;
	}

	let { payload, idleText }: Props = $props();

	const idleLine = $derived(idleText ?? t('home.inspect.idle'));

	function lineFor(inspected: InspectPayload): string {
		const base = `${inspected.letter} · ${inspected.solfege}`;
		if (!inspected.info || inspected.info.short === '') return base;
		const semitones = inspected.info.semitones;
		const longName = currentLocale() === 'fr' ? inspected.info.longFr : inspected.info.long;
		const unit =
			semitones > 1 ? t('home.inspect.semitones.plural') : t('home.inspect.semitones.singular');
		const count = `${semitones} ${unit}`;
		return `${base} · ${inspected.info.short} · ${longName} · ${count}`;
	}
</script>

<p
	class="inspect-register text-label font-mono uppercase"
	class:inspect-register--idle={payload === null}
	data-testid="inspect-register"
	aria-live="polite"
>
	{payload === null ? idleLine : lineFor(payload)}
</p>

<style>
	.inspect-register {
		/* Reserve one line so the first tap never shifts the layout below. */
		min-height: calc(var(--text-label) * 1.4);
		margin-top: var(--spacing-sm);
		color: var(--color-ink);
	}

	.inspect-register--idle {
		color: var(--color-muted);
	}
</style>
