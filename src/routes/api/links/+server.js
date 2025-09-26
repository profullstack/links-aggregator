import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { fetchUrlMetadata, detectCategory } from '$lib/metadata.js';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Normalize URL by trimming trailing slashes from .onion domains
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
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

/**
 * Assign categories to links based on detected categories
 * @param {Array} insertedLinks - Links that were successfully inserted
 * @param {Array} validUrls - Original URL data with suggested categories
 */
async function assignCategoriesToLinks(insertedLinks, validUrls) {
	try {
		// Get all categories
		const { data: categories } = await supabase
			.from('categories')
			.select('id, name');

		if (!categories) return;

		const categoryMap = {};
		categories.forEach(cat => {
			categoryMap[cat.name.toLowerCase()] = cat.id;
		});

		// Create link-category associations
		const linkCategories = [];
		
		for (const link of insertedLinks) {
			const originalData = validUrls.find(v => v.url === link.url);
			if (originalData?.suggestedCategory) {
				const categoryId = categoryMap[originalData.suggestedCategory];
				if (categoryId) {
					linkCategories.push({
						link_id: link.id,
						category_id: categoryId
					});
				}
			}
		}

		// Insert link-category relationships
		if (linkCategories.length > 0) {
			await supabase
				.from('link_categories')
				.upsert(linkCategories, { onConflict: 'link_id,category_id' });
		}
	} catch (err) {
		console.error('Error assigning categories:', err);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const category = url.searchParams.get('category');
		const sortBy = url.searchParams.get('sort') || 'latest'; // 'latest' or 'votes'
		const id = url.searchParams.get('id');

		// Handle single link fetch by ID
		if (id) {
			const { data, error } = await supabase
				.from('links')
				.select(`
					*,
					link_categories (
						categories (
							id,
							name,
							color
						)
					)
				`)
				.eq('id', id)
				.eq('is_public', true)
				.single();

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return json({ error: 'Link not found' }, { status: 404 });
				}
				console.error('Single link fetch error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			// Transform the data to include categories array
			const linkWithCategories = {
				...data,
				categories: data.link_categories?.map(lc => lc.categories) || []
			};

			// Remove the link_categories property as it's no longer needed
			const { link_categories, ...cleanedLink } = linkWithCategories;

			return json({ links: [cleanedLink] });
		}

		if (category) {
			console.log('Filtering by category:', category);
			
			// First, find the category ID by name (case-insensitive)
			const { data: categoryData } = await supabase
				.from('categories')
				.select('id, name')
				.ilike('name', category)
				.single();

			console.log('Found category:', categoryData);

			if (!categoryData) {
				console.log('No category found for:', category);
				return json({ links: [] }); // No category found
			}

			// Then get links for that category
			const { data, error } = await supabase
				.from('link_categories')
				.select(`
					links:link_id (
						id,
						title,
						url,
						description,
						image_url,
						site_name,
						domain,
						favicon_url,
						vote_count,
						created_at,
						updated_at,
						is_public,
						tags
					)
				`)
				.eq('category_id', categoryData.id);

			console.log('Link categories query result:', data, error);

			if (error) {
				console.error('Category filter error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			// Extract links from the nested structure and filter public ones
			const links = (data || [])
				.map(item => item.links)
				.filter(link => link && link.is_public);

			console.log('Filtered links:', links.length);

			return json({ links });
		} else {
			// Get all links without category filtering, including category information
			let query = supabase
				.from('links')
				.select(`
					*,
					link_categories (
						categories (
							id,
							name,
							color
						)
					)
				`)
				.eq('is_public', true);

			// Apply sorting based on sortBy parameter
			if (sortBy === 'votes') {
				query = query.order('vote_count', { ascending: false });
			} else {
				query = query.order('created_at', { ascending: false });
			}

			const { data, error } = await query.range(offset, offset + limit - 1);

			if (error) {
				console.error('Links fetch error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			// Transform the data to include categories array
			const linksWithCategories = (data || []).map(link => ({
				...link,
				categories: link.link_categories?.map(lc => lc.categories) || []
			}));

			// Remove the link_categories property as it's no longer needed
			const cleanedLinks = linksWithCategories.map(({ link_categories, ...link }) => link);

			return json({ links: cleanedLinks });
		}
	} catch (err) {
		console.error('API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { urls } = await request.json();

		if (!Array.isArray(urls) || urls.length === 0) {
			return json({ error: 'Invalid URLs array' }, { status: 400 });
		}

		// Process URLs with metadata fetching
		const validUrls = [];
		const processedUrls = [];
		
		for (const item of urls) {
			if (!item.url) continue;

			// Basic URL validation
			try {
				// Normalize the URL first (trim trailing slashes from .onion domains)
				const normalizedUrl = normalizeUrl(item.url);
				const urlObj = new URL(normalizedUrl);
				
				// Fetch metadata only if title or category not provided
				let metadata = { title: '', description: '', image: '', siteName: '', category: 'technology' };
				if (!item.title || !item.category) {
					metadata = await fetchUrlMetadata(normalizedUrl);
				}

				const title = (item.title || metadata.title || urlObj.hostname).substring(0, 255);
				const description = (item.description || metadata.description || '').substring(0, 1000);
				const domain = urlObj.hostname;

				// Use provided category or detected category (guaranteed to return a valid category)
				const suggestedCategory = item.category || metadata.category;

				const linkData = {
					url: normalizedUrl, // Use normalized URL
					title,
					description,
					image_url: metadata.image || null,
					site_name: metadata.siteName || domain,
					domain,
					favicon_url: `https://www.google.com/s2/favicons?domain=${domain}`,
					tags: item.tags || [],
					is_public: true,
					user_id: null, // Anonymous for now
					suggestedCategory
				};

				validUrls.push(linkData);
				processedUrls.push(normalizedUrl); // Use normalized URL
			} catch {
				// Skip invalid URLs
				continue;
			}
		}

		if (validUrls.length === 0) {
			return json({ error: 'No valid URLs provided' }, { status: 400 });
		}

		// Insert links with ON CONFLICT DO NOTHING to handle duplicates
		const linksToInsert = validUrls.map(({ suggestedCategory, ...link }) => link);
		
		const { data: insertedLinks, error } = await supabase
			.from('links')
			.upsert(linksToInsert, {
				onConflict: 'url',
				ignoreDuplicates: true
			})
			.select();

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: error.message }, { status: 500 });
		}

		// Auto-assign categories for successfully inserted links
		if (insertedLinks && insertedLinks.length > 0) {
			await assignCategoriesToLinks(insertedLinks, validUrls);
		}

		return json({
			message: `Successfully processed ${validUrls.length} links (${insertedLinks?.length || 0} new)`,
			links: insertedLinks
		});
	} catch (err) {
		console.error('API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}