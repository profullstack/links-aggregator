<script>
	import { createEventDispatcher } from 'svelte';

	/** @type {string} */
	export let url;
	/** @type {'small' | 'normal'} */
	export let size = 'normal';
	/** @type {string} */
	export let className = '';

	const dispatch = createEventDispatcher();

	/** @type {'idle' | 'success' | 'error'} */
	let state = 'idle';
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timeoutId = null;

	/**
	 * Copy URL to clipboard
	 * @param {string} urlToCopy
	 * @returns {Promise<{success: boolean, message: string}>}
	 */
	async function copyToClipboard(urlToCopy) {
		try {
			if (!navigator?.clipboard?.writeText) {
				throw new Error('Clipboard API not supported');
			}
			await navigator.clipboard.writeText(urlToCopy);
			return { success: true, message: 'Copied!' };
		} catch (error) {
			console.error('Copy failed:', error);
			return { success: false, message: 'Copy failed' };
		}
	}

	/**
	 * Handle copy button click
	 */
	async function handleCopy() {
		if (state !== 'idle') return;

		const result = await copyToClipboard(url);
		
		if (result.success) {
			state = 'success';
			dispatch('copy', { url, success: true });
		} else {
			state = 'error';
			dispatch('copy', { url, success: false, error: result.message });
		}

		// Reset state after 2 seconds
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			state = 'idle';
		}, 2000);
	}

	// Get button classes based on size
	$: sizeClasses = size === 'small' ? 'w-4 h-4 p-1' : 'w-5 h-5 p-1';
	
	// Get title based on state
	$: title = state === 'success' 
		? 'Copied!' 
		: state === 'error' 
		? 'Copy failed' 
		: 'Copy URL to clipboard';

	// Get icon color based on state
	$: iconColor = state === 'success' 
		? 'text-green-600' 
		: state === 'error' 
		? 'text-red-600' 
		: 'text-gray-500 hover:text-blue-600';
</script>

<button
	type="button"
	class="inline-flex items-center justify-center rounded transition-colors {sizeClasses} {iconColor} {className}"
	{title}
	on:click={handleCopy}
	disabled={state !== 'idle'}
>
	{#if state === 'success'}
		<!-- Check icon -->
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
		</svg>
	{:else if state === 'error'}
		<!-- X icon -->
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
		</svg>
	{:else}
		<!-- Copy icon -->
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
		</svg>
	{/if}
</button>