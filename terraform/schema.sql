-- CultureDB & Timeline PostgreSQL Schema with Row Level Security (RLS)

-- 1. User Artist Ratings Table (1-5★)
CREATE TABLE IF NOT EXISTS public.user_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    artist_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, artist_id)
);

-- 2. User Artwork Ratings Table (1-5★)
CREATE TABLE IF NOT EXISTS public.user_artwork_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, work_title)
);

-- 3. User Bookmarked Favorites Table
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    artist_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, artist_id)
);

-- 4. User Art Learning Progress & Mastery Table
CREATE TABLE IF NOT EXISTS public.user_learning_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    era_id TEXT NOT NULL,
    studied_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, work_title)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_artwork_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can strictly SELECT, INSERT, UPDATE, and DELETE their own records
CREATE POLICY "Users manage own ratings" ON public.user_ratings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own artwork ratings" ON public.user_artwork_ratings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own favorites" ON public.user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own learning progress" ON public.user_learning_progress
    FOR ALL USING (auth.uid() = user_id);
