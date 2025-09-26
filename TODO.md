# CLI Link Deletion Script

## Overview
Create a Node.js CLI script that takes a URL as an argument and deletes the corresponding link from the Supabase database.

## Requirements
- Accept URL as command line argument
- Connect to Supabase database using service role key for admin access
- Find link by URL in the `links` table
- Delete the link and all associated data (votes, categories)
- Provide clear success/error messages
- Handle edge cases (URL not found, database errors)

## Tasks
1. **Setup and Planning**
   - [x] Analyze database schema and existing code
   - [x] Create TODO.md file
   - [ ] Write comprehensive test cases

2. **Implementation**
   - [ ] Create CLI script with argument parsing
   - [ ] Implement database connection using service role
   - [ ] Implement link deletion logic
   - [ ] Add proper error handling and logging

3. **Integration**
   - [ ] Add script to package.json
   - [ ] Test script functionality
   - [ ] Document usage

## Database Schema Notes
- Links are stored in `public.links` table with `url` field (UNIQUE)
- Related data in `public.votes` and `public.link_categories` will cascade delete
- Need service role key for admin access to bypass RLS policies

## Usage
```bash
node scripts/delete-link.js <URL>
# or via package.json script:
pnpm run delete-link <URL>