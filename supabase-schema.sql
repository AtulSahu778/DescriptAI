-- DescriptAI Supabase Database Schema - FINAL CLEAN VERSION
-- This will drop and recreate everything cleanly

-- First, drop all policies (no error if they don't exist)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own voices" ON public.brand_voices;
  DROP POLICY IF EXISTS "Users can insert own voices" ON public.brand_voices;
  DROP POLICY IF EXISTS "Users can update own voices" ON public.brand_voices;
  DROP POLICY IF EXISTS "Users can delete own voices" ON public.brand_voices;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own descriptions" ON public.descriptions;
  DROP POLICY IF EXISTS "Users can insert own descriptions" ON public.descriptions;
  DROP POLICY IF EXISTS "Users can delete own descriptions" ON public.descriptions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own bulk jobs" ON public.bulk_jobs;
  DROP POLICY IF EXISTS "Users can insert own bulk jobs" ON public.bulk_jobs;
  DROP POLICY IF EXISTS "Users can update own bulk jobs" ON public.bulk_jobs;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own usage logs" ON public.usage_logs;
  DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.usage_logs;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.usage_logs CASCADE;
DROP TABLE IF EXISTS public.bulk_jobs CASCADE;
DROP TABLE IF EXISTS public.descriptions CASCADE;
DROP TABLE IF EXISTS public.brand_voices CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 1. User Profiles (ID is the user's auth.users id)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER DEFAULT 50 NOT NULL,
  plan_type TEXT DEFAULT 'free' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Brand Voices
CREATE TABLE public.brand_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tone_adjectives TEXT[] DEFAULT '{}',
  writing_samples TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Descriptions
CREATE TABLE public.descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  features TEXT,
  audience TEXT,
  tone TEXT DEFAULT 'professional',
  seo_description TEXT,
  emotional_description TEXT,
  short_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bulk Jobs
CREATE TABLE public.bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'processing' NOT NULL,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Usage Logs
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  product_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for brand_voices
CREATE POLICY "Users can view own voices" ON public.brand_voices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voices" ON public.brand_voices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voices" ON public.brand_voices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voices" ON public.brand_voices FOR DELETE USING (auth.uid() = user_id);

-- Policies for descriptions
CREATE POLICY "Users can view own descriptions" ON public.descriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own descriptions" ON public.descriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own descriptions" ON public.descriptions FOR DELETE USING (auth.uid() = user_id);

-- Policies for bulk_jobs
CREATE POLICY "Users can view own bulk jobs" ON public.bulk_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bulk jobs" ON public.bulk_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bulk jobs" ON public.bulk_jobs FOR UPDATE USING (auth.uid() = user_id);

-- Policies for usage_logs
CREATE POLICY "Users can view own usage logs" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage logs" ON public.usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
