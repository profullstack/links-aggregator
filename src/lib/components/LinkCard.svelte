<script>
	import VoteButtons from './VoteButtons.svelte';
	import CopyButton from './CopyButton.svelte';

	export let link;
	export let showCategory = true;
	export let size = 'normal'; // 'small', 'normal', 'large'

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

	function getDomainFromUrl(url) {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}

	// Size-based classes
	$: cardClasses = size === 'small' 
		? 'p-3' 
		: size === 'large' 
		? 'p-8' 
		: 'p-6';
	
	$: titleClasses = size === 'small' 
		? 'text-sm font-medium' 
		: size === 'large' 
		? 'text-xl font-bold' 
		: 'text-lg font-semibold';
	
	$: descriptionClasses = size === 'small' 
		? 'text-xs' 
		: 'text-sm';
	
	$: metaClasses = size === 'small' 
		? 'text-xs' 
		: 'text-sm';
	
	$: faviconSize = size === 'small' ? 'w-4 h-4' : 'w-6 h-6';
</script>

<div class="bg-white border border-gray-200 rounded-lg {cardClasses} hover:shadow-md transition-shadow">
	<div class="flex items-start space-x-4">
		{#if link.favicon_url}
			<img 
				src={link.favicon_url} 
				alt="" 
				class="{faviconSize} mt-1 flex-shrink-0"
				loading="lazy"
			/>
		{/if}
		
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between mb-2">
				<h3 class="{titleClasses} text-gray-900 flex-1">
					<a
						href="/links/{link.id}"
						class="hover:text-blue-600 transition-colors"
					>
						{link.title || link.description || getDomainFromUrl(link.url)}
					</a>
				</h3>
				<!-- Link Status Indicator -->
				{#if link.status}
					<span
						class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2"
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
				<p class="text-gray-600 mb-3 {descriptionClasses} line-clamp-2">{link.description}</p>
			{/if}
			
			{#if link.last_verified_at}
				<p class="text-xs text-green-600 mb-2" title="Last verified: {new Date(link.last_verified_at).toLocaleString()}">
					✓ Last verified: {new Date(link.last_verified_at).toLocaleDateString()}
				</p>
			{/if}
			
			<div class="flex items-center justify-between {metaClasses} text-gray-500">
				<div class="flex items-center space-x-4">
					<span>{link.domain || getDomainFromUrl(link.url)}</span>
					<span>•</span>
					<span>{formatDate(link.created_at)}</span>
					{#if showCategory && link.categories && link.categories.length > 0}
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
				</div>
				
				<div class="flex items-center space-x-4">
					<VoteButtons linkId={link.id} initialScore={link.vote_count} {size} />
					<a
						href="/links/{link.id}"
						class="text-blue-500 hover:text-blue-700"
						title="View comments and discuss this link"
					>
						💬
					</a>
					<CopyButton url={link.url} {size} />
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-500 hover:text-blue-700"
						title="Open link in new tab"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>