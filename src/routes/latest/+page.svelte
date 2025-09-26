<script>
	import { onMount } from 'svelte';
	import VoteButtons from '$lib/components/VoteButtons.svelte';

	/** @type {Array<any>} */
	let links = [];
	let loading = true;
	/** @type {string | null} */
	let error = null;

	onMount(async () => {
		await loadLatestLinks();
	});

	async function loadLatestLinks() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch('/api/links?limit=100');
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to load links');
			}

			links = result.links || [];
		} catch (/** @type {any} */ err) {
			console.error('Error loading latest links:', err);
			error = err?.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {string} dateString
	 * @returns {string}
	 */
	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
		
		if (diffInHours < 1) {
			return 'Just now';
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else if (diffInHours < 168) { // 7 days
			const days = Math.floor(diffInHours / 24);
			return `${days}d ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	/**
	 * @param {string} url
	 * @returns {string}
	 */
	function getDomainFromUrl(url) {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}
</script>

<svelte:head>
	<title>Latest Links - Links Aggregator</title>
	<meta name="description" content="Browse the latest 100 links shared on Links Aggregator" />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Latest Links</h1>
		<p class="text-gray-600">
			Discover the most recently shared links from our community
		</p>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			<p class="mt-4 text-gray-600">Loading latest links...</p>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
			<div class="text-red-600 mb-2">
				<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-red-800 mb-2">Error Loading Links</h3>
			<p class="text-red-700 mb-4">{error}</p>
			<button
				on:click={loadLatestLinks}
				class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if links.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-400 mb-4">
				<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-gray-900 mb-2">No Links Found</h3>
			<p class="text-gray-600 mb-4">Be the first to share some links!</p>
			<a
				href="/add"
				class="bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
			>
				Add Links
			</a>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">
						{links.length} Latest Links
					</h2>
					<button
						on:click={loadLatestLinks}
						class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>
			
			<div class="divide-y divide-gray-200">
				{#each links as link, index}
					<div class="px-6 py-4 hover:bg-gray-50 transition-colors">
						<div class="flex items-start space-x-4">
							<!-- Favicon -->
							<div class="flex-shrink-0 mt-1">
								{#if link.favicon_url}
									<img
										src={link.favicon_url}
										alt=""
										class="w-4 h-4"
										loading="lazy"
									/>
								{:else}
									<div class="w-4 h-4 bg-gray-300 rounded-sm"></div>
								{/if}
							</div>
							
							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0">
										<h3 class="text-lg font-medium text-gray-900 mb-1">
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												class="hover:text-blue-600 transition-colors"
											>
												{link.title || getDomainFromUrl(link.url)}
											</a>
										</h3>
										
										{#if link.description}
											<p class="text-gray-600 text-sm mb-2 line-clamp-2">
												{link.description}
											</p>
										{/if}
										
										<div class="flex items-center space-x-4 text-xs text-gray-500">
											<span>{getDomainFromUrl(link.url)}</span>
											<span>•</span>
											<span>{formatDate(link.created_at)}</span>
											{#if link.categories && link.categories.length > 0}
												<span>•</span>
												<div class="flex items-center space-x-1">
													{#each link.categories.slice(0, 2) as category}
														<a
															href="/category/{category.name.toLowerCase()}"
															class="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded text-xs font-medium transition-colors"
															style="border-left: 3px solid {category.color}"
														>
															{category.name}
														</a>
													{/each}
													{#if link.categories.length > 2}
														<span class="text-gray-400">+{link.categories.length - 2}</span>
													{/if}
												</div>
											{/if}
											{#if link.tags && link.tags.length > 0}
												<span>•</span>
												<div class="flex items-center space-x-1">
													{#each link.tags.slice(0, 3) as tag}
														<span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
															{tag}
														</span>
													{/each}
													{#if link.tags.length > 3}
														<span class="text-gray-400">+{link.tags.length - 3}</span>
													{/if}
												</div>
											{/if}
										</div>
									</div>
									
									<!-- Vote buttons -->
									<div class="flex-shrink-0 ml-4">
										<VoteButtons linkId={link.id} initialScore={link.vote_count} size="small" />
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
		
		{#if links.length === 100}
			<div class="mt-6 text-center">
				<p class="text-sm text-gray-500">
					Showing the latest 100 links. Want to see more? 
					<a href="/add" class="text-blue-600 hover:text-blue-800 font-medium">Add your own!</a>
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>