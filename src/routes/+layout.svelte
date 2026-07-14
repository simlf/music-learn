<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const navLinks = [
		{ href: '/', label: 'Lookup' },
		{ href: '/drills', label: 'Drills' },
		{ href: '/scales', label: 'Scales' },
		{ href: '/progress', label: 'Progress' },
		{ href: '/showcase', label: 'Showcase' }
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
	class="bg-paper border-ink flex flex-row items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4"
	data-testid="masthead"
>
	<span class="text-heading font-bold uppercase tracking-tight">MUSIC LEARN</span>
	<StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
	<div class="flex gap-2 md:gap-4">
		{#each navLinks as link (link.href)}
			<a
				href={link.href}
				class={`masthead__link text-label font-mono uppercase ${link.href === '/showcase' ? 'hidden sm:inline' : ''}`}
				class:masthead__link--active={$page.url.pathname === link.href}
				style="letter-spacing: 0.08em;"
			>
				{link.label}
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
