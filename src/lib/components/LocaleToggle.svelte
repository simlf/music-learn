<script lang="ts">
	/**
	 * The EN|FR language toggle (I18N-01). Structurally identical to the
	 * app's existing segmented-toggle pattern (BuildSession's Chords/Scales
	 * kind-toggle): `role="group"` wrapping two `Button` instances, each with
	 * `aria-pressed`, `variant="primary"` on the active segment and
	 * `variant="ghost"` on the inactive one.
	 *
	 * The active segment's fill is overridden to ink (not Button's default
	 * vermilion primary) via the scoped `:global` rule below - vermilion is
	 * reserved for interval-color/drill-feedback semantics and must never be
	 * repurposed for chrome.
	 */
	import Button from './Button.svelte';
	import { currentLocale, setLocale, t } from '$lib/i18n/locale.svelte';
</script>

<div class="locale-toggle" role="group" aria-label={t('locale.aria.group')}>
	<Button
		type="button"
		variant={currentLocale() === 'en' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'en'}
		aria-label={t('locale.aria.en')}
		onclick={() => setLocale('en')}
	>
		EN
	</Button>
	<Button
		type="button"
		variant={currentLocale() === 'fr' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'fr'}
		aria-label={t('locale.aria.fr')}
		onclick={() => setLocale('fr')}
	>
		FR
	</Button>
</div>

<style>
	.locale-toggle {
		display: flex;
		gap: var(--spacing-xs);
		font-family: var(--font-mono);
		font-size: var(--text-label);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.locale-toggle :global(.ps-button[aria-pressed='true']) {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}
</style>
