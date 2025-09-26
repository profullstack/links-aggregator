#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Parse command line arguments to extract URL or comment ID
 * @param {string[]} argv - Command line arguments
 * @returns {string|null} - URL or comment ID to delete or null if not provided
 */
export function parseArguments(argv) {
  const args = argv.slice(2); // Remove 'node' and script name
  return args.length > 0 ? args[0] : null;
}

/**
 * Validate if the provided string is a valid HTTP/HTTPS URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate if the provided string is a valid UUID
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
export function validateUuid(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Determine if the input is a URL or a comment ID
 * @param {string} input - Input string to analyze
 * @returns {{type: 'url'|'comment_id', value: string}} - Type and value of input
 */
export function parseInputType(input) {
  if (validateUrl(input)) {
    return { type: 'url', value: input };
  } else if (validateUuid(input)) {
    return { type: 'comment_id', value: input };
  } else {
    throw new Error(`Invalid input: "${input}" is neither a valid URL nor a valid UUID`);
  }
}

/**
 * Soft-delete a comment by setting content and author_name to "[deleted]"
 * @param {string} commentId - UUID of the comment to delete
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{success: boolean, message: string, deletedComment?: object}>}
 */
export async function deleteComment(commentId, supabase) {
  try {
    // First, find the comment by ID
    const { data: commentData, error: findError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        return {
          success: false,
          message: `Comment with ID "${commentId}" not found in database.`
        };
      }
      return {
        success: false,
        message: `Error finding comment: ${findError.message}`
      };
    }

    if (!commentData) {
      return {
        success: false,
        message: `Comment with ID "${commentId}" not found in database.`
      };
    }

    // Check if comment is already deleted
    if (commentData.is_deleted) {
      return {
        success: false,
        message: `Comment with ID "${commentId}" is already deleted.`
      };
    }

    // Soft-delete the comment by updating content and author_name
    const { data: updatedData, error: updateError } = await supabase
      .from('comments')
      .update({
        content: '[deleted]',
        author_name: '[deleted]',
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select();

    if (updateError) {
      return {
        success: false,
        message: `Error deleting comment: ${updateError.message}`
      };
    }

    return {
      success: true,
      message: `Comment "${commentId}" successfully soft-deleted from database.`,
      deletedComment: commentData
    };
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Delete a link from the database by URL
 * @param {string} url - URL of the link to delete
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{success: boolean, message: string, deletedLink?: object, deletedCounts?: object}>}
 */
export async function deleteLink(url, supabase) {
  try {
    // First, find the link by URL
    const { data: linkData, error: findError } = await supabase
      .from('links')
      .select('*')
      .eq('url', url)
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        return {
          success: false,
          message: `Link with URL "${url}" not found in database.`
        };
      }
      return {
        success: false,
        message: `Error finding link: ${findError.message}`
      };
    }

    if (!linkData) {
      return {
        success: false,
        message: `Link with URL "${url}" not found in database.`
      };
    }

    const linkId = linkData.id;
    const deletedCounts = { votes: 0, categories: 0, comments: 0, commentVotes: 0 };

    // Soft-delete related comments first
    const { data: commentsToDelete, error: findCommentsError } = await supabase
      .from('comments')
      .select('id')
      .eq('link_id', linkId)
      .eq('is_deleted', false);

    if (findCommentsError) {
      return {
        success: false,
        message: `Error finding comments: ${findCommentsError.message}`
      };
    }

    if (commentsToDelete && commentsToDelete.length > 0) {
      const { data: deletedComments, error: commentsError } = await supabase
        .from('comments')
        .update({
          content: '[deleted]',
          author_name: '[deleted]',
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('link_id', linkId)
        .eq('is_deleted', false)
        .select();

      if (commentsError) {
        return {
          success: false,
          message: `Error deleting comments: ${commentsError.message}`
        };
      }

      deletedCounts.comments = deletedComments?.length || 0;

      // Delete comment votes for the soft-deleted comments
      const commentIds = commentsToDelete.map(c => c.id);
      const { data: deletedCommentVotes, error: commentVotesError } = await supabase
        .from('comment_votes')
        .delete()
        .in('comment_id', commentIds)
        .select();

      if (commentVotesError) {
        return {
          success: false,
          message: `Error deleting comment votes: ${commentVotesError.message}`
        };
      }

      deletedCounts.commentVotes = deletedCommentVotes?.length || 0;
    }

    // Delete related votes
    const { data: deletedVotes, error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('link_id', linkId)
      .select();

    if (votesError) {
      return {
        success: false,
        message: `Error deleting votes: ${votesError.message}`
      };
    }

    deletedCounts.votes = deletedVotes?.length || 0;

    // Delete related link_categories mappings
    const { data: deletedCategories, error: categoriesError } = await supabase
      .from('link_categories')
      .delete()
      .eq('link_id', linkId)
      .select();

    if (categoriesError) {
      return {
        success: false,
        message: `Error deleting link categories: ${categoriesError.message}`
      };
    }

    deletedCounts.categories = deletedCategories?.length || 0;

    // Finally, delete the link itself
    const { data: deletedData, error: deleteError } = await supabase
      .from('links')
      .delete()
      .eq('id', linkId)
      .select();

    if (deleteError) {
      return {
        success: false,
        message: `Error deleting link: ${deleteError.message}`
      };
    }

    return {
      success: true,
      message: `Link "${linkData.title}" (${url}) successfully deleted from database.`,
      deletedLink: linkData,
      deletedCounts
    };
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Main CLI function
 */
async function main() {
  const input = parseArguments(process.argv);

  if (!input) {
    console.error('❌ Error: Please provide a URL or comment ID as an argument.');
    console.error('Usage: node scripts/delete-link.js <URL|COMMENT_ID>');
    console.error('Examples:');
    console.error('  node scripts/delete-link.js https://example.com');
    console.error('  node scripts/delete-link.js 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  let inputType;
  try {
    inputType = parseInputType(input);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  // Check for required environment variables
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing required environment variables.');
    console.error('Please ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let result;

  if (inputType.type === 'url') {
    console.log(`🔍 Searching for link: ${inputType.value}`);
    result = await deleteLink(inputType.value, supabase);
  } else if (inputType.type === 'comment_id') {
    console.log(`🔍 Searching for comment: ${inputType.value}`);
    result = await deleteComment(inputType.value, supabase);
  }

  if (result.success) {
    console.log(`✅ ${result.message}`);
    
    if (result.deletedLink) {
      console.log(`📋 Deleted link details:`);
      console.log(`   Title: ${result.deletedLink.title}`);
      console.log(`   ID: ${result.deletedLink.id}`);
      console.log(`   Created: ${new Date(result.deletedLink.created_at).toLocaleString()}`);
      
      if (result.deletedCounts) {
        console.log(`🗑️  Related data deleted:`);
        console.log(`   Votes: ${result.deletedCounts.votes}`);
        console.log(`   Category mappings: ${result.deletedCounts.categories}`);
        console.log(`   Comments: ${result.deletedCounts.comments}`);
        console.log(`   Comment votes: ${result.deletedCounts.commentVotes}`);
      }
    }
    
    if (result.deletedComment) {
      console.log(`📋 Deleted comment details:`);
      console.log(`   ID: ${result.deletedComment.id}`);
      console.log(`   Original content: ${result.deletedComment.content.substring(0, 100)}${result.deletedComment.content.length > 100 ? '...' : ''}`);
      console.log(`   Original author: ${result.deletedComment.author_name || 'Anonymous'}`);
      console.log(`   Created: ${new Date(result.deletedComment.created_at).toLocaleString()}`);
    }
  } else {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}