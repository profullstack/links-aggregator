<script>
	import { onMount } from 'svelte';
	import { getOnionUrl, isTorEnabled, getShareableUrl } from '$lib/tor.js';
	import { goto } from '$app/navigation';

	let mounted = false;
	let onionUrl = '';
	let shareableUrl = '';
	let torEnabled = false;
	let categories = [];
	let loading = true;

	onMount(async () => {
		mounted = true;
		onionUrl = getOnionUrl() || '';
		shareableUrl = getShareableUrl();
		torEnabled = isTorEnabled();
		
		// Load categories with links
		await loadCategories();
	});

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories?include_links=true');
			const result = await response.json();

			if (!response.ok) {
				console.error('API error:', result.error);
			} else {
				categories = result.categories || [];
			}
		} catch (err) {
			console.error('Error:', err);
		} finally {
			loading = false;
		}
	}

	function handleGetStarted() {
		goto('/add');
	}
</script>

<svelte:head>
	<title>Links Aggregator</title>
	<meta name="description" content="A privacy-focused links aggregator running on Tor" />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
	<div class="border-4 border-dashed border-gray-200 rounded-lg min-h-96 flex items-center justify-center p-8">
		<div class="text-center space-y-6 max-w-2xl">
			<h1 class="text-4xl font-bold text-gray-900">Welcome to Links Aggregator</h1>
			{#if mounted}
				<p class="text-lg text-gray-600">
					A privacy-focused links aggregator running on Tor. Share and discover links anonymously 
					with voting, categories, and bulk import features.
				</p>
				
				{#if torEnabled}
					<div class="bg-purple-100 border border-purple-300 rounded-lg p-4 space-y-2">
						<h2 class="text-lg font-semibold text-purple-800 flex items-center justify-center gap-2">
							🧅 Tor Hidden Service Active
						</h2>
						<p class="text-sm text-purple-700">This site is accessible via Tor:</p>
						<div class="bg-white border rounded p-2 font-mono text-sm break-all">
							{onionUrl}
						</div>
					</div>
				{/if}

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<h3 class="font-semibold text-blue-800 mb-2">Share this site:</h3>
					<div class="bg-white border rounded p-2 font-mono text-sm break-all">
						{shareableUrl}
					</div>
				</div>

				<div class="mt-6">
					<button 
						on:click={handleGetStarted}
						class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
					>
						Add Links
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Yahoo-style Categories Section -->
<div class="px-4 py-8 sm:px-0">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
		
		{#if loading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
				<p class="mt-2 text-gray-600">Loading categories...</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each categories as category}
					<div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
						<div class="flex items-center mb-4">
							<div
								class="w-4 h-4 rounded-full mr-3"
								style="background-color: {category.color}"
							></div>
							<a
								href="/category/{category.name.toLowerCase()}"
								class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
							>
								{category.name}
							</a>
							<span class="ml-auto text-sm text-gray-500">
								({category.links?.length || 0})
							</span>
						</div>
						
						{#if category.description}
							<p class="text-sm text-gray-600 mb-4">{category.description}</p>
						{/if}
						
						{#if category.links && category.links.length > 0}
							<div class="space-y-2">
								{#each category.links.slice(0, 5) as link}
									<div class="flex items-start space-x-2">
										{#if link.favicon_url}
											<img 
												src={link.favicon_url} 
												alt="" 
												class="w-4 h-4 mt-0.5 flex-shrink-0"
												loading="lazy"
											/>
										{/if}
										<a 
											href={link.url} 
											target="_blank" 
											rel="noopener noreferrer"
											class="text-sm text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
											title={link.description || link.title}
										>
											{link.title}
										</a>
									</div>
								{/each}
								
								{#if category.links.length > 5}
									<div class="text-xs text-gray-500 mt-2">
										+ {category.links.length - 5} more links
									</div>
								{/if}
							</div>
						{:else}
							<div class="text-sm text-gray-400 italic">
								No links in this category yet
							</div>
						{/if}
					</div>
				{/each}
			</div>
			
			{#if categories.length === 0}
				<div class="text-center py-8 text-gray-500">
					<p>No categories available. Add some links to get started!</p>
				</div>
			{/if}
		{/if}
	</div>
</div>