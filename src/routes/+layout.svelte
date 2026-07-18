<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import LocaleToggle from '$lib/components/LocaleToggle.svelte';
	import { initLocale, t } from '$lib/i18n/locale.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const navLinks = [
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
		<LocaleToggle />
	</div>
	<div class="flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
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

{@render children()}

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
</style>
