import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const includeLinks = url.searchParams.get('include_links') === 'true';
		
		if (includeLinks) {
			// Get categories with their links
			const { data: categories, error: categoriesError } = await supabase
				.from('categories')
				.select('*')
				.order('name');

			if (categoriesError) {
				console.error('Categories error:', categoriesError);
				return json({ error: categoriesError.message }, { status: 500 });
			}

			// Get links for each category
			const categoriesWithLinks = await Promise.all(
				categories.map(async (category) => {
					const { data: links, error: linksError } = await supabase
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
								created_at
							)
						`)
						.eq('category_id', category.id)
						.limit(10);

					return {
						...category,
						links: linksError ? [] : (links?.map(l => l.links).filter(Boolean) || [])
					};
				})
			);

			return json({ categories: categoriesWithLinks });
		} else {
			// Just get categories
			const { data, error } = await supabase
				.from('categories')
				.select('*')
				.order('name');

			if (error) {
				console.error('Supabase error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			return json({ categories: data || [] });
		}
	} catch (err) {
		console.error('API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}