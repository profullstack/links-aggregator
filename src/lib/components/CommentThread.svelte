<script>
	import { createEventDispatcher } from 'svelte';
	import CommentForm from './CommentForm.svelte';
	import CommentList from './CommentList.svelte';

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
	{#if comments.length > 0}
		<CommentList
			{comments}
			{linkId}
			on:reply-added={handleReplyAdded}
		/>
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
</style>