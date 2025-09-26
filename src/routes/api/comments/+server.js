import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create server-side Supabase client with service role
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/comments - Fetch comments for a link
 * Query params: linkId (required), limit, offset
 */
/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const linkId = url.searchParams.get('linkId');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		if (!linkId) {
			return json({ error: 'Link ID is required' }, { status: 400 });
		}

		// Fetch comments with threading structure
		const { data: comments, error } = await supabase
			.from('comments')
			.select('*')
			.eq('link_id', linkId)
			.eq('is_deleted', false)
			.order('created_at', { ascending: true })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Comments fetch error:', error);
			return json({ error: 'Failed to fetch comments' }, { status: 500 });
		}

		// Build threaded structure
		const threadedComments = buildCommentTree(comments || []);

		return json({
			comments: threadedComments,
			total: comments?.length || 0
		});
	} catch (err) {
		console.error('Comments GET error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * POST /api/comments - Create a new comment
 * Body: { linkId, content, authorName?, authorEmail?, parentId? }
 */
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, getClientAddress }) {
	try {
		const { linkId, content, authorName, authorEmail, parentId } = await request.json();

		// Validate input
		if (!linkId || !content?.trim()) {
			return json({ error: 'Link ID and content are required' }, { status: 400 });
		}

		if (content.length > 2000) {
			return json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
		}

		// Verify link exists
		const { data: link, error: linkError } = await supabase
			.from('links')
			.select('id')
			.eq('id', linkId)
			.single();

		if (linkError || !link) {
			return json({ error: 'Link not found' }, { status: 404 });
		}

		// If parentId provided, verify parent comment exists
		if (parentId) {
			const { data: parentComment, error: parentError } = await supabase
				.from('comments')
				.select('id')
				.eq('id', parentId)
				.eq('link_id', linkId)
				.eq('is_deleted', false)
				.single();

			if (parentError || !parentComment) {
				return json({ error: 'Parent comment not found' }, { status: 404 });
			}
		}

		// Create comment
		const { data: comment, error } = await supabase
			.from('comments')
			.insert({
				link_id: linkId,
				parent_id: parentId || null,
				content: content.trim(),
				author_name: authorName?.trim() || null,
				author_email: authorEmail?.trim() || null
			})
			.select()
			.single();

		if (error) {
			console.error('Comment insert error:', error);
			return json({ error: 'Failed to create comment' }, { status: 500 });
		}

		return json({ comment }, { status: 201 });
	} catch (err) {
		console.error('Comments POST error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * PUT /api/comments - Update a comment (soft delete)
 * Body: { commentId, isDeleted }
 */
/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	try {
		const { commentId, isDeleted } = await request.json();

		if (!commentId) {
			return json({ error: 'Comment ID is required' }, { status: 400 });
		}

		// Only allow soft deletion for now
		if (typeof isDeleted !== 'boolean') {
			return json({ error: 'isDeleted must be a boolean' }, { status: 400 });
		}

		const { data: comment, error } = await supabase
			.from('comments')
			.update({ is_deleted: isDeleted })
			.eq('id', commentId)
			.select()
			.single();

		if (error) {
			console.error('Comment update error:', error);
			return json({ error: 'Failed to update comment' }, { status: 500 });
		}

		return json({ comment });
	} catch (err) {
		console.error('Comments PUT error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Build a threaded comment tree from flat array
 * @param {Array} comments - Flat array of comments
 * @returns {Array} - Nested comment tree
 */
function buildCommentTree(comments) {
	const commentMap = new Map();
	const rootComments = [];

	// First pass: create map of all comments
	comments.forEach(comment => {
		comment.replies = [];
		commentMap.set(comment.id, comment);
	});

	// Second pass: build tree structure
	comments.forEach(comment => {
		if (comment.parent_id) {
			const parent = commentMap.get(comment.parent_id);
			if (parent) {
				parent.replies.push(comment);
			} else {
				// Parent not found, treat as root comment
				rootComments.push(comment);
			}
		} else {
			rootComments.push(comment);
		}
	});

	return rootComments;
}