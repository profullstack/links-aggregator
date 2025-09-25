<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let bulkUrls = '';
	let isSubmitting = false;
	let message = '';
	let messageType = 'info'; // 'success', 'error', 'info'

	/**
	 * Parse bulk URLs from textarea
	 * @param {string} text - Raw text input
	 * @returns {Array<{url: string, title: string, category: string}>} Parsed URLs
	 */
	function parseUrls(text) {
		const lines = text.split('\n').filter(line => line.trim());
		const urls = [];
		
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			
			// Check if line contains commas (CSV format)
			if (trimmed.includes(',')) {
				const parts = trimmed.split(',').map(part => part.trim());
				if (parts.length >= 1 && parts[0].match(/https?:\/\//)) {
					urls.push({
						url: parts[0],
						title: parts[1] || '',
						category: parts[2] || ''
					});
				}
			} else {
				// Try to extract URL and title (legacy format)
				const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
				if (urlMatch) {
					const url = urlMatch[1];
					// Use the rest of the line as title
					let title = trimmed.replace(url, '').trim();
					if (!title) {
						// Extract title from URL
						try {
							const urlObj = new URL(url);
							title = urlObj.hostname + urlObj.pathname;
						} catch {
							title = url;
						}
					}
					urls.push({ url, title, category: '' });
				}
			}
		}
		
		return urls;
	}

	/**
	 * Submit bulk URLs to database
	 */
	async function handleSubmit() {
		if (!bulkUrls.trim()) {
			message = 'Please enter some URLs';
			messageType = 'error';
			return;
		}

		isSubmitting = true;
		message = '';

		try {
			const urls = parseUrls(bulkUrls);
			
			if (urls.length === 0) {
				message = 'No valid URLs found. Please check your input.';
				messageType = 'error';
				return;
			}

			// Send URLs to API
			const response = await fetch('/api/links', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ urls })
			});

			const result = await response.json();

			if (!response.ok) {
				message = `Error: ${result.error}`;
				messageType = 'error';
			} else {
				message = result.message || `Successfully processed ${urls.length} links!`;
				messageType = 'success';
				bulkUrls = '';
				
				// Redirect to home after success
				setTimeout(() => {
					goto('/');
				}, 2000);
			}
		} catch (err) {
			console.error('Error:', err);
			message = 'An unexpected error occurred';
			messageType = 'error';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Add Links - Links Aggregator</title>
	<meta name="description" content="Add multiple links to your aggregator" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
	<div class="bg-white shadow rounded-lg p-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-6">Add Links</h1>
		
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="bulk-urls" class="block text-sm font-medium text-gray-700 mb-2">
					Bulk URL Input
				</label>
				<p class="text-sm text-gray-500 mb-3">
					Paste URLs one per line. Supports multiple formats including comma-separated values.
				</p>
				<textarea
					id="bulk-urls"
					bind:value={bulkUrls}
					placeholder="https://example.com, My Example Site, technology
https://github.com/user/repo, Cool GitHub Project, programming
https://news.ycombinator.com
https://dribbble.com My Design Site"
					rows="12"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					disabled={isSubmitting}
				></textarea>
			</div>

			{#if message}
				<div class="rounded-md p-4 {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
					{message}
				</div>
			{/if}

			<div class="flex gap-4">
				<button
					type="submit"
					disabled={isSubmitting || !bulkUrls.trim()}
					class="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded transition-colors"
				>
					{isSubmitting ? 'Adding Links...' : 'Add Links'}
				</button>
				
				<a
					href="/"
					class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors"
				>
					Cancel
				</a>
			</div>
		</form>

		<div class="mt-8 p-4 bg-gray-50 rounded-lg">
			<h3 class="font-semibold text-gray-800 mb-2">Supported Formats:</h3>
			<ul class="text-sm text-gray-600 space-y-1">
				<li>• <code>https://example.com, My Site Title, technology</code> (CSV: URL, title, category)</li>
				<li>• <code>https://example.com, My Site Title</code> (CSV: URL, title - auto-categorized)</li>
				<li>• <code>https://example.com</code> (URL only - auto-title and auto-categorized)</li>
				<li>• <code>https://example.com My Site Title</code> (URL + title - auto-categorized)</li>
			</ul>
			<div class="mt-3 text-xs text-gray-500">
				<strong>Categories:</strong> technology, programming, design, news, education, entertainment
			</div>
		</div>
	</div>
</div>