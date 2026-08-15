<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { fetchStreak, localDateString } from '$lib/api/progress';
	import { localStreak } from '$lib/practice/practiceDays';
	import { dueCount, formatDueBadge, primeDueCount, refreshDueCount } from '$lib/srs/dueBadge.svelte';
	import { getApiToken } from '$lib/api/client';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import LocaleToggle from '$lib/components/LocaleToggle.svelte';
	import MidiStatus from '$lib/components/MidiStatus.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import { initLocale, t, type MessageKey } from '$lib/i18n/locale.svelte';
	import { registerUpdateWatcher } from '$lib/pwa/swUpdate.svelte';
	import { initMidi } from '$lib/midi/midi.svelte';
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
	 * The route whose tab carries the due-count badge (B7). Practice is the
	 * only destination where a due card can actually be answered, so it is the
	 * only tab that gets a count.
	 */
	const BADGED_HREF = '/practice';

	/**
	 * Masthead streak chip (PROG-03, rewritten local-first in B8).
	 *
	 * `localStreakCount` is read straight from this device's practice-day set:
	 * no token, no network, available synchronously on mount, so the chip
	 * shows on a phone that has never been on the tailnet. `serverStreakCount`
	 * is a cross-device MERGE, fetched only when a token is already stored
	 * (an unauthenticated request would just 401), and the displayed value is
	 * the MAX of the two - a reachable server can raise the streak (practice
	 * done on another device) but can never lower it below what this device
	 * knows happened.
	 *
	 * There is no loading state any more: the local value is always ready by
	 * first paint, so the chip never flashes a skeleton in persistent chrome.
	 */
	let localStreakCount = $state(0);
	let serverStreakCount = $state(0);
	const streakCount = $derived(Math.max(localStreakCount, serverStreakCount));

	/**
	 * The badge count for a nav link, or 0 for every link that carries no
	 * badge. Suppressing at 0 is deliberate anti-guilt discipline: an empty
	 * deck shows nothing at all, never a "0" dot.
	 */
	function badgeFor(href: string): number {
		return href === BADGED_HREF ? dueCount() : 0;
	}

	/**
	 * Accessible name for a tab. With a badge showing, the count is folded
	 * into the name ("Practice, 3 due") because the visible badge itself is
	 * aria-hidden decoration. Without one, this returns the plain label for
	 * the bottom bar and `undefined` for the masthead, whose links take their
	 * name from their own text.
	 */
	function tabAriaLabel(link: { href: string; labelKey: MessageKey }): string {
		const due = badgeFor(link.href);
		if (due === 0) return t(link.labelKey);
		return t('nav.due.aria')
			.replace('{LABEL}', t(link.labelKey))
			.replace('{N}', String(due));
	}

	/** Masthead variant: no aria-label at all unless a badge needs describing. */
	function mastheadAriaLabel(link: { href: string; labelKey: MessageKey }): string | undefined {
		return badgeFor(link.href) === 0 ? undefined : tabAriaLabel(link);
	}

	/**
	 * Re-reads the device-local streak. One small localStorage parse, so it is
	 * cheap enough to run on every navigation - which matters because the
	 * layout mounts once per app session while the streak can start mid-session
	 * (the first graded answer of the day).
	 */
	function syncLocalStreak() {
		localStreakCount = localStreak(localDateString());
	}

	// Covers both the first client-side read (the prerendered HTML is shared
	// across devices, so it can never contain this device's streak) and every
	// later route change, so finishing a practice session and walking to another
	// hub shows the streak that session just started. The due-card count is NOT
	// refreshed here - it is a full Dexie table scan, primed once per session
	// and refreshed on visibilitychange instead.
	$effect(() => {
		void $page.url.pathname;
		syncLocalStreak();
	});

	onMount(() => {
		// Dev-only guard (30-REVIEW WR-03): navLinks/TAB_ICONS/bottomTabLinks
		// must stay in lockstep by hand. Fail loudly here instead of letting a
		// missing TAB_ICONS entry silently render a blank {@html} icon slot.
		if (import.meta.env.DEV) {
			for (const link of navLinks) {
				if (!(link.href in TAB_ICONS)) {
					throw new Error(
						`[+layout.svelte] TAB_ICONS is missing an entry for nav link "${link.href}"`
					);
				}
			}
		}
		initLocale();
		registerUpdateWatcher();
		// Feature-detect only: never move a connect call here. `initMidi()`
		// only sets idle/unsupported; the permission prompt is reachable only
		// from MidiStatus's own click handler (MIDI-01/MIDI-04).
		initMidi();
		void primeDueCount();

		// Returning from the background is the one moment both numbers can be
		// stale (a day boundary crossed, cards came due, another device
		// practiced), and it is also the cheapest place to pay for a rescan.
		const onVisible = () => {
			if (document.visibilityState !== 'visible') return;
			syncLocalStreak();
			void refreshDueCount();
		};
		document.addEventListener('visibilitychange', onVisible);

		if (getApiToken() !== '') {
			fetchStreak(localDateString())
				.then((result) => {
					serverStreakCount = result.streak;
				})
				.catch(() => {
					// Off-tailnet, bad token, server down: the local streak still
					// shows. The full error explanation lives on the Progress page.
				});
		}

		return () => {
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<nav
	class="bg-paper border-ink flex flex-row flex-wrap items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4"
	data-testid="masthead"
>
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">{t('brand')}</span>
		<StreakBadge variant="compact" count={streakCount} />
		<MidiStatus />
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
				aria-label={mastheadAriaLabel(link)}
			>
				{t(link.labelKey)}{#if badgeFor(link.href) > 0}<span
						class="nav-badge"
						data-testid="due-badge-masthead"
						aria-hidden="true">{formatDueBadge(badgeFor(link.href))}</span
					>{/if}
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
			aria-label={tabAriaLabel(link)}
		>
			<span class="bottom-tab-bar__icon">
				{@html TAB_ICONS[link.href]}
				{#if badgeFor(link.href) > 0}
					<span class="nav-badge nav-badge--tab" data-testid="due-badge-tab" aria-hidden="true"
						>{formatDueBadge(badgeFor(link.href))}</span
					>
				{/if}
			</span>
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
		position: relative;
	}

	/*
	 * Due-count badge (B7). A mustard highlighter pill with an ink hairline:
	 * legible both on paper (inactive tab) and on the ink fill of the active
	 * tab, and deliberately NOT vermilion, which this design system reserves
	 * for practice reward/warning. It renders only when the count is >= 1
	 * (suppressed in the markup, not just visually), so an empty deck shows
	 * nothing at all rather than a "0" that would nag about nothing.
	 */
	.nav-badge {
		display: inline-block;
		min-width: 16px;
		padding: 0 3px;
		border: 1px solid var(--color-ink);
		background: var(--color-mustard);
		color: var(--color-ink);
		font-family: var(--font-mono);
		font-size: 9px;
		line-height: 14px;
		text-align: center;
		vertical-align: text-top;
		margin-left: 4px;
	}

	/* Phone tab slot: pinned to the icon's top-right corner so it never
	   competes with the 9px micro-label for horizontal room. */
	.nav-badge--tab {
		position: absolute;
		top: -7px;
		right: -9px;
		margin-left: 0;
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
