<script>
	import { onMount } from 'svelte';

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

<svelte:head>
	<title>Links Aggregator</title>
	<meta name="description" content="A simple links aggregator built with SvelteKit" />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
	<div class="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
		<div class="text-center space-y-4">
			<h1 class="text-4xl font-bold text-gray-900">Welcome to Links Aggregator</h1>
			{#if mounted}
				<p class="text-lg text-gray-600">Your SvelteKit + Supabase application is ready!</p>
				<div class="mt-6">
					<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
						Get Started
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>