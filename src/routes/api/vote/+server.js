import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, getClientAddress }) {
	try {
		const { linkId, voteType, fingerprint } = await request.json();

		// Validate input
		if (!linkId || (voteType !== 1 && voteType !== -1 && voteType !== null)) {
			return json({ error: 'Invalid vote data' }, { status: 400 });
		}

		// Create session ID from IP + fingerprint for anonymous voting
		const clientIP = getClientAddress();
		const sessionId = `anon_${Buffer.from(clientIP + (fingerprint || '')).toString('base64').substring(0, 16)}`;

		// For now, allow multiple votes per link (until migration is applied)
		// This is a temporary fix until the session_id column is added
		const existingVote = null;

		if (voteType !== null) {
			// Create new vote (temporary: without session_id until migration applied)
			const { error } = await supabase
				.from('votes')
				.insert({
					link_id: linkId,
					user_id: null,
					vote_type: voteType
				});

			if (error) {
				console.error('Vote insert error:', error);
				return json({ error: error.message }, { status: 500 });
			}

			return json({ message: 'Vote recorded successfully' });
		}

		return json({ message: 'No action taken' });
	} catch (err) {
		console.error('Vote API error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, getClientAddress }) {
	try {
		const linkId = url.searchParams.get('linkId');
		const fingerprint = url.searchParams.get('fingerprint');

		if (!linkId) {
			return json({ error: 'Link ID required' }, { status: 400 });
		}

		// Create session ID from IP + fingerprint for anonymous voting
		const clientIP = getClientAddress();
		const sessionId = `anon_${Buffer.from(clientIP + (fingerprint || '')).toString('base64').substring(0, 16)}`;

		// For now, return no user vote (until migration is applied)
		const userVote = null;

		// Get vote counts for this link
		const { data: voteCounts } = await supabase
			.from('votes')
			.select('vote_type')
			.eq('link_id', linkId);

		const upvotes = voteCounts?.filter(v => v.vote_type === 1).length || 0;
		const downvotes = voteCounts?.filter(v => v.vote_type === -1).length || 0;
		const totalScore = upvotes - downvotes;

		return json({
			userVote: null, // Temporary: no user vote tracking until migration applied
			upvotes,
			downvotes,
			totalScore
		});
	} catch (err) {
		console.error('Vote GET error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}