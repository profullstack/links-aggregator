-- Fix anonymous voting by allowing NULL user_id and adding session tracking
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;

-- Make user_id nullable for anonymous voting
ALTER TABLE public.votes ALTER COLUMN user_id DROP NOT NULL;

-- Add session_id for anonymous vote tracking
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create new unique constraint that allows anonymous voting
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_link_id_user_id_key;
ALTER TABLE public.votes ADD CONSTRAINT unique_vote_per_session 
    UNIQUE (link_id, session_id);

-- Update RLS policies for anonymous voting
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes;

-- New RLS policies for anonymous voting
CREATE POLICY "Anyone can insert votes" ON public.votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update votes by session" ON public.votes
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete votes by session" ON public.votes
    FOR DELETE USING (true);

-- Update vote count trigger to handle NULL user_id
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.links 
        SET vote_count = vote_count + NEW.vote_type 
        WHERE id = NEW.link_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.links 
        SET vote_count = vote_count + (NEW.vote_type - OLD.vote_type) 
        WHERE id = NEW.link_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.links 
        SET vote_count = vote_count - OLD.vote_type 
        WHERE id = OLD.link_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';