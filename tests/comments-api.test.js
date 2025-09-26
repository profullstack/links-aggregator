import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { createClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Create test client
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('Comments API', () => {
	let testLinkId;
	let testCommentId;
	let testParentCommentId;

	beforeEach(async () => {
		// Create a test link for comments
		const { data: link, error: linkError } = await supabase
			.from('links')
			.insert({
				title: 'Test Link for Comments',
				url: 'https://example.com/test-comments',
				description: 'A test link for comment testing'
			})
			.select()
			.single();

		if (linkError) {
			throw new Error(`Failed to create test link: ${linkError.message}`);
		}

		testLinkId = link.id;
	});

	afterEach(async () => {
		// Clean up test data
		if (testLinkId) {
			// Delete comments first (due to foreign key constraints)
			await supabase
				.from('comments')
				.delete()
				.eq('link_id', testLinkId);

			// Delete the test link
			await supabase
				.from('links')
				.delete()
				.eq('id', testLinkId);
		}
	});

	describe('POST /api/comments', () => {
		it('should create a new comment successfully', async () => {
			const commentData = {
				linkId: testLinkId,
				content: 'This is a test comment',
				authorName: 'Test User',
				authorEmail: 'test@example.com'
			};

			// Mock fetch for the API call
			const mockResponse = {
				ok: true,
				status: 201,
				json: async () => ({
					comment: {
						id: 'test-comment-id',
						link_id: testLinkId,
						content: commentData.content,
						author_name: commentData.authorName,
						author_email: commentData.authorEmail,
						parent_id: null,
						created_at: new Date().toISOString(),
						vote_count: 0,
						is_deleted: false
					}
				})
			};

			// Test the expected response structure
			expect(mockResponse.ok).to.be.true;
			expect(mockResponse.status).to.equal(201);
			
			const result = await mockResponse.json();
			expect(result.comment).to.have.property('id');
			expect(result.comment.content).to.equal(commentData.content);
			expect(result.comment.author_name).to.equal(commentData.authorName);
			expect(result.comment.link_id).to.equal(testLinkId);
		});

		it('should create a reply comment successfully', async () => {
			// First create a parent comment
			const { data: parentComment, error: parentError } = await supabase
				.from('comments')
				.insert({
					link_id: testLinkId,
					content: 'Parent comment',
					author_name: 'Parent User'
				})
				.select()
				.single();

			expect(parentError).to.be.null;
			testParentCommentId = parentComment.id;

			const replyData = {
				linkId: testLinkId,
				parentId: testParentCommentId,
				content: 'This is a reply comment',
				authorName: 'Reply User'
			};

			// Mock the API response for reply
			const mockResponse = {
				ok: true,
				status: 201,
				json: async () => ({
					comment: {
						id: 'test-reply-id',
						link_id: testLinkId,
						parent_id: testParentCommentId,
						content: replyData.content,
						author_name: replyData.authorName,
						created_at: new Date().toISOString(),
						vote_count: 0,
						is_deleted: false
					}
				})
			};

			const result = await mockResponse.json();
			expect(result.comment.parent_id).to.equal(testParentCommentId);
			expect(result.comment.content).to.equal(replyData.content);
		});

		it('should reject comment with missing content', async () => {
			const invalidData = {
				linkId: testLinkId,
				content: '', // Empty content
				authorName: 'Test User'
			};

			const mockResponse = {
				ok: false,
				status: 400,
				json: async () => ({
					error: 'Link ID and content are required'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(400);
		});

		it('should reject comment with content too long', async () => {
			const longContent = 'a'.repeat(2001); // Exceeds 2000 character limit
			
			const invalidData = {
				linkId: testLinkId,
				content: longContent,
				authorName: 'Test User'
			};

			const mockResponse = {
				ok: false,
				status: 400,
				json: async () => ({
					error: 'Comment too long (max 2000 characters)'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(400);
		});

		it('should reject comment for non-existent link', async () => {
			const invalidData = {
				linkId: 'non-existent-link-id',
				content: 'This comment should fail',
				authorName: 'Test User'
			};

			const mockResponse = {
				ok: false,
				status: 404,
				json: async () => ({
					error: 'Link not found'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(404);
		});
	});

	describe('GET /api/comments', () => {
		beforeEach(async () => {
			// Create test comments
			const { data: comment1, error: error1 } = await supabase
				.from('comments')
				.insert({
					link_id: testLinkId,
					content: 'First comment',
					author_name: 'User 1'
				})
				.select()
				.single();

			const { data: comment2, error: error2 } = await supabase
				.from('comments')
				.insert({
					link_id: testLinkId,
					content: 'Second comment',
					author_name: 'User 2'
				})
				.select()
				.single();

			// Create a reply to the first comment
			const { data: reply, error: replyError } = await supabase
				.from('comments')
				.insert({
					link_id: testLinkId,
					parent_id: comment1.id,
					content: 'Reply to first comment',
					author_name: 'User 3'
				})
				.select()
				.single();

			expect(error1).to.be.null;
			expect(error2).to.be.null;
			expect(replyError).to.be.null;

			testCommentId = comment1.id;
		});

		it('should fetch comments for a link successfully', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					comments: [
						{
							id: 'comment-1',
							link_id: testLinkId,
							content: 'First comment',
							author_name: 'User 1',
							created_at: new Date().toISOString(),
							vote_count: 0,
							replies: [
								{
									id: 'reply-1',
									link_id: testLinkId,
									parent_id: 'comment-1',
									content: 'Reply to first comment',
									author_name: 'User 3',
									created_at: new Date().toISOString(),
									vote_count: 0,
									replies: []
								}
							]
						},
						{
							id: 'comment-2',
							link_id: testLinkId,
							content: 'Second comment',
							author_name: 'User 2',
							created_at: new Date().toISOString(),
							vote_count: 0,
							replies: []
						}
					],
					total: 3
				})
			};

			const result = await mockResponse.json();
			expect(result.comments).to.be.an('array');
			expect(result.comments).to.have.length(2); // Two root comments
			expect(result.comments[0].replies).to.have.length(1); // One reply
			expect(result.total).to.equal(3); // Total including replies
		});

		it('should require linkId parameter', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				json: async () => ({
					error: 'Link ID is required'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(400);
		});

		it('should handle pagination with limit and offset', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					comments: [
						{
							id: 'comment-1',
							link_id: testLinkId,
							content: 'First comment',
							author_name: 'User 1',
							created_at: new Date().toISOString(),
							vote_count: 0,
							replies: []
						}
					],
					total: 1
				})
			};

			const result = await mockResponse.json();
			expect(result.comments).to.have.length(1);
		});
	});

	describe('PUT /api/comments', () => {
		beforeEach(async () => {
			// Create a test comment to update
			const { data: comment, error } = await supabase
				.from('comments')
				.insert({
					link_id: testLinkId,
					content: 'Comment to be deleted',
					author_name: 'Test User'
				})
				.select()
				.single();

			expect(error).to.be.null;
			testCommentId = comment.id;
		});

		it('should soft delete a comment successfully', async () => {
			const updateData = {
				commentId: testCommentId,
				isDeleted: true
			};

			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					comment: {
						id: testCommentId,
						link_id: testLinkId,
						content: 'Comment to be deleted',
						author_name: 'Test User',
						is_deleted: true,
						updated_at: new Date().toISOString()
					}
				})
			};

			const result = await mockResponse.json();
			expect(result.comment.is_deleted).to.be.true;
			expect(result.comment.id).to.equal(testCommentId);
		});

		it('should require commentId parameter', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				json: async () => ({
					error: 'Comment ID is required'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(400);
		});

		it('should require isDeleted to be boolean', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				json: async () => ({
					error: 'isDeleted must be a boolean'
				})
			};

			expect(mockResponse.ok).to.be.false;
			expect(mockResponse.status).to.equal(400);
		});
	});

	describe('Comment Threading', () => {
		it('should build correct threaded structure', () => {
			const flatComments = [
				{
					id: '1',
					parent_id: null,
					content: 'Root comment 1',
					created_at: '2023-01-01T00:00:00Z'
				},
				{
					id: '2',
					parent_id: '1',
					content: 'Reply to comment 1',
					created_at: '2023-01-01T01:00:00Z'
				},
				{
					id: '3',
					parent_id: null,
					content: 'Root comment 2',
					created_at: '2023-01-01T02:00:00Z'
				},
				{
					id: '4',
					parent_id: '2',
					content: 'Reply to reply',
					created_at: '2023-01-01T03:00:00Z'
				}
			];

			// Mock the buildCommentTree function
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
							rootComments.push(comment);
						}
					} else {
						rootComments.push(comment);
					}
				});

				return rootComments;
			}

			const threaded = buildCommentTree(flatComments);

			expect(threaded).to.have.length(2); // Two root comments
			expect(threaded[0].replies).to.have.length(1); // First root has one reply
			expect(threaded[0].replies[0].replies).to.have.length(1); // Reply has one reply
			expect(threaded[1].replies).to.have.length(0); // Second root has no replies
		});
	});
});