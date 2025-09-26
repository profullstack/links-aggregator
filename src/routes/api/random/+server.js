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
		
		console.log('Random API called, onionOnly:', onionOnly);
		
		let query = supabase
			.from('links')
			.select('*')
			.eq('is_public', true);

		// Filter for onion URLs only if requested
		if (onionOnly) {
			query = query.or('url.like.%.onion,url.like.%.onion/%');
		}

		// Get all links first to count them
		const { data: allData, error: fetchError } = await query;
		
		console.log('All links data:', allData?.length, 'Error:', fetchError);
		
		if (!allData || allData.length === 0) {
			// If no onion links found, try all links
			if (onionOnly) {
				console.log('No onion links found, trying all links...');
				const { data: allLinksData, error: allError } = await supabase
					.from('links')
					.select('*')
					.eq('is_public', true);
				
				console.log('All links data:', allLinksData?.length, 'Error:', allError);
				
				if (allLinksData && allLinksData.length > 0) {
					const randomIndex = Math.floor(Math.random() * allLinksData.length);
					return json({ link: allLinksData[randomIndex] });
				}
			}
			
			return json({ error: 'No links found' }, { status: 404 });
		}

		// Get a random link from the results
		const randomIndex = Math.floor(Math.random() * allData.length);
		console.log('Random index:', randomIndex, 'of', allData.length);

		const randomLink = allData[randomIndex];

		console.log('Selected random link:', randomLink);

		return json({ link: randomLink });
	} catch (err) {
		console.error('Random API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}