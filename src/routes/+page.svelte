<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/showcase');
	});
</script>

<main class="min-h-screen bg-paper p-8">
	<p>
		<a href="/showcase" class="text-ink underline">Go to the chord showcase</a>
	</p>
</main>
