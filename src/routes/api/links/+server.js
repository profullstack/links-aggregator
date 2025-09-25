import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { fetchUrlMetadata } from '$lib/metadata.js';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const category = url.searchParams.get('category');

		let query = supabase
			.from('links')
			.select(`
				*,
				link_categories!inner(
					categories!inner(name)
				)
			`)
			.eq('is_public', true);

		// Filter by category if specified
		if (category) {
			query = query.eq('link_categories.categories.name', category);
		}

		const { data, error } = await query
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json({ links: data || [] });
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
				
				// Fetch metadata if title not provided
				let metadata = {};
				if (!item.title) {
					metadata = await fetchUrlMetadata(item.url);
				}

				const linkData = {
					url: item.url,
					title: (item.title || metadata.title || urlObj.hostname).substring(0, 255),
					description: (item.description || metadata.description || '').substring(0, 1000),
					image_url: metadata.image || null,
					site_name: metadata.siteName || urlObj.hostname,
					domain: urlObj.hostname,
					favicon_url: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`,
					tags: item.tags || [],
					is_public: true,
					user_id: null // Anonymous for now
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

		// Insert with ON CONFLICT DO NOTHING to handle duplicates
		const { data, error } = await supabase
			.from('links')
			.upsert(validUrls, {
				onConflict: 'url',
				ignoreDuplicates: true
			})
			.select();

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json({ 
			message: `Successfully added ${data.length} links`,
			links: data 
		});
	} catch (err) {
		console.error('API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}