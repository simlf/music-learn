<script lang="ts">
	import RecallSession from '$lib/components/RecallSession.svelte';

	/**
	 * /recall (MEM-01/MEM-02): the Review-mode reveal-then-grade session. A
	 * thin page shell - h1, intro line, bordered card - wrapping
	 * RecallSession, which loads its own due-today queue on mount. No mode
	 * toggle yet: Review is the page's only content until 11-06 adds the
	 * RecallMap Map mode alongside it (MEM-04, deferred).
	 */
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Recall</h1>
	<p class="text-muted mt-2">
		The stack that's earning its keep. Every fact, every way you've met it.
	</p>

	<div class="border-ink bg-paper-bright mt-8 border-2 px-2 py-6 sm:px-6">
		<RecallSession />
	</div>
</main>
