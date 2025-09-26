<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import CommentForm from './CommentForm.svelte';

	export let comment;
	export let depth = 0;
	export let linkId;

	const dispatch = createEventDispatcher();

	let showReplyForm = false;
	let voteLoading = false;
	let userVote = null;
	let voteScore = comment.vote_count || 0;

	// Load user's vote status when component mounts
	onMount(async () => {
		try {
			const response = await fetch(`/api/comment-votes?commentId=${comment.id}`);
			if (response.ok) {
				const data = await response.json();
				userVote = data.userVote;
				voteScore = data.totalScore;
			}
		} catch (err) {
			console.error('Failed to load vote status:', err);
		}
	});

	// Format date for display
	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	// Handle voting on comments
	async function handleVote(voteType) {
		if (voteLoading) return;

		voteLoading = true;
		try {
			const response = await fetch('/api/comment-votes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					commentId: comment.id,
					voteType: userVote === voteType ? null : voteType
				})
			});

			if (response.ok) {
				// Update local vote state
				const previousVote = userVote;
				userVote = userVote === voteType ? null : voteType;
				
				// Update score
				if (previousVote === null && userVote !== null) {
					voteScore += userVote;
				} else if (previousVote !== null && userVote === null) {
					voteScore -= previousVote;
				} else if (previousVote !== null && userVote !== null) {
					voteScore = voteScore - previousVote + userVote;
				}
			} else {
				console.error('Failed to vote on comment');
			}
		} catch (err) {
			console.error('Vote error:', err);
		} finally {
			voteLoading = false;
		}
	}

	function handleReply() {
		showReplyForm = !showReplyForm;
	}

	function handleReplySubmitted(event) {
		showReplyForm = false;
		dispatch('reply-added', event.detail);
	}

	// Calculate indentation based on depth (max 6 levels)
	$: indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 24)}` : '';
	$: isDeepThread = depth >= 6;
</script>

<div class="comment {indentClass}" class:deep-thread={isDeepThread}>
	<div class="flex space-x-3">
		<!-- Vote buttons -->
		<div class="flex flex-col items-center space-y-1 flex-shrink-0">
			<button
				type="button"
				class="p-1 rounded hover:bg-gray-100 transition-colors"
				class:text-orange-500={userVote === 1}
				class:text-gray-400={userVote !== 1}
				disabled={voteLoading}
				on:click={() => handleVote(1)}
				title="Upvote"
				aria-label="Upvote this comment"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
				</svg>
			</button>
			
			<span class="text-xs font-medium text-gray-600 min-w-[20px] text-center">
				{voteScore}
			</span>
			
			<button
				type="button"
				class="p-1 rounded hover:bg-gray-100 transition-colors"
				class:text-blue-500={userVote === -1}
				class:text-gray-400={userVote !== -1}
				disabled={voteLoading}
				on:click={() => handleVote(-1)}
				title="Downvote"
				aria-label="Downvote this comment"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>

		<!-- Comment content -->
		<div class="flex-1 min-w-0">
			<div class="bg-gray-50 rounded-lg p-3">
				<!-- Comment header -->
				<div class="flex items-center space-x-2 mb-2 text-sm text-gray-600">
					<span class="font-medium">
						{comment.author_name || 'Anonymous'}
					</span>
					<span>•</span>
					<span>{formatDate(comment.created_at)}</span>
				</div>

				<!-- Comment text -->
				<div class="text-gray-900 whitespace-pre-wrap break-words">
					{comment.content}
				</div>
			</div>

			<!-- Comment actions -->
			<div class="flex items-center space-x-4 mt-2 text-sm">
				<button
					type="button"
					class="text-gray-500 hover:text-blue-600 font-medium transition-colors"
					on:click={handleReply}
				>
					{showReplyForm ? 'Cancel' : 'Reply'}
				</button>
				
				{#if depth < 6}
					<span class="text-gray-400">•</span>
					<span class="text-gray-500">Level {depth + 1}</span>
				{/if}
			</div>

			<!-- Reply form -->
			{#if showReplyForm}
				<div class="mt-4">
					<CommentForm
						{linkId}
						parentId={comment.id}
						placeholder="Reply to this comment..."
						on:comment-added={handleReplySubmitted}
						on:cancel={() => showReplyForm = false}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.comment {
		@apply border-l-2 border-transparent;
	}
	
	.comment:hover {
		@apply border-l-blue-200;
	}
	
	.deep-thread {
		@apply bg-gray-50 rounded-r-lg pr-2;
	}
</style>