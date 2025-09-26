<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import LinkCard from '$lib/components/LinkCard.svelte';

	let category = null;
	let links = [];
	let loading = true;
	let loadingMore = false;
	let hasMore = true;
	let offset = 0;
	const limit = 20;

	$: categorySlug = $page.params.slug;

	onMount(async () => {
		await loadCategory();
		await loadLinks();
		
		// Set up infinite scroll
		setupInfiniteScroll();
	});

	async function loadCategory() {
		try {
			const response = await fetch('/api/categories');
			const result = await response.json();

			if (response.ok) {
				category = result.categories?.find(c => 
					c.name.toLowerCase() === categorySlug.toLowerCase()
				);
				
				if (!category) {
					// Category not found, redirect to home
					goto('/');
					return;
				}
			}
		} catch (err) {
			console.error('Error loading category:', err);
			goto('/');
		}
	}

	async function loadLinks(reset = false) {
		if (reset) {
			offset = 0;
			links = [];
			hasMore = true;
		}

		if (!hasMore || !category) return;

		const currentLoading = offset === 0 ? 'loading' : 'loadingMore';
		if (currentLoading === 'loading') {
			loading = true;
		} else {
			loadingMore = true;
		}

		try {
			// Use the actual category name, not the slug
			const response = await fetch(
				`/api/links?limit=${limit}&offset=${offset}&category=${category.name}`
			);
			const result = await response.json();

			if (response.ok) {
				const newLinks = result.links || [];
				
				if (reset) {
					links = newLinks;
				} else {
					links = [...links, ...newLinks];
				}
				
				hasMore = newLinks.length === limit;
				offset += newLinks.length;
			}
		} catch (err) {
			console.error('Error loading links:', err);
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function setupInfiniteScroll() {
		const handleScroll = () => {
			if (loadingMore || !hasMore) return;

			const scrollPosition = window.innerHeight + window.scrollY;
			const threshold = document.body.offsetHeight - 1000;

			if (scrollPosition >= threshold) {
				loadLinks();
			}
		};

		window.addEventListener('scroll', handleScroll);
		
		// Cleanup on component destroy
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{category?.name || 'Category'} - Links Aggregator</title>
	<meta name="description" content="Browse {category?.name || 'category'} links on Links Aggregator" />
</svelte:head>

{#if category}
	<div class="max-w-4xl mx-auto px-4 py-8">
		<!-- Category Header -->
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div 
					class="w-6 h-6 rounded-full mr-4" 
					style="background-color: {category.color}"
				></div>
				<h1 class="text-3xl font-bold text-gray-900">{category.name}</h1>
			</div>
			
			{#if category.description}
				<p class="text-lg text-gray-600 mb-4">{category.description}</p>
			{/if}
			
			<div class="text-sm text-gray-500">
				{links.length} {links.length === 1 ? 'link' : 'links'} in this category
			</div>
		</div>

		<!-- Links List -->
		{#if loading}
			<div class="text-center py-12">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
				<p class="mt-4 text-gray-600">Loading links...</p>
			</div>
		{:else if links.length === 0}
			<div class="text-center py-12">
				<div class="text-gray-400 mb-4">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
					</svg>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No links yet</h3>
				<p class="text-gray-500 mb-6">Be the first to add links to the {category.name} category!</p>
				<a 
					href="/add" 
					class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					Add Links
				</a>
			</div>
		{:else}
			<div class="space-y-4">
				{#each links as link, index}
					<LinkCard {link} showCategory={false} size="normal" />
				{/each}
			</div>

			<!-- Loading More Indicator -->
			{#if loadingMore}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
					<p class="mt-2 text-gray-600">Loading more links...</p>
				</div>
			{:else if !hasMore && links.length > 0}
				<div class="text-center py-8 text-gray-500">
					<p>You've reached the end of {category.name} links!</p>
				</div>
			{/if}
		{/if}
	</div>
{:else}
	<div class="text-center py-12">
		<p class="text-gray-500">Category not found</p>
		<a href="/" class="text-blue-500 hover:text-blue-700">← Back to Home</a>
	</div>
{/if}