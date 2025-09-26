<script>
	import { createEventDispatcher } from 'svelte';
	import Comment from './Comment.svelte';

	export let comments = [];
	export let linkId;

	const dispatch = createEventDispatcher();

	function handleReplyAdded(event) {
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

<div class="comment-list">
	{#if threadedComments.length > 0}
		<div class="space-y-6">
			{#each threadedComments as { comment, depth, replies }}
				<div class="comment-with-replies">
					<!-- Main comment -->
					<Comment
						{comment}
						{depth}
						{linkId}
						on:reply-added={handleReplyAdded}
					/>
					
					<!-- Nested replies -->
					{#if replies.length > 0}
						<div class="replies mt-4 space-y-4">
							<svelte:self 
								comments={replies.map(r => r.comment)}
								{linkId}
								on:reply-added={handleReplyAdded}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.comment-with-replies {
		@apply relative;
	}
	
	.replies {
		@apply border-l-2 border-gray-100 pl-4;
	}
</style>