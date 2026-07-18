<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fetchStats, fetchStreak, localDateString, type StatItem } from '$lib/api/progress';
	import { getApiToken, setApiToken } from '$lib/api/client';
	import {
		setSoundEnabled,
		soundEnabled,
		setStudyModeEnabled,
		studyModeEnabled
	} from '$lib/audio/audio';
	import { pickStreakLine } from '$lib/copy/streak';
	import { t } from '$lib/i18n/locale.svelte';
	import { setDrillSeeds } from '$lib/practice/drillSeeds';
	import { getLevelState, setCurrentTier } from '$lib/practice/levelState';
	import { TIERS, tierById, type TierId } from '$lib/practice/tiers';
	import PracticeItemRow from '$lib/components/PracticeItemRow.svelte';
	import AccuracyTable from '$lib/components/AccuracyTable.svelte';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * Progress page (PROG-02, PROG-03): the first true network round-trip in
	 * the UI. Fetches server-computed per-item accuracy stats and the daily
	 * streak, rendering a streak hero card above the Weakest Spots shortlist
	 * and a full stats table, with real loading/empty/error states (plus a
	 * token-entry branch when no bearer token is stored yet, D-03's
	 * "entered once per device" flow).
	 *
	 * The streak fetch is independent of the page's own loading/empty/error
	 * state machine (which is driven only by fetchStats): if fetchStreak
	 * fails, streak defaults to 0 and the hero still renders in its zero
	 * form rather than blocking the rest of the page.
	 */
	type PageState = 'loading' | 'empty' | 'error' | 'populated' | 'token-missing';

	let pageState = $state<PageState>('loading');
	let items = $state<StatItem[]>([]);
	let weakest = $state<StatItem[]>([]);
	let tokenInput = $state('');
	let streak = $state(0);
	let practicedToday = $state(false);

	const streakLine = $derived.by(() => {
		const kind = streak === 0 ? 'zeroStreak' : practicedToday ? 'activePracticedToday' : 'activeNudge';
		return pickStreakLine(kind).replace('{N}', String(streak));
	});

	async function load(): Promise<void> {
		if (getApiToken() === '') {
			pageState = 'token-missing';
			return;
		}
		pageState = 'loading';
		try {
			const result = await fetchStats();
			items = result.items;
			weakest = result.weakest;
			pageState = result.items.length === 0 ? 'empty' : 'populated';
		} catch {
			pageState = 'error';
		}

		try {
			const streakResult = await fetchStreak(localDateString());
			streak = streakResult.streak;
			practicedToday = streakResult.practicedToday;
		} catch {
			streak = 0;
			practicedToday = false;
		}
	}

	function saveToken(): void {
		setApiToken(tokenInput);
		void load();
	}

	onMount(() => {
		void load();
	});

	// ---- Practice settings (Track B): device-local, independent of the
	// stats fetch state machine above, so they render in every page state.

	let levelState = $state(getLevelState());
	let sound = $state(soundEnabled());
	let studyMode = $state(studyModeEnabled());

	/** Manual tier override (R3): no confirmation friction, always available. */
	function selectTier(tier: TierId): void {
		levelState = setCurrentTier(tier);
	}

	function toggleSound(): void {
		sound = !sound;
		setSoundEnabled(sound);
	}

	function toggleStudyMode(): void {
		studyMode = !studyMode;
		setStudyModeEnabled(studyMode);
	}

	/** Seeds a drill session from the weakest chord items (R6 proposal 2). */
	function drillThese(): void {
		setDrillSeeds(weakest.filter((item) => item.kind === 'chord').map((item) => item.item));
		void goto('/drills');
	}
</script>

<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading mt-2 font-bold">{t('progress.page.title')}</h1>

	{#if pageState === 'token-missing'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-token-entry">
			<p class="text-label font-mono uppercase">{t('progress.token.heading')}</p>
			<input
				type="text"
				class="border-ink mt-4 w-full border-2 bg-transparent p-2"
				bind:value={tokenInput}
				aria-label={t('progress.token.ariaLabel')}
			/>
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={saveToken}
					>{t('progress.token.save')}</Button
				>
			</div>
		</div>
	{:else if pageState === 'loading'}
		<div class="mt-8" data-testid="progress-loading">
			<p class="text-label font-mono uppercase">{t('progress.loading.label')}</p>
			<div class="progress-skeleton mt-4"></div>
			<div class="progress-skeleton mt-4"></div>
		</div>
	{:else if pageState === 'empty'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-empty">
			<p class="text-heading font-bold">{t('progress.empty.heading')}</p>
			<p class="text-body mt-4">
				{t('progress.empty.body')}
			</p>
			<div class="mt-6">
				<Button variant="primary" href="/drills">{t('progress.empty.cta')}</Button>
			</div>
		</div>
	{:else if pageState === 'error'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-error">
			<p class="text-body">
				{t('progress.error.body')}
			</p>
			<div class="mt-6">
				<Button type="button" variant="ghost" onclick={load}>{t('progress.error.cta')}</Button>
			</div>
		</div>
	{:else}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="streak-hero">
			<p class="text-body">{streakLine}</p>
			<div class="mt-4">
				<StreakBadge variant="hero" count={streak} />
			</div>
			<div class="mt-6">
				<Button variant="primary" href="/drills">{t('progress.streak.cta')}</Button>
			</div>
		</div>

		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="weakest-spots">
			<h2 class="text-heading font-bold">{t('progress.weakest.heading')}</h2>
			<p class="text-body mt-2">{t('progress.weakest.body')}</p>
			<table class="mt-4 w-full">
				<tbody>
					{#each weakest as item (item.item + item.kind)}
						<PracticeItemRow {item} />
					{/each}
				</tbody>
			</table>
			{#if weakest.some((item) => item.kind === 'chord')}
				<div class="mt-4">
					<Button type="button" variant="primary" onclick={drillThese}
						>{t('progress.weakest.cta')}</Button
					>
				</div>
			{/if}
		</div>

		<div class="mt-8">
			<h2 class="text-heading font-bold">{t('progress.stats.heading')}</h2>
			<div class="mt-4">
				<AccuracyTable {items} />
			</div>
		</div>
	{/if}

	<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="practice-settings">
		<h2 class="text-heading font-bold">{t('progress.settings.heading')}</h2>

		<p class="text-label mt-4 font-mono uppercase" data-testid="current-tier-line">
			{t('progress.settings.tierPrefix')} {levelState.currentTier}: {tierById(
				levelState.currentTier
			).name.toUpperCase()}
		</p>
		<p class="text-body mt-2">
			{t('progress.settings.tierBlurb')}
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			{#each TIERS as tier (tier.id)}
				<Button
					type="button"
					variant={tier.id === levelState.currentTier ? 'primary' : 'ghost'}
					disabled={!tier.available}
					aria-label={t('progress.settings.setTierAria').replace('{N}', String(tier.id))}
					onclick={() => selectTier(tier.id)}
				>
					{tier.id}
				</Button>
			{/each}
		</div>
		<p class="text-label text-muted mt-2 font-mono uppercase">
			{t('progress.settings.tiersComingLater')}
		</p>

		<div class="mt-6">
			<p class="text-label font-mono uppercase">{t('progress.settings.sound.label')}</p>
			<div class="mt-2">
				<Button
					type="button"
					variant="ghost"
					aria-label={t('progress.settings.sound.aria')}
					onclick={toggleSound}
				>
					{sound ? t('progress.settings.sound.on') : t('progress.settings.sound.off')}
				</Button>
			</div>
		</div>

		<div class="mt-6">
			<p class="text-label font-mono uppercase">{t('progress.settings.studyMode.label')}</p>
			<div class="mt-2">
				<Button
					type="button"
					variant="ghost"
					aria-label={t('progress.settings.studyMode.aria')}
					onclick={toggleStudyMode}
				>
					{studyMode
						? t('progress.settings.studyMode.on')
						: t('progress.settings.studyMode.off')}
				</Button>
			</div>
		</div>
	</div>
</main>

<style>
	/* Static placeholder blocks (no shimmer/pulse - motion stays minimal per
	   the tasteful-effects rule; a loading skeleton that runs indefinitely is
	   a different category than the brief settle animations elsewhere). */
	.progress-skeleton {
		height: 64px;
		background-color: var(--color-paper-bright);
		border: 2px solid var(--color-ink);
	}
</style>
