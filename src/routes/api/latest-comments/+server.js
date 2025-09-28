import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/latest-comments - Fetch latest comments across all links
 * Query params: limit (default: 50), offset (default: 0)
 */
/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Validate limit
		if (limit > 100) {
			return json({ error: 'Limit cannot exceed 100' }, { status: 400 });
		}

		// Fetch latest comments with link information
		const { data: comments, error } = await supabase
			.from('comments')
			.select(`
				id,
				content,
				author_name,
				created_at,
				vote_count,
				link_id,
				links!inner (
					id,
					title,
					url,
					description
				)
			`)
			.eq('is_deleted', false)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Latest comments fetch error:', error);
			return json({ error: 'Failed to fetch latest comments' }, { status: 500 });
		}

		// Transform the data to include link info at the top level for easier access
		const transformedComments = (comments || []).map(comment => ({
			id: comment.id,
			content: comment.content,
			author_name: comment.author_name,
			created_at: comment.created_at,
			vote_count: comment.vote_count,
			link_id: comment.link_id,
			link: comment.links
		}));

		return json({
			comments: transformedComments,
			total: transformedComments.length,
			hasMore: transformedComments.length === limit
		});
	} catch (err) {
		console.error('Latest comments GET error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}