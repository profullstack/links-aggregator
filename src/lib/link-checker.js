import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Default options for link checking
 */
const DEFAULT_OPTIONS = {
  timeout: 10000, // 10 seconds
  batchSize: 10,
  maxConsecutiveFailures: 3,
  torProxy: 'socks5://127.0.0.1:9050' // Default Tor proxy
};

/**
 * Check if a URL is an onion address
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's an onion URL
 */
function isOnionUrl(url) {
  return url.includes('.onion');
}

/**
 * Create fetch options with appropriate proxy for onion URLs
 * @param {string} url - The URL being checked
 * @param {Object} options - Configuration options
 * @returns {Object} - Fetch options
 */
function createFetchOptions(url, options = {}) {
  const fetchOptions = {
    method: 'HEAD', // Use HEAD to minimize data transfer
    timeout: options.timeout || DEFAULT_OPTIONS.timeout,
    headers: {
      'User-Agent': 'LinkChecker/1.0'
    }
  };

  // Use Tor proxy for onion URLs
  if (isOnionUrl(url) && options.torProxy !== false) {
    const proxyUrl = options.torProxy || DEFAULT_OPTIONS.torProxy;
    fetchOptions.agent = new SocksProxyAgent(proxyUrl);
  }

  return fetchOptions;
}

/**
 * Check a single link's availability
 * @param {string} url - The URL to check
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Check result
 */
export async function checkLink(url, options = {}) {
  const checkedAt = new Date();
  console.log(`🔗 [Link Checker] Checking URL: ${url}`);
  
  try {
    const fetchOptions = createFetchOptions(url, options);
    
    // Log if using Tor proxy for onion URLs
    if (isOnionUrl(url)) {
      console.log(`🧅 [Link Checker] Using Tor proxy for onion URL: ${url}`);
    }
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), fetchOptions.timeout);
    });
    
    // Race between fetch and timeout
    const response = await Promise.race([
      fetch(url, fetchOptions),
      timeoutPromise
    ]);

    if (response.ok) {
      console.log(`✅ [Link Checker] URL is LIVE: ${url} (${response.status})`);
      return {
        url,
        status: 'live',
        statusCode: response.status,
        errorMessage: null,
        checkedAt
      };
    } else {
      console.log(`❌ [Link Checker] URL is DEAD: ${url} (${response.status} ${response.statusText})`);
      return {
        url,
        status: 'dead',
        statusCode: response.status,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        checkedAt
      };
    }
  } catch (error) {
    console.log(`💥 [Link Checker] URL check FAILED: ${url} - ${error.message}`);
    return {
      url,
      status: 'dead',
      statusCode: null,
      errorMessage: error.message,
      checkedAt
    };
  }
}

/**
 * LinkChecker class for managing batch link checking operations
 */
export class LinkChecker {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get links that need checking (haven't been checked in 24 hours)
   * @returns {Promise<Array>} - Array of links needing check
   */
  async getLinksNeedingCheck() {
    const { data, error } = await this.supabase
      .from('links_needing_check')
      .select('*')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(this.options.batchSize);

    if (error) {
      throw new Error(`Failed to get links needing check: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update link status in the database
   * @param {string} linkId - The link ID
   * @param {Object} checkResult - The check result
   * @returns {Promise<Object>} - Update result
   */
  async updateLinkStatus(linkId, checkResult) {
    try {
      console.log(`📝 [Link Checker] Updating database for link ${linkId}: ${checkResult.status}`);
      
      // Get current consecutive failures count
      const { data: currentLink, error: fetchError } = await this.supabase
        .from('links')
        .select('consecutive_failures')
        .eq('id', linkId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current link data: ${fetchError.message}`);
      }

      const currentFailures = currentLink?.consecutive_failures || 0;
      let newConsecutiveFailures = 0;

      if (checkResult.status === 'dead') {
        newConsecutiveFailures = currentFailures + 1;
        console.log(`⚠️ [Link Checker] Link ${linkId} failed ${newConsecutiveFailures} times consecutively`);
      }

      // If we've reached max consecutive failures, delete the link
      if (newConsecutiveFailures >= this.options.maxConsecutiveFailures) {
        console.log(`🗑️ [Link Checker] Deleting link ${linkId} after ${newConsecutiveFailures} consecutive failures`);
        
        const { error: deleteError } = await this.supabase
          .from('links')
          .delete()
          .eq('id', linkId);

        if (deleteError) {
          throw new Error(`Failed to delete link: ${deleteError.message}`);
        }

        console.log(`✅ [Link Checker] Successfully deleted link ${linkId}`);
        return { deleted: true };
      }

      // Prepare update data
      const updateData = {
        status: checkResult.status,
        status_code: checkResult.statusCode,
        error_message: checkResult.errorMessage,
        last_checked_at: checkResult.checkedAt.toISOString(),
        consecutive_failures: newConsecutiveFailures
      };

      // If the link is live, update the last_verified_at timestamp
      if (checkResult.status === 'live') {
        updateData.last_verified_at = checkResult.checkedAt.toISOString();
        console.log(`🎉 [Link Checker] Link ${linkId} verified as live, updating last_verified_at`);
      }

      // Update link status
      const { error: updateError } = await this.supabase
        .from('links')
        .update(updateData)
        .eq('id', linkId);

      if (updateError) {
        throw new Error(`Failed to update link status: ${updateError.message}`);
      }

      console.log(`✅ [Link Checker] Successfully updated link ${linkId} status in database`);
      return { deleted: false };
    } catch (error) {
      console.error(`❌ [Link Checker] Failed to update link ${linkId}:`, error.message);
      throw new Error(`Failed to update link status: ${error.message}`);
    }
  }

  /**
   * Check a batch of links
   * @returns {Promise<Object>} - Batch check results
   */
  async checkBatch() {
    const results = {
      checked: 0,
      live: 0,
      dead: 0,
      deleted: 0,
      errors: 0
    };

    try {
      const links = await this.getLinksNeedingCheck();
      
      if (links.length === 0) {
        console.log(`📊 [Link Checker] No links need checking at this time`);
        return results;
      }

      console.log(`🚀 [Link Checker] Starting batch check of ${links.length} links`);

      // Process links concurrently but with limited concurrency
      const promises = links.map(async (link) => {
        try {
          const checkResult = await checkLink(link.url, this.options);
          const updateResult = await this.updateLinkStatus(link.id, checkResult);
          
          results.checked++;
          
          if (updateResult.deleted) {
            results.deleted++;
          } else if (checkResult.status === 'live') {
            results.live++;
          } else {
            results.dead++;
          }
        } catch (error) {
          console.error(`💥 [Link Checker] Error checking link ${link.url}:`, error);
          results.errors++;
        }
      });

      await Promise.all(promises);
      
      console.log(`📈 [Link Checker] Batch completed: ${results.checked} checked, ${results.live} live, ${results.dead} dead, ${results.deleted} deleted, ${results.errors} errors`);
      return results;
    } catch (error) {
      console.error('💥 [Link Checker] Error in checkBatch:', error);
      throw error;
    }
  }

  /**
   * Run continuous link checking
   * @returns {Promise<Object>} - Overall results
   */
  async checkAll() {
    const overallResults = {
      checked: 0,
      live: 0,
      dead: 0,
      deleted: 0,
      errors: 0,
      batches: 0
    };

    let hasMoreLinks = true;
    
    while (hasMoreLinks) {
      const batchResults = await this.checkBatch();
      
      // Accumulate results
      overallResults.checked += batchResults.checked;
      overallResults.live += batchResults.live;
      overallResults.dead += batchResults.dead;
      overallResults.deleted += batchResults.deleted;
      overallResults.errors += batchResults.errors;
      overallResults.batches++;

      // If we processed fewer links than batch size, we're done
      hasMoreLinks = batchResults.checked === this.options.batchSize;
      
      // Add a small delay between batches to avoid overwhelming the system
      if (hasMoreLinks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return overallResults;
  }
}

/**
 * Convenience function to check all links needing check
 * @param {Object} supabase - Supabase client
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Check results
 */
export async function checkAllLinks(supabase, options = {}) {
  const checker = new LinkChecker(supabase, options);
  return await checker.checkAll();
}