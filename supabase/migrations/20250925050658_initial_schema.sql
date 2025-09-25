-- Create links table for storing aggregated links
CREATE TABLE IF NOT EXISTS public.links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    vote_count INTEGER DEFAULT 0
);

-- Create categories table for organizing links
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create link_categories junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.link_categories (
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (link_id, category_id)
);

-- Create votes table for link voting system
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(link_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_is_public ON public.links(is_public);
CREATE INDEX IF NOT EXISTS idx_votes_link_id ON public.votes(link_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_links_updated_at 
    BEFORE UPDATE ON public.links 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update vote count
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

-- Create trigger to automatically update vote count
CREATE TRIGGER update_link_vote_count
    AFTER INSERT OR UPDATE OR DELETE ON public.votes
    FOR EACH ROW
    EXECUTE FUNCTION update_vote_count();

-- Enable Row Level Security (RLS)
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for links
CREATE POLICY "Public links are viewable by everyone" ON public.links
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own links" ON public.links
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links" ON public.links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON public.links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON public.links
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

-- Create RLS policies for link_categories
CREATE POLICY "Link categories are viewable by everyone" ON public.link_categories
    FOR SELECT USING (true);

CREATE POLICY "Users can manage categories for their own links" ON public.link_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE id = link_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for votes
CREATE POLICY "Votes are viewable by everyone" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some default categories
INSERT INTO public.categories (name, description, color) VALUES
    ('Technology', 'Tech news, tutorials, and resources', '#3B82F6'),
    ('Programming', 'Code tutorials, documentation, and tools', '#10B981'),
    ('Design', 'UI/UX, graphics, and design resources', '#F59E0B'),
    ('News', 'Current events and news articles', '#EF4444'),
    ('Education', 'Learning resources and educational content', '#8B5CF6'),
    ('Entertainment', 'Fun content, games, and media', '#EC4899')
ON CONFLICT (name) DO NOTHING;