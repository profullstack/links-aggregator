<script>
	import { createEventDispatcher } from 'svelte';

	export let linkId;
	export let parentId = null;
	export let placeholder = 'Add a comment...';

	const dispatch = createEventDispatcher();

	let content = '';
	let authorName = '';
	let submitting = false;
	let error = null;

	async function handleSubmit() {
		if (!content.trim()) {
			error = 'Comment content is required';
			return;
		}

		if (content.length > 2000) {
			error = 'Comment is too long (max 2000 characters)';
			return;
		}

		submitting = true;
		error = null;

		try {
			const response = await fetch('/api/comments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					linkId,
					parentId,
					content: content.trim(),
					authorName: authorName.trim() || null,
					authorEmail: null
				})
			});

			const result = await response.json();

			if (response.ok) {
				// Clear form
				content = '';
				authorName = '';
				
				// Dispatch success event
				dispatch('comment-added', {
					comment: result.comment,
					parentId
				});
			} else {
				error = result.error || 'Failed to add comment';
			}
		} catch (err) {
			console.error('Comment submission error:', err);
			error = 'Failed to add comment. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		content = '';
		authorName = '';
		error = null;
		dispatch('cancel');
	}

	// Character count for content
	$: remainingChars = 2000 - content.length;
	$: isOverLimit = remainingChars < 0;
</script>

<div class="comment-form bg-white border border-gray-200 rounded-lg p-4">
	<form on:submit|preventDefault={handleSubmit}>
		<!-- Author info (optional) -->
		<div class="mb-4">
			<label for="author-name" class="block text-sm font-medium text-gray-700 mb-1">
				Name (optional)
			</label>
			<input
				id="author-name"
				type="text"
				bind:value={authorName}
				placeholder="Anonymous"
				maxlength="100"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				disabled={submitting}
			/>
		</div>

		<!-- Comment content -->
		<div class="mb-4">
			<label for="comment-content" class="block text-sm font-medium text-gray-700 mb-1">
				Comment
			</label>
			<textarea
				id="comment-content"
				bind:value={content}
				{placeholder}
				rows="4"
				maxlength="2000"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
				class:border-red-300={isOverLimit}
				class:focus:ring-red-500={isOverLimit}
				disabled={submitting}
				required
			></textarea>
			<div class="flex justify-between items-center mt-1">
				<div class="text-xs text-gray-500">
					{#if parentId}
						Replying to comment
					{:else}
						Add your thoughts about this link
					{/if}
				</div>
				<div class="text-xs" class:text-red-500={isOverLimit} class:text-gray-500={!isOverLimit}>
					{remainingChars} characters remaining
				</div>
			</div>
		</div>

		<!-- Error message -->
		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
				<p class="text-sm text-red-700">{error}</p>
			</div>
		{/if}

		<!-- Form actions -->
		<div class="flex items-center justify-between">
			<div class="text-xs text-gray-500">
				Comments are public and anonymous by default
			</div>
			<div class="flex items-center space-x-3">
				{#if parentId}
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
						disabled={submitting}
						on:click={handleCancel}
					>
						Cancel
					</button>
				{/if}
				<button
					type="submit"
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					disabled={submitting || !content.trim() || isOverLimit}
				>
					{#if submitting}
						<span class="flex items-center">
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Posting...
						</span>
					{:else}
						{parentId ? 'Reply' : 'Post Comment'}
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>

<style>
	.comment-form {
		@apply shadow-sm;
	}
	
	.comment-form:focus-within {
		@apply ring-2 ring-blue-500 ring-opacity-50;
	}
</style>