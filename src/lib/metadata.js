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
 * Batch fetch metadata for multiple URLs
 * @param {Array<string>} urls - Array of URLs
 * @returns {Promise<Array<{url: string, metadata: object}>>}
 */
export async function batchFetchMetadata(urls) {
	const results = await Promise.allSettled(
		urls.map(async (url) => {
			const metadata = await fetchUrlMetadata(url);
			return { url, metadata };
		})
	);

	return results.map((result, index) => {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			// Fallback for failed requests
			return {
				url: urls[index],
				metadata: {
					title: getDomainFromUrl(urls[index]),
					description: '',
					image: '',
					siteName: getDomainFromUrl(urls[index])
				}
			};
		}
	});
}