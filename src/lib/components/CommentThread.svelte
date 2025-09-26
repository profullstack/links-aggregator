<script>
	import { createEventDispatcher } from 'svelte';
	import Comment from './Comment.svelte';
	import CommentForm from './CommentForm.svelte';

	export let comments = [];
	export let linkId;

	const dispatch = createEventDispatcher();

	function handleCommentAdded(event) {
		// Bubble up the event to parent component
		dispatch('comment-added', event.detail);
	}

	function handleReplyAdded(event) {
		// Bubble up the event to parent component
		dispatch('reply-added', event.detail);
	}

	// Recursively render comments and their replies
	function renderComment(comment, depth = 0) {
		return {
			comment,
			depth,
			replies: comment.replies ? comment.replies.map(reply => renderComment(reply, depth + 1)) : []
		};
	}

	$: threadedComments = comments.map(comment => renderComment(comment));
</script>

<div class="comment-thread">
	<!-- Main comment form -->
	<div class="mb-8">
		<CommentForm 
			{linkId} 
			placeholder="Share your thoughts about this link..."
			on:comment-added={handleCommentAdded}
		/>
	</div>

	<!-- Comments list -->
	{#if threadedComments.length > 0}
		<div class="space-y-6">
			{#each threadedComments as { comment, depth, replies }}
				<div class="comment-with-replies">
					<!-- Main comment -->
					<Comment 
						{comment} 
						{depth}
						on:reply-added={handleReplyAdded}
					/>
					
					<!-- Nested replies -->
					{#if replies.length > 0}
						<div class="replies mt-4 space-y-4">
							{#each replies as reply}
								<svelte:self 
									comments={[reply.comment]} 
									{linkId}
									on:comment-added={handleCommentAdded}
									on:reply-added={handleReplyAdded}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-8">
			<div class="text-gray-400 mb-4">
				<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-2.4-.32l-3.2 1.6a1 1 0 01-1.4-1.4l1.6-3.2A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
			<p class="text-gray-500">Be the first to share your thoughts about this link!</p>
		</div>
	{/if}
</div>

<style>
	.comment-thread {
		@apply space-y-6;
	}
	
	.comment-with-replies {
		@apply relative;
	}
	
	.replies {
		@apply border-l-2 border-gray-100 pl-4;
	}
</style>