/**
 * Fetch metadata from a URL
 * @param {string} url - The URL to fetch metadata from
 * @returns {Promise<{title: string, description: string, image: string, siteName: string}>}
 */
export async function fetchUrlMetadata(url) {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; LinksAggregator/1.0)'
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const html = await response.text();
		
		// Extract metadata using regex patterns
		const metadata = {
			title: extractMetaContent(html, 'title') || extractTitle(html) || getDomainFromUrl(url),
			description: extractMetaContent(html, 'description') || '',
			image: extractMetaContent(html, 'image') || '',
			siteName: extractMetaContent(html, 'site_name') || getDomainFromUrl(url)
		};

		return metadata;
	} catch (error) {
		console.error(`Error fetching metadata for ${url}:`, error);
		
		// Fallback to URL-based metadata
		return {
			title: getDomainFromUrl(url),
			description: '',
			image: '',
			siteName: getDomainFromUrl(url)
		};
	}
}

/**
 * Extract meta content from HTML
 * @param {string} html - HTML content
 * @param {string} property - Property to extract (title, description, image, site_name)
 * @returns {string|null}
 */
function extractMetaContent(html, property) {
	const patterns = {
		title: [
			/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
			/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i,
			/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:title["']/i
		],
		description: [
			/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
			/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
			/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
			/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i
		],
		image: [
			/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
			/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i
		],
		site_name: [
			/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i,
			/<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i
		]
	};

	const propertyPatterns = patterns[property] || [];
	
	for (const pattern of propertyPatterns) {
		const match = html.match(pattern);
		if (match && match[1]) {
			return match[1].trim();
		}
	}

	return null;
}

/**
 * Extract title from HTML title tag
 * @param {string} html - HTML content
 * @returns {string|null}
 */
function extractTitle(html) {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return match ? match[1].trim() : null;
}

/**
 * Get domain name from URL
 * @param {string} url - URL string
 * @returns {string}
 */
function getDomainFromUrl(url) {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		return url;
	}
}

/**
 * Detect category based on content analysis
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {string} domain - Domain name
 * @returns {string|null} Suggested category name
 */
export function detectCategory(title, description, domain) {
	const content = `${title} ${description} ${domain}`.toLowerCase();
	
	// Category keywords mapping
	const categoryKeywords = {
		technology: [
			'tech', 'technology', 'software', 'hardware', 'computer', 'digital',
			'innovation', 'startup', 'ai', 'artificial intelligence', 'machine learning',
			'blockchain', 'crypto', 'iot', 'cloud', 'saas', 'api', 'mobile app',
			'techcrunch', 'wired', 'ars-technica', 'theverge'
		],
		programming: [
			'code', 'coding', 'programming', 'developer', 'development', 'software',
			'javascript', 'python', 'react', 'node', 'github', 'git', 'framework',
			'library', 'tutorial', 'documentation', 'stackoverflow', 'dev.to',
			'medium.com', 'hackernews', 'freecodecamp', 'codecademy'
		],
		design: [
			'design', 'ui', 'ux', 'interface', 'graphic', 'visual', 'creative',
			'typography', 'color', 'layout', 'wireframe', 'prototype', 'figma',
			'sketch', 'adobe', 'dribbble', 'behance', 'awwwards'
		],
		news: [
			'news', 'breaking', 'latest', 'update', 'report', 'article', 'story',
			'current events', 'politics', 'world', 'reuters', 'bbc', 'cnn',
			'nytimes', 'guardian', 'washingtonpost', 'npr'
		],
		education: [
			'education', 'learning', 'course', 'tutorial', 'lesson', 'study',
			'university', 'college', 'school', 'academic', 'research', 'knowledge',
			'coursera', 'udemy', 'edx', 'khan academy', 'mit', 'stanford'
		],
		entertainment: [
			'entertainment', 'fun', 'game', 'movie', 'music', 'video', 'streaming',
			'netflix', 'youtube', 'spotify', 'gaming', 'film', 'tv', 'show',
			'comedy', 'humor', 'meme', 'reddit', 'imgur'
		]
	};

	// Score each category based on keyword matches
	const scores = {};
	for (const [category, keywords] of Object.entries(categoryKeywords)) {
		scores[category] = 0;
		for (const keyword of keywords) {
			if (content.includes(keyword)) {
				// Weight domain matches higher
				const weight = domain.includes(keyword) ? 3 : 1;
				scores[category] += weight;
			}
		}
	}

	// Find category with highest score
	const bestCategory = Object.entries(scores).reduce((best, [category, score]) => {
		return score > best.score ? { category, score } : best;
	}, { category: null, score: 0 });

	// Return category if score is above threshold
	return bestCategory.score >= 2 ? bestCategory.category : null;
}

/**
 * Batch fetch metadata for multiple URLs
 * @param {Array<string>} urls - Array of URLs
 * @returns {Promise<Array<{url: string, metadata: object}>>}
 */
export async function batchFetchMetadata(urls) {
	const results = await Promise.allSettled(
		urls.map(async (url) => {
			const metadata = await fetchUrlMetadata(url);
			const domain = getDomainFromUrl(url);
			const suggestedCategory = detectCategory(
				metadata.title || '',
				metadata.description || '',
				domain
			);
			
			return {
				url,
				metadata: {
					...metadata,
					suggestedCategory
				}
			};
		})
	);

	return results.map((result, index) => {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			// Fallback for failed requests
			const domain = getDomainFromUrl(urls[index]);
			return {
				url: urls[index],
				metadata: {
					title: domain,
					description: '',
					image: '',
					siteName: domain,
					suggestedCategory: null
				}
			};
		}
	});
}