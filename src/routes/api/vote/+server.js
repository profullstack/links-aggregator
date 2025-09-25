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

		// Check if session already voted on this link
		const { data: existingVote } = await supabase
			.from('votes')
			.select('*')
			.eq('link_id', linkId)
			.eq('session_id', sessionId)
			.single();

		if (existingVote) {
			if (voteType === null) {
				// Remove vote
				const { error } = await supabase
					.from('votes')
					.delete()
					.eq('id', existingVote.id);

				if (error) {
					console.error('Vote delete error:', error);
					return json({ error: error.message }, { status: 500 });
				}

				return json({ message: 'Vote removed successfully' });
			} else {
				// Update existing vote
				const { error } = await supabase
					.from('votes')
					.update({ vote_type: voteType })
					.eq('id', existingVote.id);

				if (error) {
					console.error('Vote update error:', error);
					return json({ error: error.message }, { status: 500 });
				}

				return json({ message: 'Vote updated successfully' });
			}
		} else if (voteType !== null) {
			// Create new vote
			const { error } = await supabase
				.from('votes')
				.insert({
					link_id: linkId,
					user_id: null,
					session_id: sessionId,
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

		// Get session's vote for this link
		const { data: userVote } = await supabase
			.from('votes')
			.select('vote_type')
			.eq('link_id', linkId)
			.eq('session_id', sessionId)
			.single();

		// Get vote counts for this link
		const { data: voteCounts } = await supabase
			.from('votes')
			.select('vote_type')
			.eq('link_id', linkId);

		const upvotes = voteCounts?.filter(v => v.vote_type === 1).length || 0;
		const downvotes = voteCounts?.filter(v => v.vote_type === -1).length || 0;
		const totalScore = upvotes - downvotes;

		return json({
			userVote: userVote?.vote_type || null,
			upvotes,
			downvotes,
			totalScore
		});
	} catch (err) {
		console.error('Vote GET error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}