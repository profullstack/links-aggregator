import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteLink, validateUrl, parseArguments } from '../scripts/delete-link.js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn()
      }))
    }))
  }))
};

// Mock process.exit and console methods
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CLI Delete Link Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseArguments', () => {
    it('should return URL when provided as argument', () => {
      const mockArgv = ['node', 'delete-link.js', 'https://example.com'];
      const result = parseArguments(mockArgv);
      expect(result).toBe('https://example.com');
    });

    it('should return null when no URL argument provided', () => {
      const mockArgv = ['node', 'delete-link.js'];
      const result = parseArguments(mockArgv);
      expect(result).toBeNull();
    });

    it('should return first URL argument when multiple provided', () => {
      const mockArgv = ['node', 'delete-link.js', 'https://example.com', 'https://another.com'];
      const result = parseArguments(mockArgv);
      expect(result).toBe('https://example.com');
    });
  });

  describe('validateUrl', () => {
    it('should return true for valid HTTP URL', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('should return true for valid HTTPS URL', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('should return true for valid URL with path', () => {
      expect(validateUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should return true for valid URL with query parameters', () => {
      expect(validateUrl('https://example.com?param=value')).toBe(true);
    });

    it('should return false for invalid URL format', () => {
      expect(validateUrl('not-a-url')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateUrl('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(validateUrl(null)).toBe(false);
      expect(validateUrl(undefined)).toBe(false);
    });

    it('should return false for URL without protocol', () => {
      expect(validateUrl('example.com')).toBe(false);
    });
  });

  describe('deleteLink', () => {
    it('should successfully delete existing link', async () => {
      const testUrl = 'https://example.com';
      const mockLinkData = {
        id: 'test-uuid',
        title: 'Test Link',
        url: testUrl
      };

      // Mock successful link lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockLinkData,
        error: null
      });

      // Mock successful deletion
      mockSupabase.from().delete().eq().select.mockResolvedValueOnce({
        data: [mockLinkData],
        error: null
      });

      const result = await deleteLink(testUrl, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully deleted');
      expect(result.deletedLink).toEqual(mockLinkData);
    });

    it('should handle link not found', async () => {
      const testUrl = 'https://nonexistent.com';

      // Mock link not found
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // PostgREST "not found" error
      });

      const result = await deleteLink(testUrl, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle database lookup error', async () => {
      const testUrl = 'https://example.com';

      // Mock database error during lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await deleteLink(testUrl, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error finding link');
    });

    it('should handle database deletion error', async () => {
      const testUrl = 'https://example.com';
      const mockLinkData = {
        id: 'test-uuid',
        title: 'Test Link',
        url: testUrl
      };

      // Mock successful link lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockLinkData,
        error: null
      });

      // Mock deletion error
      mockSupabase.from().delete().eq().select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Deletion failed' }
      });

      const result = await deleteLink(testUrl, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error deleting link');
    });

    it('should handle unexpected errors gracefully', async () => {
      const testUrl = 'https://example.com';

      // Mock unexpected error
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(
        new Error('Unexpected error')
      );

      const result = await deleteLink(testUrl, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unexpected error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await deleteLink(longUrl, mockSupabase);
      expect(result.success).toBe(false);
    });

    it('should handle URLs with special characters', async () => {
      const specialUrl = 'https://example.com/path?query=value&special=äöü#fragment';
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await deleteLink(specialUrl, mockSupabase);
      expect(result.success).toBe(false);
    });

    it('should validate URL before attempting deletion', () => {
      expect(validateUrl('https://example.com/path?query=test#fragment')).toBe(true);
      expect(validateUrl('ftp://example.com')).toBe(false); // Only HTTP/HTTPS should be valid
    });
  });
});