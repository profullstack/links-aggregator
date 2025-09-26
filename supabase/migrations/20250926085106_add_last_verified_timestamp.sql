-- Add last_verified timestamp to track when a link was last successfully verified as live
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of last verified timestamps
CREATE INDEX IF NOT EXISTS idx_links_last_verified_at ON public.links(last_verified_at);

-- Update the links_needing_check view to include last_verified_at information
DROP VIEW IF EXISTS public.links_needing_check;
CREATE VIEW public.links_needing_check AS
SELECT *
FROM public.links
WHERE last_checked_at IS NULL 
   OR last_checked_at < (NOW() - INTERVAL '24 hours');

-- Grant necessary permissions
GRANT SELECT ON public.links_needing_check TO authenticated, anon;