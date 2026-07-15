<script lang="ts">
	import BuildSession from '$lib/components/BuildSession.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Build It</h1>
	<p class="text-muted mt-2">Earn every note. Stack the interval, don't just read it.</p>

	<div class="border-ink bg-paper-bright mt-8 border-2 p-6">
		<BuildSession />
	</div>
</main>
