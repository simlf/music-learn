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
	import { currentLocale, t } from '$lib/i18n/locale.svelte';
	import { setDrillSeeds } from '$lib/practice/drillSeeds';
	import {
		listConfidence,
		calibration,
		dangerCards,
		type ConfidenceEntry,
		type DangerCard
	} from '$lib/practice/confidenceLog';
	import { factById } from '$lib/srs/facts';
	import { getLevelState, setCurrentTier } from '$lib/practice/levelState';
	import { TIERS, type TierId } from '$lib/practice/tiers';
	import PracticeItemRow from '$lib/components/PracticeItemRow.svelte';
	import AccuracyTable from '$lib/components/AccuracyTable.svelte';
	import StreakBadge from '$lib/components/StreakBadge.svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * Phase 29-04: the /progress stats body (PROG-02, PROG-03), extracted
	 * verbatim into a bare fragment so the Progress hub can compose it
	 * alongside RecallPanel and SongManager. The first true network
	 * round-trip in the UI - fetches server-computed per-item accuracy
	 * stats and the daily streak, rendering a streak hero card above the
	 * Weakest Spots shortlist and a full stats table, with real
	 * loading/empty/error states (plus a token-entry branch when no
	 * bearer token is stored yet, D-03's "entered once per device" flow).
	 *
	 * The streak fetch is independent of the page's own loading/empty/error
	 * state machine (which is driven only by fetchStats): if fetchStreak
	 * fails, streak defaults to 0 and the hero still renders in its zero
	 * form rather than blocking the rest of the page.
	 *
	 * No props - this component owns all its own state and the network
	 * round-trip, exactly as /progress did before extraction. The host
	 * hub owns the outer <main> frame and the shared page title.
	 */
	type PageState = 'loading' | 'empty' | 'error' | 'populated' | 'token-missing';

	let pageState = $state<PageState>('loading');
	let items = $state<StatItem[]>([]);
	let weakest = $state<StatItem[]>([]);
	let tokenInput = $state('');
	let streak = $state(0);
	let practicedToday = $state(false);
	let last7 = $state<{ date: string; practiced: boolean }[]>([]);

	// ---- Confidence calibration (sketch 020-C, Plan 25-08): the payoff
	// surface for 25-06's Recall confidence dots. Device-local, read
	// independently of the stats network round-trip above so it renders in
	// every pageState (hidden entirely only when the log itself is empty).
	let confidenceEntries = $state<ConfidenceEntry[]>([]);

	// Design decision (resolves 020-C's OPEN sketch call): a 3-bar accuracy
	// chart per confidence level, not the denser 3x2 right/wrong matrix -
	// glanceable on a phone (three bars vs six captioned cells) and reuses
	// the Print Shop bar aesthetic already established by the 7-day streak
	// strip above. The miscalibration finding is stated directly via the
	// MISCALIBRATED flag rather than left for the viewer to spot in a grid.
	const calibrationResult = $derived.by(() => calibration(confidenceEntries));
	const dangerCardList = $derived.by(() => dangerCards(confidenceEntries));

	/**
	 * Resolves a danger card's factId to a display label via the fact
	 * catalog (chord-formula -> symbol, interval-size -> shorthand,
	 * scale-degree -> tonic+degree); falls back to the raw factId on a
	 * catalog miss so a corrupt/stale log entry never throws.
	 */
	function dangerCardLabel(card: DangerCard): string {
		const fact = factById(card.factId);
		if (!fact) return card.factId;
		if (fact.factKind === 'chord-formula') return fact.symbol;
		if (fact.factKind === 'interval-size') return fact.short;
		return `${fact.tonic} ${fact.degree}`;
	}

	/** Chord-formula-only symbols for the "Drill the danger cards" CTA seeding path (drills only seeds chord symbols). */
	const chordDangerSymbols = $derived.by(() => {
		const symbols: string[] = [];
		for (const card of dangerCardList) {
			const fact = factById(card.factId);
			if (fact?.factKind === 'chord-formula') symbols.push(fact.symbol);
		}
		return symbols;
	});

	/** Seeds the danger cards' chord symbols into a drill session (mirrors drillThese()). */
	function drillDangerCards(): void {
		setDrillSeeds(chordDangerSymbols);
		void goto('/drills');
	}

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
			last7 = streakResult.last7 ?? [];
		} catch {
			streak = 0;
			practicedToday = false;
			last7 = [];
		}
	}

	function saveToken(): void {
		setApiToken(tokenInput);
		void load();
	}

	onMount(() => {
		void load();
		confidenceEntries = listConfidence();
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

	/**
	 * Locale-formats a `YYYY-MM-DD` day string for the 7-day streak strip's
	 * aria-label (WR-04, 23-REVIEW): the UI-SPEC requires `{DATE}` to be
	 * substituted with a locale-formatted date, not the raw ISO string,
	 * matching `songs.mark.count`'s `{N}` interpolation pattern. Parsed with
	 * an explicit `T00:00:00` local-time suffix (never bare `new
	 * Date('YYYY-MM-DD')`, which parses as UTC midnight and can shift a day
	 * backward in negative-UTC-offset timezones) - same local-calendar-date
	 * rule `localDateString` already follows elsewhere in this file.
	 */
	function formatStreakDate(dateStr: string): string {
		return new Intl.DateTimeFormat(currentLocale(), { month: 'long', day: 'numeric' }).format(
			new Date(`${dateStr}T00:00:00`)
		);
	}
</script>

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
		{#if last7.length > 0}
			<div class="streak-last7 mt-4" data-testid="streak-last7">
				{#each last7 as day (day.date)}
					{@const isToday = day.date === localDateString()}
					<div
						class="streak-day"
						class:streak-day--practiced={day.practiced}
						class:streak-day--today={!day.practiced && isToday}
						data-testid="streak-day"
						aria-label={(day.practiced
							? t('progress.streak.last7.practicedAria')
							: isToday
								? t('progress.streak.last7.todayAria')
								: t('progress.streak.last7.missedAria')
						).replace('{DATE}', formatStreakDate(day.date))}
					></div>
				{/each}
			</div>
		{/if}
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
					<PracticeItemRow
						{item}
						onDrill={(symbol) => {
							setDrillSeeds([symbol]);
							void goto('/drills');
						}}
					/>
				{/each}
			</tbody>
		</table>
		{#if weakest.some((item) => item.kind === 'chord')}
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={drillThese}
					>{t('progress.weakest.ctaAllN').replace(
						'{N}',
						String(weakest.filter((item) => item.kind === 'chord').length)
					)}</Button
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

{#if confidenceEntries.length > 0}
	<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="confidence-calibration">
		<h2 class="text-heading font-bold">{t('progress.calibration.heading')}</h2>
		<p class="text-body mt-2">{t('progress.calibration.body')}</p>

		<div class="calibration-bars mt-6">
			{#each calibrationResult.levels as row (row.level)}
				<div class="calibration-bar-col" data-testid="calibration-bar">
					<div class="calibration-bar-track">
						<div
							class="calibration-bar-fill"
							style={`height: ${Number.isFinite(row.accuracy) ? Math.round(row.accuracy * 100) : 0}%`}
						></div>
					</div>
					<p class="text-label mt-2 font-mono uppercase">
						{t(`progress.calibration.level.${row.level}`)}
					</p>
					<p class="text-label font-mono">{row.correct}/{row.total}</p>
				</div>
			{/each}
		</div>

		{#if calibrationResult.miscalibrated}
			<div class="calibration-flag mt-4" data-testid="calibration-miscalibrated-flag">
				<p class="text-label font-mono uppercase">{t('progress.calibration.miscalibrated')}</p>
			</div>
		{/if}

		{#if dangerCardList.length > 0}
			<div class="mt-6" data-testid="danger-cards">
				<h3 class="text-label font-mono uppercase">
					{t('progress.calibration.danger.heading')}
				</h3>
				<ul class="mt-2">
					{#each dangerCardList as card (card.factId + '|' + card.mode)}
						<li class="mt-2" data-testid="danger-card">
							<span class="font-serif text-body">{dangerCardLabel(card)}</span>
							<span class="text-label ml-2 font-mono uppercase">
								{t('progress.calibration.danger.meta')
									.replace('{N}', String(card.wrongCount))
									.replace('{MODE}', card.mode)}
							</span>
						</li>
					{/each}
				</ul>

				{#if chordDangerSymbols.length > 0}
					<div class="mt-4">
						<Button type="button" variant="primary" onclick={drillDangerCards}
							>{t('progress.calibration.danger.cta')}</Button
						>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="practice-settings">
	<h2 class="text-heading font-bold">{t('progress.settings.heading')}</h2>

	<p class="text-label mt-4 font-mono uppercase" data-testid="current-tier-line">
		{t('progress.settings.tierPrefix')} {levelState.currentTier}: {t(
			`progress.tier.${levelState.currentTier}.name`
		).toUpperCase()}
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

<style>
	/* Static placeholder blocks (no shimmer/pulse - motion stays minimal per
	   the tasteful-effects rule; a loading skeleton that runs indefinitely is
	   a different category than the brief settle animations elsewhere). */
	.progress-skeleton {
		height: 64px;
		background-color: var(--color-paper-bright);
		border: 2px solid var(--color-ink);
	}

	/* 7-day streak strip (UX-1C): oldest -> today squares below the hero
	   numeral. Past-unpracticed = solid border, paper bg (calm); today
	   unpracticed = dashed border (the one attention-getting cue);
	   practiced = filled vermilion. Color is never the sole signal (fill
	   + border style both change). */
	.streak-last7 {
		display: flex;
		gap: var(--spacing-sm);
	}

	.streak-day {
		width: var(--spacing-xl);
		height: var(--spacing-xl);
		border: 2px solid var(--color-ink);
		background: var(--color-paper);
	}

	.streak-day--practiced {
		background: var(--color-vermilion);
	}

	.streak-day--today {
		border-style: dashed;
	}

	/* Confidence calibration bars (sketch 020-C): one bar per confidence
	   level, height encodes accuracy. Track border mirrors .streak-day's
	   ink border above; fill never reaches NaN width - the view clamps to 0
	   when a level has zero samples (T-25-08-02). Color is never the sole
	   signal for the MISCALIBRATED finding - that flag also renders a text
	   label below. */
	.calibration-bars {
		display: flex;
		gap: var(--spacing-md);
		align-items: flex-end;
	}

	.calibration-bar-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.calibration-bar-track {
		width: 100%;
		height: 80px;
		border: 2px solid var(--color-ink);
		background: var(--color-paper);
		display: flex;
		align-items: flex-end;
	}

	.calibration-bar-fill {
		width: 100%;
		background: var(--color-verdigris);
	}

	.calibration-flag {
		border: 2px solid var(--color-vermilion);
		padding: var(--spacing-sm);
		display: inline-block;
	}
</style>
