<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import VoteButtons from '$lib/components/VoteButtons.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import CommentThread from '$lib/components/CommentThread.svelte';

	let link = null;
	let comments = [];
	let loading = true;
	let commentsLoading = true;
	let error = null;

	$: linkId = $page.params.id;

	onMount(async () => {
		await loadLink();
		await loadComments();
	});

	async function loadLink() {
		try {
			const response = await fetch(`/api/links?id=${linkId}`);
			const result = await response.json();

			if (!response.ok) {
				if (response.status === 404) {
					error = 'Link not found';
				} else {
					error = result.error || 'Failed to load link';
				}
			} else if (result.links && result.links.length > 0) {
				link = result.links[0];
			} else {
				error = 'Link not found';
			}
		} catch (err) {
			console.error('Error loading link:', err);
			error = 'Failed to load link';
		} finally {
			loading = false;
		}
	}

	async function loadComments() {
		try {
			const response = await fetch(`/api/comments?linkId=${linkId}`);
			const result = await response.json();

			if (response.ok) {
				comments = result.comments || [];
			} else {
				console.error('Failed to load comments:', result.error);
			}
		} catch (err) {
			console.error('Error loading comments:', err);
		} finally {
			commentsLoading = false;
		}
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleCommentAdded() {
		// Reload comments when a new comment is added
		loadComments();
	}
</script>

<svelte:head>
	<title>{link?.title || 'Link'} - Links Aggregator</title>
	<meta name="description" content={link?.description || 'View and discuss this link'} />
</svelte:head>

{#if loading}
	<div class="max-w-4xl mx-auto px-4 py-8">
		<div class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			<p class="mt-4 text-gray-600">Loading link...</p>
		</div>
	</div>
{:else if error}
	<div class="max-w-4xl mx-auto px-4 py-8">
		<div class="text-center py-12">
			<div class="text-red-500 mb-4">
				<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">{error}</h3>
			<a 
				href="/" 
				class="text-blue-500 hover:text-blue-700 font-medium"
			>
				← Back to Home
			</a>
		</div>
	</div>
{:else if link}
	<div class="max-w-4xl mx-auto px-4 py-8">
		<!-- Link Details -->
		<div class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
			<div class="flex items-start space-x-4">
				{#if link.favicon_url}
					<img 
						src={link.favicon_url} 
						alt="" 
						class="w-8 h-8 mt-1 flex-shrink-0"
						loading="lazy"
					/>
				{/if}
				
				<div class="flex-1 min-w-0">
					<div class="flex items-start justify-between mb-4">
						<h1 class="text-2xl font-bold text-gray-900 flex-1">
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-blue-600 transition-colors"
							>
								{link.title || link.description || link.url}
							</a>
						</h1>
						<!-- Link Status Indicator -->
						{#if link.status}
							<span
								class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ml-4"
								class:bg-green-100={link.status === 'live'}
								class:text-green-800={link.status === 'live'}
								class:bg-red-100={link.status === 'dead'}
								class:text-red-800={link.status === 'dead'}
								class:bg-gray-100={link.status === 'unknown'}
								class:text-gray-800={link.status === 'unknown'}
								title="Link status: {link.status} {link.last_checked_at ? `(checked ${new Date(link.last_checked_at).toLocaleDateString()})` : ''}"
							>
								{#if link.status === 'live'}
									✓ Live
								{:else if link.status === 'dead'}
									✗ Dead
								{:else}
									? Unknown
								{/if}
							</span>
						{/if}
					</div>
					
					{#if link.description && link.title !== link.description}
						<p class="text-gray-600 mb-4 text-lg">{link.description}</p>
					{/if}
					
					<div class="text-sm text-gray-500 mb-4">
						<span class="font-medium">{link.domain || new URL(link.url).hostname}</span>
						<span class="mx-2">•</span>
						<span>Added {formatDate(link.created_at)}</span>
						{#if link.last_verified_at}
							<span class="mx-2">•</span>
							<span class="text-green-600">Last verified: {new Date(link.last_verified_at).toLocaleDateString()}</span>
						{/if}
					</div>
					
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-4">
							<VoteButtons linkId={link.id} initialScore={link.vote_count} size="large" />
							<CopyButton url={link.url} size="normal" />
						</div>
						
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							Visit Link →
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Comments Section -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-xl font-bold text-gray-900">
					Comments ({comments.length})
				</h2>
			</div>

			<!-- Comments Thread -->
			{#if commentsLoading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
					<p class="mt-2 text-gray-600">Loading comments...</p>
				</div>
			{:else}
				<CommentThread
					{comments}
					{linkId}
					on:comment-added={handleCommentAdded}
					on:reply-added={handleCommentAdded}
				/>
			{/if}
		</div>
	</div>
{/if}