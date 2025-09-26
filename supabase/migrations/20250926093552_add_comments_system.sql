-- Create comments table for threaded comments on links
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT,
    author_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    vote_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false
);

-- Create comment_votes table for voting on comments
CREATE TABLE IF NOT EXISTS public.comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    voter_ip TEXT NOT NULL,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, voter_ip)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_link_id ON public.comments(link_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_voter_ip ON public.comment_votes(voter_ip);

-- Create trigger to automatically update updated_at for comments
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON public.comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update comment vote count
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments 
        SET vote_count = vote_count + NEW.vote_type 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.comments 
        SET vote_count = vote_count + (NEW.vote_type - OLD.vote_type) 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments 
        SET vote_count = vote_count - OLD.vote_type 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update comment vote count
CREATE TRIGGER update_comment_vote_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_vote_count();

-- Enable Row Level Security (RLS)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments (public read, anonymous write)
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Anyone can insert comments" ON public.comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Comments can be soft deleted by setting is_deleted" ON public.comments
    FOR UPDATE USING (true);

-- Create RLS policies for comment votes (anonymous voting by IP)
CREATE POLICY "Comment votes are viewable by everyone" ON public.comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Anyone can vote on comments" ON public.comment_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update their own comment votes" ON public.comment_votes
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete their own comment votes" ON public.comment_votes
    FOR DELETE USING (true);