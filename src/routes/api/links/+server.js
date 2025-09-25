import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { fetchUrlMetadata, detectCategory } from '$lib/metadata.js';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

		if (category) {
			// Filter by specific category using INNER JOIN
			const { data, error } = await supabase
				.from('links')
				.select(`
					*,
					link_categories!inner(
						categories!inner(name)
					)
				`)
				.eq('is_public', true)
				.eq('link_categories.categories.name', category.toLowerCase())
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (error) {
				console.error('Category filter error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			return json({ links: data || [] });
		} else {
			// Get all links without category filtering
			const { data, error } = await supabase
				.from('links')
				.select('*')
				.eq('is_public', true)
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (error) {
				console.error('Links fetch error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			return json({ links: data || [] });
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
				const urlObj = new URL(item.url);
				
				// Fetch metadata only if title or category not provided
				let metadata = { title: '', description: '', image: '', siteName: '', category: 'technology' };
				if (!item.title || !item.category) {
					metadata = await fetchUrlMetadata(item.url);
				}

				const title = (item.title || metadata.title || urlObj.hostname).substring(0, 255);
				const description = (item.description || metadata.description || '').substring(0, 1000);
				const domain = urlObj.hostname;

				// Use provided category or detected category (guaranteed to return a valid category)
				const suggestedCategory = item.category || metadata.category;

				const linkData = {
					url: item.url,
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
				processedUrls.push(item.url);
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