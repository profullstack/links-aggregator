import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/comment-votes - Vote on a comment
 * Body: { commentId, voteType }
 */
export async function POST({ request, getClientAddress }) {
	try {
		const { commentId, voteType } = await request.json();

		// Validate input
		if (!commentId || (voteType !== 1 && voteType !== -1 && voteType !== null)) {
			return json({ error: 'Invalid vote data' }, { status: 400 });
		}

		// Get client IP for anonymous voting
		const clientIP = getClientAddress();

		// Check if comment exists
		const { data: comment, error: commentError } = await supabase
			.from('comments')
			.select('id')
			.eq('id', commentId)
			.eq('is_deleted', false)
			.single();

		if (commentError || !comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (voteType === null) {
			// Remove existing vote
			const { error } = await supabase
				.from('comment_votes')
				.delete()
				.eq('comment_id', commentId)
				.eq('voter_ip', clientIP);

			if (error) {
				console.error('Comment vote delete error:', error);
				return json({ error: 'Failed to remove vote' }, { status: 500 });
			}

			return json({ message: 'Vote removed successfully' });
		} else {
			// Insert or update vote
			const { error } = await supabase
				.from('comment_votes')
				.upsert({
					comment_id: commentId,
					voter_ip: clientIP,
					vote_type: voteType
				}, {
					onConflict: 'comment_id,voter_ip'
				});

			if (error) {
				console.error('Comment vote upsert error:', error);
				return json({ error: 'Failed to record vote' }, { status: 500 });
			}

			return json({ message: 'Vote recorded successfully' });
		}
	} catch (err) {
		console.error('Comment vote POST error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * GET /api/comment-votes - Get vote status for comments
 * Query params: commentId (required)
 */
export async function GET({ url, getClientAddress }) {
	try {
		const commentId = url.searchParams.get('commentId');

		if (!commentId) {
			return json({ error: 'Comment ID is required' }, { status: 400 });
		}

		const clientIP = getClientAddress();

		// Get user's vote for this comment
		const { data: userVote } = await supabase
			.from('comment_votes')
			.select('vote_type')
			.eq('comment_id', commentId)
			.eq('voter_ip', clientIP)
			.single();

		// Get vote counts for this comment
		const { data: voteCounts } = await supabase
			.from('comment_votes')
			.select('vote_type')
			.eq('comment_id', commentId);

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
		console.error('Comment vote GET error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}