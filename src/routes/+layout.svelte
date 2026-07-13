<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const navLinks = [
		{ href: '/', label: 'Lookup' },
		{ href: '/drills', label: 'Drills' },
		{ href: '/progress', label: 'Progress' },
		{ href: '/showcase', label: 'Showcase' }
	];
</script>

<nav
	class="bg-paper border-ink flex flex-col gap-2 border-b-2 p-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-4"
	data-testid="masthead"
>
	<span class="text-heading font-bold uppercase tracking-tight">MUSIC LEARN</span>
	<div class="flex gap-4">
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
