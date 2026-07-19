<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import LocaleToggle from '$lib/components/LocaleToggle.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import { initLocale, t, type MessageKey } from '$lib/i18n/locale.svelte';
	import { registerUpdateWatcher } from '$lib/pwa/swUpdate.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const navLinks: { href: string; labelKey: MessageKey }[] = [
		{ href: '/', labelKey: 'nav.lookup' },
		{ href: '/drills', labelKey: 'nav.drills' },
		{ href: '/build', labelKey: 'nav.build' },
		{ href: '/recall', labelKey: 'nav.recall' },
		{ href: '/scales', labelKey: 'nav.scales' },
		{ href: '/songs', labelKey: 'nav.songs' },
		{ href: '/theory', labelKey: 'nav.theory' },
		{ href: '/progress', labelKey: 'nav.progress' }
	];

	/**
	 * Phone-only bottom tab bar (1A, UX-1A): the 4 primary destinations, in
	 * the same order the desktop masthead already lists them. Derived by
	 * filtering `navLinks` (not a second literal array) so the two never
	 * drift apart.
	 */
	const bottomTabHrefs = ['/', '/drills', '/recall', '/songs'];
	const bottomTabLinks = navLinks.filter((link) => bottomTabHrefs.includes(link.href));

	/**
	 * "More" sheet contents (1A): the remaining 4 destinations, same
	 * filter-not-duplicate-literal approach as bottomTabLinks above.
	 */
	const moreHrefs = ['/build', '/scales', '/theory', '/progress'];
	const moreLinks = navLinks.filter((link) => moreHrefs.includes(link.href));

	let moreOpen = $state(false);

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
			class="bottom-tab-bar__item text-label font-mono uppercase"
			class:bottom-tab-bar__item--active={$page.url.pathname === link.href}
			style="letter-spacing: 0.08em;"
		>
			{t(link.labelKey)}
		</a>
	{/each}
	<button
		type="button"
		class="bottom-tab-bar__item text-label font-mono uppercase"
		style="letter-spacing: 0.08em;"
		aria-haspopup="dialog"
		aria-expanded={moreOpen}
		onclick={() => (moreOpen = true)}
	>
		{t('nav.more')}
	</button>
</nav>

<BottomSheet open={moreOpen} onClose={() => (moreOpen = false)} ariaLabel={t('nav.more')}>
	<div data-testid="more-sheet">
		{#each moreLinks as link (link.href)}
			<a
				href={link.href}
				class="more-sheet__link text-label font-mono uppercase"
				onclick={() => (moreOpen = false)}
			>
				{t(link.labelKey)}
			</a>
		{/each}
		<div class="more-sheet__divider"></div>
		<div class="more-sheet__locale">
			<LocaleToggle />
		</div>
	</div>
</BottomSheet>

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
	 * Phone-only bottom tab bar (1A, UX-1A). Fixed to the viewport bottom,
	 * below the BottomSheet backdrop/surface (z-index 100/101 - see
	 * BottomSheet.svelte's own comment) so an open More sheet visually
	 * covers it. `sm:hidden` (Tailwind, min-width:640px) removes it from
	 * layout on desktop; the `639.98px` custom-CSS boundary below matches
	 * that breakpoint with no 1px overlap.
	 */
	.bottom-tab-bar {
		display: flex;
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

	.bottom-tab-bar__item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 64px;
		min-height: 44px;
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

	/* More sheet contents (1A): plain nav rows + a divider before LocaleToggle. */
	.more-sheet__link {
		display: flex;
		align-items: center;
		min-height: 44px;
		color: var(--color-ink);
		text-decoration: none;
	}

	.more-sheet__divider {
		border-top: 2px solid var(--color-ink);
		margin: var(--spacing-md) 0;
	}

	.more-sheet__locale {
		display: flex;
		justify-content: center;
		padding-bottom: var(--spacing-md);
	}
</style>
