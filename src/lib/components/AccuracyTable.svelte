<script lang="ts">
	/**
	 * Full per-item stats table (PROG-02): a header row with the SYMBOL /
	 * KIND / ATTEMPTS / ACCURACY columns, then one PracticeItemRow per item -
	 * mirrors RecentChipRow's parent-iterates-child list pattern.
	 */
	import { t } from '$lib/i18n/locale.svelte';
	import PracticeItemRow from './PracticeItemRow.svelte';

	interface PracticeItem {
		item: string;
		kind: 'chord' | 'scale' | 'interval';
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
			<th class="text-label font-mono">{t('progress.table.header.symbol')}</th>
			<th class="text-label font-mono hidden sm:table-cell">{t('progress.table.header.kind')}</th
			>
			<th class="text-label font-mono">{t('progress.table.header.attempts')}</th>
			<th class="text-label font-mono">{t('progress.table.header.accuracy')}</th>
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
