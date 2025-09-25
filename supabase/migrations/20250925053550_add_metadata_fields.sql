-- Add metadata fields to links table
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS domain TEXT;

-- Add index for domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_links_domain ON public.links(domain);

-- Add constraint to prevent duplicate URLs (ignore duplicates)
ALTER TABLE public.links ADD CONSTRAINT unique_url UNIQUE (url);

-- Update the existing unique constraint to handle conflicts gracefully
-- This will be handled in the application logic with ON CONFLICT DO NOTHING