<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchStats, type StatItem } from '$lib/api/progress';
	import { getApiToken, setApiToken } from '$lib/api/client';
	import PracticeItemRow from '$lib/components/PracticeItemRow.svelte';
	import AccuracyTable from '$lib/components/AccuracyTable.svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * Progress page (PROG-02): the first true network round-trip in the UI.
	 * Fetches server-computed per-item accuracy stats and renders the
	 * Weakest Spots shortlist + a full stats table, with real loading/
	 * empty/error states (plus a token-entry branch when no bearer token is
	 * stored yet, D-03's "entered once per device" flow). The streak hero
	 * card (08-04) will sit above Weakest Spots; nothing here reserves
	 * visual space for it since it's a future addition to this same layout.
	 */
	type PageState = 'loading' | 'empty' | 'error' | 'populated' | 'token-missing';

	let pageState = $state<PageState>('loading');
	let items = $state<StatItem[]>([]);
	let weakest = $state<StatItem[]>([]);
	let tokenInput = $state('');

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
	}

	function saveToken(): void {
		setApiToken(tokenInput);
		void load();
	}

	onMount(() => {
		void load();
	});
</script>

<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading mt-2 font-bold">Progress</h1>

	{#if pageState === 'token-missing'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-token-entry">
			<p class="text-label font-mono uppercase">Enter your access key</p>
			<input
				type="text"
				class="border-ink mt-4 w-full border-2 bg-transparent p-2"
				bind:value={tokenInput}
				aria-label="Access key"
			/>
			<div class="mt-4">
				<Button type="button" variant="primary" onclick={saveToken}>Save</Button>
			</div>
		</div>
	{:else if pageState === 'loading'}
		<div class="mt-8" data-testid="progress-loading">
			<p class="text-label font-mono uppercase">FETCHING THE LEDGER...</p>
			<div class="progress-skeleton mt-4"></div>
			<div class="progress-skeleton mt-4"></div>
		</div>
	{:else if pageState === 'empty'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-empty">
			<p class="text-heading font-bold">Nothing on the ledger yet.</p>
			<p class="text-body mt-4">
				Play a few drills and your stats start showing up here. Weakest spots first, always.
			</p>
			<div class="mt-6">
				<Button variant="primary" href="/drills">Start a Drill</Button>
			</div>
		</div>
	{:else if pageState === 'error'}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="progress-error">
			<p class="text-body">
				Couldn't reach the ledger. The server's not answering right now. Check your connection and
				try again.
			</p>
			<div class="mt-6">
				<Button type="button" variant="ghost" onclick={load}>Try Again</Button>
			</div>
		</div>
	{:else}
		<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="weakest-spots">
			<h2 class="text-heading font-bold">Weakest Spots</h2>
			<p class="text-body mt-2">The chords and scales tripping you up most. Give these extra reps.</p>
			<table class="mt-4 w-full">
				<tbody>
					{#each weakest as item (item.item + item.kind)}
						<PracticeItemRow {item} />
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-8">
			<h2 class="text-heading font-bold">All Stats</h2>
			<div class="mt-4">
				<AccuracyTable {items} />
			</div>
		</div>

		<div class="mt-8">
			<Button variant="primary" href="/drills">Practice Now</Button>
		</div>
	{/if}
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
