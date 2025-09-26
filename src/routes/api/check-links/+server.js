import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';
import { checkAllLinks, checkLink, LinkChecker } from '$lib/link-checker.js';
import { getGlobalScheduler } from '$lib/scheduler.js';

/**
 * POST /api/check-links
 * Manually trigger link checking
 * 
 * Body options:
 * - { "action": "all" } - Check all links needing check
 * - { "action": "single", "url": "https://example.com" } - Check a single URL
 * - { "action": "status" } - Get scheduler status
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, url } = body;

    switch (action) {
      case 'all': {
        console.log('Manual link check triggered for all links');
        const results = await checkAllLinks(supabase);
        
        return json({
          success: true,
          message: 'Link check completed',
          results
        });
      }

      case 'single': {
        if (!url) {
          return json({
            success: false,
            error: 'URL is required for single link check'
          }, { status: 400 });
        }

        console.log(`Manual link check triggered for: ${url}`);
        const result = await checkLink(url);
        
        return json({
          success: true,
          message: 'Single link check completed',
          result
        });
      }

      case 'status': {
        const scheduler = getGlobalScheduler(supabase);
        const jobStatuses = scheduler.getAllJobStatuses();
        
        return json({
          success: true,
          message: 'Scheduler status retrieved',
          scheduler: {
            running: scheduler.running,
            jobs: jobStatuses
          }
        });
      }

      default: {
        return json({
          success: false,
          error: 'Invalid action. Use "all", "single", or "status"'
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Link check API error:', error);
    
    return json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/check-links
 * Get link checking status and statistics
 */
export async function GET() {
  try {
    // Get scheduler status
    const scheduler = getGlobalScheduler(supabase);
    const jobStatuses = scheduler.getAllJobStatuses();

    // Get some basic stats from the database
    const { data: totalLinks, error: totalError } = await supabase
      .from('links')
      .select('id', { count: 'exact' });

    const { data: liveLinks, error: liveError } = await supabase
      .from('links')
      .select('id', { count: 'exact' })
      .eq('status', 'live');

    const { data: deadLinks, error: deadError } = await supabase
      .from('links')
      .select('id', { count: 'exact' })
      .eq('status', 'dead');

    const { data: unknownLinks, error: unknownError } = await supabase
      .from('links')
      .select('id', { count: 'exact' })
      .eq('status', 'unknown');

    // Get links needing check
    const { data: needingCheck, error: needingError } = await supabase
      .from('links_needing_check')
      .select('id', { count: 'exact' });

    if (totalError || liveError || deadError || unknownError || needingError) {
      throw new Error('Failed to fetch link statistics');
    }

    return json({
      success: true,
      scheduler: {
        running: scheduler.running,
        jobs: jobStatuses
      },
      statistics: {
        total: totalLinks?.length || 0,
        live: liveLinks?.length || 0,
        dead: deadLinks?.length || 0,
        unknown: unknownLinks?.length || 0,
        needingCheck: needingCheck?.length || 0
      }
    });
  } catch (error) {
    console.error('Link check status API error:', error);
    
    return json({
      success: false,
      error: 'Failed to get link check status',
      details: error.message
    }, { status: 500 });
  }
}