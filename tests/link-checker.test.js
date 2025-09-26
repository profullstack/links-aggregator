import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkLink, checkAllLinks, LinkChecker } from '../src/lib/link-checker.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Link Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkLink', () => {
    it('should return live status for successful HTTP response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await checkLink('https://example.com');

      expect(result).toEqual({
        url: 'https://example.com',
        status: 'live',
        statusCode: 200,
        errorMessage: null,
        checkedAt: expect.any(Date)
      });
    });

    it('should return dead status for 404 response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await checkLink('https://example.com/notfound');

      expect(result).toEqual({
        url: 'https://example.com/notfound',
        status: 'dead',
        statusCode: 404,
        errorMessage: 'HTTP 404: Not Found',
        checkedAt: expect.any(Date)
      });
    });

    it('should return dead status for network error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkLink('https://invalid-domain.com');

      expect(result.status).toBe('dead');
      expect(result.statusCode).toBe(null);
      expect(result.errorMessage).toContain('Network error');
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should handle timeout errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await checkLink('https://slow-site.com');

      expect(result.status).toBe('dead');
      expect(result.statusCode).toBe(null);
      expect(result.errorMessage).toContain('Request timeout');
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should use custom timeout', async () => {
      fetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await checkLink('https://example.com', { timeout: 50 });

      expect(result.status).toBe('dead');
      expect(result.errorMessage).toContain('timeout');
    });

    it('should handle onion URLs with Tor proxy', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await checkLink('http://example.onion');

      expect(result.status).toBe('live');
      expect(result.statusCode).toBe(200);
    });
  });

  describe('LinkChecker class', () => {
    let linkChecker;
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn((table) => {
          const mockQuery = {
            select: vi.fn(() => mockQuery),
            eq: vi.fn(() => mockQuery),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            order: vi.fn(() => mockQuery),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            update: vi.fn(() => mockQuery),
            delete: vi.fn(() => mockQuery)
          };
          
          // Make eq() return a promise for update/delete operations
          mockQuery.eq = vi.fn(() => Promise.resolve({ data: null, error: null }));
          
          return mockQuery;
        })
      };

      linkChecker = new LinkChecker(mockSupabase);
    });

    it('should initialize with default options', () => {
      expect(linkChecker.options.batchSize).toBe(10);
      expect(linkChecker.options.timeout).toBe(10000);
      expect(linkChecker.options.maxConsecutiveFailures).toBe(3);
    });

    it('should get links needing check', async () => {
      const mockLinks = [
        { id: '1', url: 'https://example.com', last_checked_at: null },
        { id: '2', url: 'https://test.com', last_checked_at: '2023-01-01T00:00:00Z' }
      ];

      mockSupabase.from().select().order().limit.mockResolvedValueOnce({
        data: mockLinks,
        error: null
      });

      const result = await linkChecker.getLinksNeedingCheck();

      expect(result).toEqual(mockLinks);
      expect(mockSupabase.from).toHaveBeenCalledWith('links_needing_check');
    });

    it('should update link status in database', async () => {
      const checkResult = {
        url: 'https://example.com',
        status: 'live',
        statusCode: 200,
        errorMessage: null,
        checkedAt: new Date()
      };

      mockSupabase.from().update().eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await linkChecker.updateLinkStatus('link-id', checkResult);

      expect(mockSupabase.from).toHaveBeenCalledWith('links');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'live',
        status_code: 200,
        error_message: null,
        last_checked_at: checkResult.checkedAt.toISOString(),
        consecutive_failures: 0
      });
    });

    it('should increment consecutive failures for dead links', async () => {
      const checkResult = {
        url: 'https://example.com',
        status: 'dead',
        statusCode: 404,
        errorMessage: 'Not found',
        checkedAt: new Date()
      };

      // Mock getting current link data
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { consecutive_failures: 1 },
        error: null
      });

      mockSupabase.from().update().eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await linkChecker.updateLinkStatus('link-id', checkResult);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'dead',
        status_code: 404,
        error_message: 'Not found',
        last_checked_at: checkResult.checkedAt.toISOString(),
        consecutive_failures: 2
      });
    });

    it('should delete links after max consecutive failures', async () => {
      const checkResult = {
        url: 'https://example.com',
        status: 'dead',
        statusCode: 404,
        errorMessage: 'Not found',
        checkedAt: new Date()
      };

      // Mock getting current link data with 2 failures (will become 3)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { consecutive_failures: 2 },
        error: null
      });

      mockSupabase.from().delete().eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await linkChecker.updateLinkStatus('link-id', checkResult);

      expect(result.deleted).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('should process links in batches', async () => {
      const mockLinks = [
        { id: '1', url: 'https://example1.com' },
        { id: '2', url: 'https://example2.com' },
        { id: '3', url: 'https://example3.com' }
      ];

      linkChecker.getLinksNeedingCheck = vi.fn().mockResolvedValue(mockLinks);
      linkChecker.updateLinkStatus = vi.fn().mockResolvedValue({ deleted: false });

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await linkChecker.checkBatch();

      expect(result.checked).toBe(3);
      expect(result.live).toBe(3);
      expect(result.dead).toBe(0);
      expect(result.deleted).toBe(0);
    });

    it('should handle errors gracefully during batch processing', async () => {
      const mockLinks = [
        { id: '1', url: 'https://example.com' }
      ];

      linkChecker.getLinksNeedingCheck = vi.fn().mockResolvedValue(mockLinks);
      linkChecker.updateLinkStatus = vi.fn().mockRejectedValue(new Error('Database error'));

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await linkChecker.checkBatch();

      expect(result.errors).toBe(1);
      expect(result.checked).toBe(0);
    });
  });

  describe('checkAllLinks', () => {
    it('should process all links needing check', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: '1', url: 'https://example.com' }
                ],
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })),
          delete: vi.fn(() => ({
            eq: vi.fn()
          }))
        }))
      };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await checkAllLinks(mockSupabase);

      expect(result.checked).toBe(1);
      expect(result.live).toBe(1);
    });
  });
});