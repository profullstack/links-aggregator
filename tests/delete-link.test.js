import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deleteLink,
  deleteComment,
  validateUrl,
  validateUuid,
  parseArguments,
  parseInputType
} from '../scripts/delete-link.js';

// Mock Supabase client
let mockSupabase;

function createMockSupabase() {
  const mockSelect = vi.fn();
  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockSingle = vi.fn();
  const mockSelectAfterDelete = vi.fn();
  const mockSelectAfterUpdate = vi.fn();
  const mockSelectAfterIn = vi.fn();

  return {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
          select: mockSelectAfterIn
        }),
        in: mockIn.mockReturnValue({
          select: mockSelectAfterIn
        })
      }),
      delete: mockDelete.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelectAfterDelete
        }),
        in: mockIn.mockReturnValue({
          select: mockSelectAfterIn
        })
      }),
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelectAfterUpdate
        })
      })
    })),
    // Expose mocks for easier access in tests
    _mocks: {
      select: mockSelect,
      delete: mockDelete,
      update: mockUpdate,
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      selectAfterDelete: mockSelectAfterDelete,
      selectAfterUpdate: mockSelectAfterUpdate,
      selectAfterIn: mockSelectAfterIn
    }
  };
}

// Mock process.exit and console methods
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CLI Delete Link Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
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
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: mockLinkData,
        error: null
      });

      // Mock successful votes deletion
      mockSupabase._mocks.selectAfterDelete.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock successful categories deletion
      mockSupabase._mocks.selectAfterDelete.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock successful link deletion
      mockSupabase._mocks.selectAfterDelete.mockResolvedValueOnce({
        data: [mockLinkData],
        error: null
      });

      // Mock comments lookup (no comments)
      mockSupabase._mocks.selectAfterIn.mockResolvedValueOnce({
        data: [],
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

  describe('validateUuid', () => {
    it('should return true for valid UUID v4', () => {
      expect(validateUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should return true for valid UUID v1', () => {
      expect(validateUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUID format', () => {
      expect(validateUuid('not-a-uuid')).toBe(false);
    });

    it('should return false for UUID without hyphens', () => {
      expect(validateUuid('123e4567e89b12d3a456426614174000')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateUuid('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(validateUuid(null)).toBe(false);
      expect(validateUuid(undefined)).toBe(false);
    });
  });

  describe('parseInputType', () => {
    it('should identify valid URL as url type', () => {
      const result = parseInputType('https://example.com');
      expect(result).toEqual({ type: 'url', value: 'https://example.com' });
    });

    it('should identify valid UUID as comment_id type', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = parseInputType(uuid);
      expect(result).toEqual({ type: 'comment_id', value: uuid });
    });

    it('should throw error for invalid input', () => {
      expect(() => parseInputType('invalid-input')).toThrow('Invalid input');
    });

    it('should throw error for empty input', () => {
      expect(() => parseInputType('')).toThrow('Invalid input');
    });
  });

  describe('deleteComment', () => {
    it('should successfully soft-delete existing comment', async () => {
      const testCommentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCommentData = {
        id: testCommentId,
        content: 'This is a test comment',
        author_name: 'TestUser',
        is_deleted: false,
        created_at: '2023-01-01T00:00:00Z'
      };

      // Mock successful comment lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCommentData,
        error: null
      });

      // Mock successful soft-deletion
      mockSupabase.from().update().eq().select.mockResolvedValueOnce({
        data: [{ ...mockCommentData, content: '[deleted]', author_name: '[deleted]', is_deleted: true }],
        error: null
      });

      const result = await deleteComment(testCommentId, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully soft-deleted');
      expect(result.deletedComment).toEqual(mockCommentData);
    });

    it('should handle comment not found', async () => {
      const testCommentId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock comment not found
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await deleteComment(testCommentId, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle already deleted comment', async () => {
      const testCommentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCommentData = {
        id: testCommentId,
        content: '[deleted]',
        author_name: '[deleted]',
        is_deleted: true
      };

      // Mock comment already deleted
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCommentData,
        error: null
      });

      const result = await deleteComment(testCommentId, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already deleted');
    });

    it('should handle database update error', async () => {
      const testCommentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCommentData = {
        id: testCommentId,
        content: 'Test comment',
        author_name: 'TestUser',
        is_deleted: false
      };

      // Mock successful comment lookup
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCommentData,
        error: null
      });

      // Mock update error
      mockSupabase.from().update().eq().select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      });

      const result = await deleteComment(testCommentId, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error deleting comment');
    });

    it('should handle unexpected errors gracefully', async () => {
      const testCommentId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock unexpected error
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(
        new Error('Unexpected error')
      );

      const result = await deleteComment(testCommentId, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unexpected error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      
      mockSupabase._mocks.single.mockResolvedValueOnce({
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

    it('should handle malformed UUIDs', () => {
      expect(validateUuid('123e4567-e89b-12d3-a456')).toBe(false); // Too short
      expect(validateUuid('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false); // Too long
      expect(validateUuid('ggge4567-e89b-12d3-a456-426614174000')).toBe(false); // Invalid characters
    });
  });
});