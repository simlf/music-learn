<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import KeyboardDock from '$lib/components/KeyboardDock.svelte';
	import { createDockRegistry, setDockRegistry } from '$lib/keyboard/dockContext.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Shared keyboard dock registry (KBD-02): created once here and provided
	// via context so every page can register its single playable keyboard
	// and KeyboardDock (mounted below) can render whichever one is current.
	const dockRegistry = createDockRegistry();
	setDockRegistry(dockRegistry);

	const navLinks = [
		{ href: '/', label: 'Lookup' },
		{ href: '/drills', label: 'Drills' },
		{ href: '/build', label: 'Build' },
		{ href: '/recall', label: 'Recall' },
		{ href: '/scales', label: 'Scales' },
		{ href: '/songs', label: 'Songs' },
		{ href: '/theory', label: 'Theory' },
		{ href: '/progress', label: 'Progress' }
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
	class="bg-paper border-ink flex flex-row flex-wrap items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4"
	data-testid="masthead"
>
	<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">MUSIC LEARN</span>
	<StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
	<div class="flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
		{#each navLinks as link (link.href)}
			<a
				href={link.href}
				class="masthead__link text-label font-mono uppercase"
				class:masthead__link--active={$page.url.pathname === link.href}
				style="letter-spacing: 0.08em;"
			>
				{link.label}
			</a>
		{/each}
	</div>
</nav>

<div class="dock-clearance">
	{@render children()}
</div>

<KeyboardDock />

<style>
	.dock-clearance {
		/* Reserves exactly the dock's live rendered height (0px when nothing
		   is docked - --dock-height is unset until KeyboardDock writes it) so
		   scrolling content never sits permanently hidden behind the fixed
		   dock chrome (KBD-02). */
		padding-bottom: var(--dock-height, 0px);
	}

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
