import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const onionOnly = url.searchParams.get('onion') === 'true';
		
		let query = supabase
			.from('links')
			.select('*')
			.eq('is_public', true);

		// Filter for onion URLs only if requested
		if (onionOnly) {
			query = query.like('url', '%.onion%');
		}

		// Get total count first
		const { count } = await query;
		
		if (!count || count === 0) {
			return json({ error: 'No links found' }, { status: 404 });
		}

		// Get a random offset
		const randomOffset = Math.floor(Math.random() * count);

		// Fetch one random link
		const { data, error } = await query
			.range(randomOffset, randomOffset)
			.limit(1);

		if (error) {
			console.error('Random link error:', error);
			return json({ error: error.message }, { status: 500 });
		}

		if (!data || data.length === 0) {
			return json({ error: 'No random link found' }, { status: 404 });
		}

		return json({ link: data[0] });
	} catch (err) {
		console.error('Random API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}