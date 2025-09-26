<script>
	import { onMount } from 'svelte';

	export let linkId;
	export let initialScore = 0;
	export let size = 'normal'; // 'small', 'normal', 'large'

	let userVote = null; // -1, 0, 1
	let upvotes = 0;
	let downvotes = 0;
	let totalScore = initialScore;
	let loading = false;
	let fingerprint = '';

	// Size classes
	const sizeClasses = {
		small: {
			button: 'w-6 h-6 text-xs',
			icon: 'w-3 h-3',
			text: 'text-xs'
		},
		normal: {
			button: 'w-8 h-8 text-sm',
			icon: 'w-4 h-4',
			text: 'text-sm'
		},
		large: {
			button: 'w-10 h-10 text-base',
			icon: 'w-5 h-5',
			text: 'text-base'
		}
	};

	onMount(async () => {
		// Generate browser fingerprint for anonymous voting
		fingerprint = generateFingerprint();
		await loadVoteData();
	});

	function generateFingerprint() {
		// Simple browser fingerprint based on available properties
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		ctx.textBaseline = 'top';
		ctx.font = '14px Arial';
		ctx.fillText('Browser fingerprint', 2, 2);
		
		const fingerprint = [
			navigator.userAgent,
			navigator.language,
			screen.width + 'x' + screen.height,
			new Date().getTimezoneOffset(),
			canvas.toDataURL()
		].join('|');
		
		// Create a simple hash
		let hash = 0;
		for (let i = 0; i < fingerprint.length; i++) {
			const char = fingerprint.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		
		return Math.abs(hash).toString(36);
	}

	async function loadVoteData() {
		try {
			const response = await fetch(`/api/vote?linkId=${linkId}&fingerprint=${fingerprint}`);
			const data = await response.json();

			if (response.ok) {
				userVote = data.userVote;
				upvotes = data.upvotes;
				downvotes = data.downvotes;
				totalScore = data.totalScore;
			}
		} catch (err) {
			console.error('Error loading vote data:', err);
		}
	}

	async function vote(voteType) {
		if (loading) return;

		loading = true;
		const previousVote = userVote;
		const previousScore = totalScore;

		// Optimistic update
		if (userVote === voteType) {
			// Remove vote
			userVote = null;
			totalScore -= voteType;
		} else {
			// Add or change vote
			if (userVote !== null) {
				totalScore -= userVote; // Remove old vote
			}
			userVote = voteType;
			totalScore += voteType; // Add new vote
		}

		try {
			const response = await fetch('/api/vote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					linkId,
					voteType: userVote, // null to remove vote
					fingerprint
				})
			});

			if (!response.ok) {
				throw new Error('Vote failed');
			}

			// Reload actual data to sync with database
			await loadVoteData();
		} catch (err) {
			console.error('Vote error:', err);
			// Revert optimistic update
			userVote = previousVote;
			totalScore = previousScore;
		} finally {
			loading = false;
		}
	}

	function handleUpvote() {
		vote(1);
	}

	function handleDownvote() {
		vote(-1);
	}
</script>

<div class="flex items-center space-x-1">
	<!-- Upvote Button -->
	<button
		on:click={handleUpvote}
		disabled={loading}
		class="flex items-center justify-center rounded-full border transition-colors {sizeClasses[size].button} {
			userVote === 1
				? 'bg-green-500 text-white border-green-500'
				: 'bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-600 hover:border-green-300'
		} {loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
		title="Upvote"
		aria-label="Upvote this link"
	>
		<svg class="{sizeClasses[size].icon}" fill="currentColor" viewBox="0 0 20 20">
			<path
				fill-rule="evenodd"
				d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	<!-- Score Display -->
	<span class="font-medium {sizeClasses[size].text} {
		totalScore > 0 ? 'text-green-600' : 
		totalScore < 0 ? 'text-red-600' : 
		'text-gray-600'
	} min-w-[2rem] text-center">
		{totalScore}
	</span>

	<!-- Downvote Button -->
	<button
		on:click={handleDownvote}
		disabled={loading}
		class="flex items-center justify-center rounded-full border transition-colors {sizeClasses[size].button} {
			userVote === -1
				? 'bg-red-500 text-white border-red-500'
				: 'bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
		} {loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
		title="Downvote"
		aria-label="Downvote this link"
	>
		<svg class="{sizeClasses[size].icon}" fill="currentColor" viewBox="0 0 20 20">
			<path
				fill-rule="evenodd"
				d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
</div>