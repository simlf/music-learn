<script lang="ts">
	/**
	 * The SW update prompt (PWA-03). Unobtrusive bottom banner, mounted once
	 * in the root layout, that only ever appears when `swUpdate.svelte.ts`
	 * reports a waiting worker AND an existing controller (never on a
	 * visitor's very first install). Reload posts SKIP_WAITING to the
	 * waiting worker; the actual reload happens on `controllerchange`
	 * (see `registerUpdateWatcher`), never here directly. Dismiss just hides
	 * the prompt for this session - no silent/forced reload either way.
	 */
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';
	import { applyUpdate, setUpdateAvailable, updateAvailable } from '$lib/pwa/swUpdate.svelte';
</script>

{#if updateAvailable()}
	<div class="update-prompt" role="status" data-testid="update-prompt">
		<span class="update-prompt__message">{t('pwa.update.message')}</span>
		<div class="update-prompt__actions">
			<Button type="button" variant="primary" onclick={() => applyUpdate()}>
				{t('pwa.update.action')}
			</Button>
			<Button type="button" variant="ghost" onclick={() => setUpdateAvailable(false)}>
				{t('pwa.update.dismiss')}
			</Button>
		</div>
	</div>
{/if}

<style>
	.update-prompt {
		position: fixed;
		left: 50%;
		bottom: var(--spacing-lg);
		transform: translateX(-50%);
		z-index: 50;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-md);
		max-width: calc(100vw - var(--spacing-lg) * 2);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--color-paper-bright);
		border: 2px solid var(--color-ink);
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.update-prompt__message {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		font-weight: var(--text-label--font-weight);
		text-transform: uppercase;
		letter-spacing: var(--text-label--letter-spacing);
	}

	.update-prompt__actions {
		display: flex;
		gap: var(--spacing-xs);
	}
</style>
