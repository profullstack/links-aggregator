#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Parse command line arguments to extract URL
 * @param {string[]} argv - Command line arguments
 * @returns {string|null} - URL to delete or null if not provided
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
    const deletedCounts = { votes: 0, categories: 0 };

    // Delete related votes first
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
  const url = parseArguments(process.argv);

  if (!url) {
    console.error('❌ Error: Please provide a URL as an argument.');
    console.error('Usage: node scripts/delete-link.js <URL>');
    console.error('Example: node scripts/delete-link.js https://example.com');
    process.exit(1);
  }

  if (!validateUrl(url)) {
    console.error(`❌ Error: "${url}" is not a valid HTTP/HTTPS URL.`);
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

  console.log(`🔍 Searching for link: ${url}`);

  const result = await deleteLink(url, supabase);

  if (result.success) {
    console.log(`✅ ${result.message}`);
    if (result.deletedLink) {
      console.log(`📋 Deleted link details:`);
      console.log(`   Title: ${result.deletedLink.title}`);
      console.log(`   ID: ${result.deletedLink.id}`);
      console.log(`   Created: ${new Date(result.deletedLink.created_at).toLocaleString()}`);
    }
    if (result.deletedCounts) {
      console.log(`🗑️  Related data deleted:`);
      console.log(`   Votes: ${result.deletedCounts.votes}`);
      console.log(`   Category mappings: ${result.deletedCounts.categories}`);
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