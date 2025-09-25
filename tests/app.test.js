import { describe, it, expect } from 'vitest';

describe('App', () => {
	it('should have a basic test structure', () => {
		expect(true).toBe(true);
	});

	it('should be able to import from lib', async () => {
		// This will test that our module structure is working
		const module = await import('../src/lib/supabase.js');
		expect(module).toBeDefined();
	});
});