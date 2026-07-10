-- ──────────────────────────────────────────────────────────────
-- ThrowOnThen Migration 002: Individual Profiles + Profile Throws
-- ──────────────────────────────────────────────────────────────
-- Creates the individual_profiles table for storing globally visible
-- user profiles, and adds target_profile_id to the throws table so
-- throws can be associated with individual profiles.
--
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.
-- Paste this entire file into your Supabase Dashboard SQL Editor.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. INDIVIDUAL PROFILES TABLE
-- ══════════════════════════════════════════════════════════════
-- Stores global user profiles visible to everyone.
-- Created via the "Create Card" button in the UI.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.individual_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  profile_image TEXT DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  social_link TEXT DEFAULT '',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. ADD target_profile_id TO throws TABLE
-- ══════════════════════════════════════════════════════════════
-- Allows throws to target individual profiles.
-- Foreign key ensures referential integrity.
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'throws' AND column_name = 'target_profile_id'
  ) THEN
    ALTER TABLE public.throws
    ADD COLUMN target_profile_id UUID
    REFERENCES public.individual_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_throws_target_profile_id
  ON public.throws(target_profile_id);

CREATE INDEX IF NOT EXISTS idx_individual_profiles_guest_id
  ON public.individual_profiles(guest_id);

CREATE INDEX IF NOT EXISTS idx_individual_profiles_country
  ON public.individual_profiles(country);

-- ══════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.individual_profiles ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 5. POLICIES
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'individual_profiles' AND policyname = 'Allow public read individual_profiles'
  ) THEN
    CREATE POLICY "Allow public read individual_profiles"
      ON public.individual_profiles FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'individual_profiles' AND policyname = 'Allow public insert individual_profiles'
  ) THEN
    CREATE POLICY "Allow public insert individual_profiles"
      ON public.individual_profiles FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 6. REALTIME PUBLICATION
-- ══════════════════════════════════════════════════════════════
-- Enables realtime subscriptions for live feed, leaderboard,
-- and profile card updates.
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'individual_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.individual_profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'throws'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.throws;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 7. VERIFICATION QUERY
-- ══════════════════════════════════════════════════════════════
-- Run this separately to confirm everything was created:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('guests', 'throws', 'user_presence', 'individual_profiles')
--   ORDER BY table_name;
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'throws'
--   AND column_name = 'target_profile_id';
-- ══════════════════════════════════════════════════════════════
