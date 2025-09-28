<script>
	import { onMount } from 'svelte';

	/** @type {Array<any>} */
	let comments = [];
	let loading = true;
	/** @type {string | null} */
	let error = null;

	onMount(async () => {
		await loadLatestComments();
	});

	async function loadLatestComments() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch('/api/latest-comments?limit=50');
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to load comments');
			}

			comments = result.comments || [];
		} catch (/** @type {any} */ err) {
			console.error('Error loading latest comments:', err);
			error = err?.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function refreshComments() {
		await loadLatestComments();
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
	 * @param {string} content
	 * @param {number} maxLength
	 * @returns {string}
	 */
	function truncateContent(content, maxLength = 200) {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + '...';
	}
</script>

<svelte:head>
	<title>Latest Comments - Links Aggregator</title>
	<meta name="description" content="Browse the latest comments from our community" />
</svelte:head>

<div class="px-4 py-6 sm:px-0">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Latest Comments</h1>
		<p class="text-gray-600">
			See what the community is discussing across all links
		</p>
		<div class="mt-4">
			<a
				href="/latest"
				class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
			>
				← Back to Latest Links
			</a>
		</div>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			<p class="mt-4 text-gray-600">Loading latest comments...</p>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
			<div class="text-red-600 mb-2">
				<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-red-800 mb-2">Error Loading Comments</h3>
			<p class="text-red-700 mb-4">{error}</p>
			<button
				on:click={refreshComments}
				class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if comments.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-400 mb-4">
				<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-gray-900 mb-2">No Comments Found</h3>
			<p class="text-gray-600 mb-4">Be the first to start a conversation!</p>
			<a
				href="/latest"
				class="bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
			>
				Browse Links
			</a>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">
						{comments.length} Latest Comments
					</h2>
					<button
						on:click={refreshComments}
						class="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>
			
			<div class="divide-y divide-gray-200">
				{#each comments as comment}
					<div class="p-6 hover:bg-gray-50 transition-colors">
						<div class="flex items-start space-x-4">
							<div class="flex-shrink-0">
								<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
									<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
									</svg>
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center space-x-2 mb-2">
									<p class="text-sm font-medium text-gray-900">
										{comment.author_name || 'Anonymous'}
									</p>
									<span class="text-gray-300">•</span>
									<p class="text-sm text-gray-500">
										{formatDate(comment.created_at)}
									</p>
									{#if comment.vote_count > 0}
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
											+{comment.vote_count}
										</span>
									{/if}
								</div>
								<p class="text-gray-700 mb-3">
									{truncateContent(comment.content)}
								</p>
								<div class="bg-gray-50 rounded-lg p-3">
									<p class="text-sm text-gray-600 mb-1">Commented on:</p>
									<a
										href="/links/{comment.link_id}"
										class="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
									>
										{comment.link.title}
									</a>
									{#if comment.link.description}
										<p class="text-xs text-gray-500 mt-1">
											{truncateContent(comment.link.description, 100)}
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
		
		{#if comments.length === 50}
			<div class="mt-6 text-center">
				<p class="text-sm text-gray-500">
					Showing the latest 50 comments. 
					<a href="/latest" class="text-blue-600 hover:text-blue-800 font-medium">Browse more links!</a>
				</p>
			</div>
		{/if}
	{/if}
</div>