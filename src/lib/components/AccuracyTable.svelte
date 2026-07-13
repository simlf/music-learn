<script lang="ts">
	/**
	 * Full per-item stats table (PROG-02): a header row with the SYMBOL /
	 * KIND / ATTEMPTS / ACCURACY columns, then one PracticeItemRow per item -
	 * mirrors RecentChipRow's parent-iterates-child list pattern.
	 */
	import PracticeItemRow from './PracticeItemRow.svelte';

	interface PracticeItem {
		item: string;
		kind: 'chord' | 'scale';
		attempts: number;
		accuracy: number;
	}

	interface Props {
		items: PracticeItem[];
	}

	let { items }: Props = $props();
</script>

<table class="accuracy-table w-full" data-testid="accuracy-table">
	<thead>
		<tr>
			<th class="text-label font-mono">SYMBOL</th>
			<th class="text-label font-mono hidden sm:table-cell">KIND</th>
			<th class="text-label font-mono">ATTEMPTS</th>
			<th class="text-label font-mono">ACCURACY</th>
		</tr>
	</thead>
	<tbody>
		{#each items as item (item.item + item.kind)}
			<PracticeItemRow {item} />
		{/each}
	</tbody>
</table>

<style>
	.accuracy-table {
		border-collapse: collapse;
	}

	.accuracy-table th {
		text-align: left;
		padding: var(--spacing-sm) var(--spacing-md);
	}
</style>
