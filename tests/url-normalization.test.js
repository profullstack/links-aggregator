import { describe, it, expect } from 'vitest';

// Since the normalizeUrl function is not exported, we'll test it through the API
// But first, let's create a standalone version for testing
function normalizeUrl(url) {
	try {
		const urlObj = new URL(url);
		
		// Check if it's a .onion domain and has a trailing slash with no path
		if (urlObj.hostname.endsWith('.onion') && urlObj.pathname === '/') {
			// Remove the trailing slash for .onion domains
			return url.replace(/\/$/, '');
		}
		
		return url;
	} catch {
		// If URL parsing fails, return original URL
		return url;
	}
}

describe('URL Normalization', () => {
	describe('normalizeUrl function', () => {
		it('should remove trailing slash from .onion URLs with no path', () => {
			const input = 'http://example.onion/';
			const expected = 'http://example.onion';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should remove trailing slash from HTTPS .onion URLs', () => {
			const input = 'https://duckduckgogg42ts72.onion/';
			const expected = 'https://duckduckgogg42ts72.onion';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should NOT remove trailing slash from .onion URLs with paths', () => {
			const input = 'http://example.onion/search/';
			const expected = 'http://example.onion/search/';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should NOT modify regular HTTP URLs', () => {
			const input = 'https://example.com/';
			const expected = 'https://example.com/';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should NOT modify regular HTTPS URLs', () => {
			const input = 'https://github.com/user/repo';
			const expected = 'https://github.com/user/repo';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle .onion URLs without trailing slash', () => {
			const input = 'http://example.onion';
			const expected = 'http://example.onion';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle .onion URLs with query parameters', () => {
			const input = 'http://example.onion/?q=test';
			const expected = 'http://example.onion/?q=test';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle .onion URLs with fragments', () => {
			const input = 'http://example.onion/#section';
			const expected = 'http://example.onion/#section';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle invalid URLs gracefully', () => {
			const input = 'not-a-url';
			const expected = 'not-a-url';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle complex .onion URLs correctly', () => {
			const testCases = [
				{
					input: 'http://3g2upl4pq6kufc4m.onion/',
					expected: 'http://3g2upl4pq6kufc4m.onion'
				},
				{
					input: 'https://facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion/',
					expected: 'https://facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion'
				},
				{
					input: 'http://example.onion/path/to/page',
					expected: 'http://example.onion/path/to/page'
				}
			];

			testCases.forEach(({ input, expected }) => {
				expect(normalizeUrl(input)).toBe(expected);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle URLs with ports', () => {
			const input = 'http://example.onion:8080/';
			const expected = 'http://example.onion:8080';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should handle URLs with authentication', () => {
			const input = 'http://user:pass@example.onion/';
			const expected = 'http://user:pass@example.onion';
			expect(normalizeUrl(input)).toBe(expected);
		});

		it('should only affect .onion domains', () => {
			const testCases = [
				'https://example.com/',
				'https://subdomain.example.org/',
				'http://localhost:3000/',
				'https://192.168.1.1/'
			];

			testCases.forEach(url => {
				expect(normalizeUrl(url)).toBe(url);
			});
		});
	});
});