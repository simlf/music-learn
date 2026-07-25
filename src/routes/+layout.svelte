<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import LocaleToggle from '$lib/components/LocaleToggle.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import { initLocale, t, type MessageKey } from '$lib/i18n/locale.svelte';
	import { registerUpdateWatcher } from '$lib/pwa/swUpdate.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	/**
	 * Phase 30 (HUB-01): nav cutover from 10 flat links to the 4 hubs. Both
	 * the desktop masthead and the phone bottom tab bar render from this one
	 * source array (bottomTabLinks below is this same array, never a second
	 * literal list).
	 */
	const navLinks: { href: string; labelKey: MessageKey }[] = [
		{ href: '/', labelKey: 'nav.lookup' },
		{ href: '/practice', labelKey: 'nav.practice' },
		{ href: '/learn', labelKey: 'nav.learn' },
		{ href: '/progress', labelKey: 'nav.progress' }
	];

	/**
	 * Phone bottom-tab icon set (24-02, sketch 015 winner B: icon +
	 * micro-label). Hardcoded module-level SVG string constants, keyed by
	 * href so they stay in sync with the single `navLinks` source array
	 * (never a second literal href list that could drift). Every string
	 * here is an in-repo constant, never sourced from user input, storage,
	 * or the network - safe to inject via `{@html}` (T-24-02-01). If this
	 * file is ever edited to source icon markup from anywhere else, that
	 * invariant must be re-verified before reusing {@html}.
	 *
	 * Shapes match sketch 015-B's ICONS map exactly: viewBox 0 0 24 24,
	 * stroke: currentColor (so the existing active-tab ink-fill/paper-text
	 * treatment recolors the icon for free), fill: none, stroke-width: 2.
	 */
	const TAB_ICONS: Record<string, string> = {
		'/': '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><line x1="15" y1="15" x2="21" y2="21"/></svg>',
		'/practice':
			'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="12"/><line x1="8" y1="6" x2="8" y2="14"/><line x1="13" y1="6" x2="13" y2="14"/><line x1="18" y1="6" x2="18" y2="14"/></svg>',
		'/learn':
			'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><path d="M12 5v15"/><path d="M12 5c-2-1.3-5-1.3-8-.3v14c3-1 6-1 8 .3"/><path d="M12 5c2-1.3 5-1.3 8-.3v14c-3-1-6-1-8 .3"/></svg>',
		'/progress':
			'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><line x1="4" y1="20" x2="20" y2="20"/><line x1="7" y1="20" x2="7" y2="14"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="17" y1="20" x2="17" y2="4"/></svg>'
	};

	/**
	 * Phone-only bottom tab bar (1A, UX-1A; reduced to the 4 hubs in Phase
	 * 30, HUB-01): the same 4 primary destinations, in the same order the
	 * desktop masthead already lists them. Now that `navLinks` is exactly
	 * the 4 hubs (no superset to filter from - that was the pre-Phase-30
	 * 5-link + "More" design), the bottom tab bar renders `navLinks`
	 * directly rather than a second literal href list, so the two can never
	 * drift apart. The "More" sheet (former 5th slot) is removed entirely -
	 * with exactly 4 hubs there is no overflow to hold.
	 */
	const bottomTabLinks = navLinks;

	/**
	 * Masthead streak chip (PROG-03): fetched only when a token is already
	 * stored, since an unauthenticated request would just 401. StreakBadge's
	 * own compact-variant self-hide (loading/zero/error) means the masthead
	 * needs no conditional wrapper here - nav links render immediately
	 * regardless of this fetch's state.
	 */
	let streakCount = $state(0);
	let streakLoading = $state(false);

	onMount(() => {
		initLocale();
		registerUpdateWatcher();
		if (getApiToken() === '') return;
		streakLoading = true;
		fetchStreak(localDateString())
			.then((result) => {
				streakCount = result.streak;
			})
			.catch(() => {
				// Fetch failure: the chip stays hidden (count remains 0). The
				// full error explanation lives only on the Progress page.
			})
			.finally(() => {
				streakLoading = false;
			});
	});
</script>

<nav
	class="bg-paper border-ink flex flex-row flex-wrap items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4"
	data-testid="masthead"
>
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">{t('brand')}</span>
		<StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
		<div class="hidden sm:block">
			<LocaleToggle />
		</div>
	</div>
	<div class="hidden sm:flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
		{#each navLinks as link (link.href)}
			<a
				href={link.href}
				class="masthead__link text-label font-mono uppercase"
				class:masthead__link--active={$page.url.pathname === link.href}
				style="letter-spacing: 0.08em;"
			>
				{t(link.labelKey)}
			</a>
		{/each}
	</div>
</nav>

<nav class="bottom-tab-bar sm:hidden" data-testid="bottom-tab-bar">
	{#each bottomTabLinks as link (link.href)}
		<a
			href={link.href}
			class="bottom-tab-bar__item font-mono"
			class:bottom-tab-bar__item--active={$page.url.pathname === link.href}
			aria-label={t(link.labelKey)}
		>
			<span class="bottom-tab-bar__icon">{@html TAB_ICONS[link.href]}</span>
			<span class="bottom-tab-bar__label uppercase" style="letter-spacing: 0.06em;"
				>{t(link.labelKey)}</span
			>
		</a>
	{/each}
</nav>

{@render children()}

<UpdatePrompt />

<style>
	.masthead__link {
		color: var(--color-muted);
		text-decoration: none;
		padding-bottom: 2px;
	}

	.masthead__link:hover,
	.masthead__link:focus {
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 4px;
		text-decoration-thickness: 2px;
	}

	.masthead__link--active {
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 4px;
		text-decoration-thickness: 2px;
	}

	/*
	 * Phone-only bottom tab bar (1A, UX-1A; reduced to 4 hubs and the More
	 * sheet removed in Phase 30, HUB-01). Fixed to the viewport bottom.
	 *
	 * CR-01 (23-REVIEW): Tailwind v4 emits its utilities inside
	 * `@layer utilities`, while a Svelte component's own scoped `<style>`
	 * output is unlayered. Per the CSS Cascade Layers spec, unlayered
	 * normal-priority rules always beat layered ones regardless of
	 * specificity or source order - so the `sm:hidden` utility class in the
	 * markup can never actually hide this element; the unconditional
	 * `display: flex` below would always win. The fix is to make this
	 * component's own scoped stylesheet self-contained: an explicit,
	 * unlayered `@media (min-width: 640px)` rule that turns the bar off,
	 * matching Tailwind's `sm:` breakpoint exactly (no reliance on the
	 * utility class to do the hiding - it's kept in the markup as a
	 * belt-and-braces no-op).
	 */
	.bottom-tab-bar {
		display: flex;
	}

	@media (min-width: 640px) {
		.bottom-tab-bar {
			display: none;
		}
	}

	@media (max-width: 639.98px) {
		.bottom-tab-bar {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 50;
			background: var(--color-paper-bright);
			border-top: 2px solid var(--color-ink);
			padding-bottom: env(safe-area-inset-bottom);
		}
	}

	/*
	 * Icon + 9px micro-label tab slots (24-02, sketch 015 winner B). 56px
	 * (down from 64px) is language-independent: the icon carries meaning,
	 * the tiny label teaches/reinforces it and may ellipsis-truncate in
	 * French without changing the bar's height. min-height:44px keeps the
	 * touch target floor from Phase 9's responsive-octaves rule.
	 */
	.bottom-tab-bar__item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		height: 56px;
		min-height: 44px;
		padding: 0 2px;
		color: var(--color-muted);
		text-decoration: none;
		text-align: center;
		border: none;
		border-right: 2px solid var(--color-ink);
		background: none;
		font: inherit;
		cursor: pointer;
	}

	.bottom-tab-bar__item:last-child {
		border-right: none;
	}

	/* Active tab: LocaleToggle's active-segment treatment (ink fill / paper
	   text) - never vermilion, which is reserved for practice reward/warning. */
	.bottom-tab-bar__item--active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	/* Icon uses `stroke: currentColor` (sketch 015-B), so it recolors for
	   free with the active/inactive text color above - no separate active
	   icon rule needed. `:global` reaches into the {@html}-injected <svg>,
	   which Svelte's scoped-style compiler cannot otherwise see. */
	.bottom-tab-bar__icon {
		display: flex;
		line-height: 0;
	}

	.bottom-tab-bar__icon :global(svg) {
		display: block;
	}

	.bottom-tab-bar__label {
		font-size: 9px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
</style>
