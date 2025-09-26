-- Add link status tracking fields to the links table
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unknown' CHECK (status IN ('live', 'dead', 'unknown'));
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS status_code INTEGER;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index for efficient querying of links that need checking
CREATE INDEX IF NOT EXISTS idx_links_last_checked_at ON public.links(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_links_status ON public.links(status);
CREATE INDEX IF NOT EXISTS idx_links_consecutive_failures ON public.links(consecutive_failures);

-- Create a view for links that need checking (haven't been checked in 24 hours)
CREATE OR REPLACE VIEW public.links_needing_check AS
SELECT *
FROM public.links
WHERE last_checked_at IS NULL 
   OR last_checked_at < (NOW() - INTERVAL '24 hours');

-- Create a function to clean up dead links after 3 consecutive failures
CREATE OR REPLACE FUNCTION public.cleanup_dead_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete links that have failed 3 times in a row
    WITH deleted_links AS (
        DELETE FROM public.links 
        WHERE consecutive_failures >= 3 
        AND status = 'dead'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_links;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON public.links_needing_check TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_dead_links() TO authenticated;