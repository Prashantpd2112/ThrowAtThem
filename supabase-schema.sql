-- ──────────────────────────────────────────────────────────────
-- WorldThrow — Idempotent Database Schema
-- Safe to run on any existing production database.
-- Runs DO $$ blocks with existence checks everywhere.
-- Produces zero PostgreSQL errors no matter how many times executed.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guests') THEN
    CREATE TABLE public.guests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nickname TEXT NOT NULL,
      country TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created table: guests';
  ELSE
    RAISE NOTICE 'Table already exists: guests';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'throws') THEN
    CREATE TABLE public.throws (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
      nickname TEXT NOT NULL,
      thrower_country TEXT NOT NULL DEFAULT '',
      target_country TEXT NOT NULL,
      object TEXT NOT NULL,
      reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created table: throws';
  ELSE
    RAISE NOTICE 'Table already exists: throws';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_presence') THEN
    CREATE TABLE public.user_presence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      guest_id UUID UNIQUE NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      country TEXT NOT NULL,
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created table: user_presence';
  ELSE
    RAISE NOTICE 'Table already exists: user_presence';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 1b. INDIVIDUAL PROFILES TABLE
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'individual_profiles') THEN
    CREATE TABLE public.individual_profiles (
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
    RAISE NOTICE 'Created table: individual_profiles';
  ELSE
    RAISE NOTICE 'Table already exists: individual_profiles';
  END IF;
END $$;

-- Add target_profile_id to throws table (nullable, for throwing at a person)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'throws' AND column_name = 'target_profile_id'
  ) THEN
    ALTER TABLE public.throws ADD COLUMN target_profile_id UUID REFERENCES public.individual_profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added column target_profile_id to throws';
  ELSE
    RAISE NOTICE 'Column target_profile_id already exists on throws';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_throws_created_at') THEN
    CREATE INDEX idx_throws_created_at ON public.throws(created_at DESC);
    RAISE NOTICE 'Created index: idx_throws_created_at';
  ELSE
    RAISE NOTICE 'Index already exists: idx_throws_created_at';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_throws_target_country') THEN
    CREATE INDEX idx_throws_target_country ON public.throws(target_country);
    RAISE NOTICE 'Created index: idx_throws_target_country';
  ELSE
    RAISE NOTICE 'Index already exists: idx_throws_target_country';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_throws_object') THEN
    CREATE INDEX idx_throws_object ON public.throws(object);
    RAISE NOTICE 'Created index: idx_throws_object';
  ELSE
    RAISE NOTICE 'Index already exists: idx_throws_object';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_throws_guest_id') THEN
    CREATE INDEX idx_throws_guest_id ON public.throws(guest_id);
    RAISE NOTICE 'Created index: idx_throws_guest_id';
  ELSE
    RAISE NOTICE 'Index already exists: idx_throws_guest_id';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_guests_id') THEN
    CREATE INDEX idx_guests_id ON public.guests(id);
    RAISE NOTICE 'Created index: idx_guests_id';
  ELSE
    RAISE NOTICE 'Index already exists: idx_guests_id';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_presence_last_seen') THEN
    CREATE INDEX idx_user_presence_last_seen ON public.user_presence(last_seen);
    RAISE NOTICE 'Created index: idx_user_presence_last_seen';
  ELSE
    RAISE NOTICE 'Index already exists: idx_user_presence_last_seen';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_presence_guest_id') THEN
    CREATE INDEX idx_user_presence_guest_id ON public.user_presence(guest_id);
    RAISE NOTICE 'Created index: idx_user_presence_guest_id';
  ELSE
    RAISE NOTICE 'Index already exists: idx_user_presence_guest_id';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guests' AND rowsecurity = true) THEN
    ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on: guests';
  ELSE
    RAISE NOTICE 'RLS already enabled on: guests';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'throws' AND rowsecurity = true) THEN
    ALTER TABLE public.throws ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on: throws';
  ELSE
    RAISE NOTICE 'RLS already enabled on: throws';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_presence' AND rowsecurity = true) THEN
    ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on: user_presence';
  ELSE
    RAISE NOTICE 'RLS already enabled on: user_presence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'individual_profiles' AND rowsecurity = true) THEN
    ALTER TABLE public.individual_profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on: individual_profiles';
  ELSE
    RAISE NOTICE 'RLS already enabled on: individual_profiles';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. POLICIES
-- ══════════════════════════════════════════════════════════════

-- Guests policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'guests' AND policyname = 'Allow public read guests') THEN
    CREATE POLICY "Allow public read guests" ON public.guests FOR SELECT USING (true);
    RAISE NOTICE 'Created policy: Allow public read guests';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read guests';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'guests' AND policyname = 'Allow public insert guests') THEN
    CREATE POLICY "Allow public insert guests" ON public.guests FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public insert guests';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public insert guests';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'guests' AND policyname = 'Allow public update guests') THEN
    CREATE POLICY "Allow public update guests" ON public.guests FOR UPDATE USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public update guests';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public update guests';
  END IF;
END $$;

-- Throws policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'throws' AND policyname = 'Allow public read throws') THEN
    CREATE POLICY "Allow public read throws" ON public.throws FOR SELECT USING (true);
    RAISE NOTICE 'Created policy: Allow public read throws';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read throws';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'throws' AND policyname = 'Allow public insert throws') THEN
    CREATE POLICY "Allow public insert throws" ON public.throws FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public insert throws';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public insert throws';
  END IF;
END $$;

-- Individual profiles policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'individual_profiles' AND policyname = 'Allow public read individual_profiles') THEN
    CREATE POLICY "Allow public read individual_profiles" ON public.individual_profiles FOR SELECT USING (true);
    RAISE NOTICE 'Created policy: Allow public read individual_profiles';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read individual_profiles';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'individual_profiles' AND policyname = 'Allow public insert individual_profiles') THEN
    CREATE POLICY "Allow public insert individual_profiles" ON public.individual_profiles FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public insert individual_profiles';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public insert individual_profiles';
  END IF;
END $$;

-- NOTE: No UPDATE or DELETE policies for individual_profiles yet.
-- Since the app uses anonymous guest auth with no per-user identity,
-- allowing updates would let anyone modify anyone's profile.
-- When user identity/authentication is added, create per-owner policies:
--   FOR UPDATE USING (guest_id = auth.uid()) WITH CHECK (guest_id = auth.uid())
--   FOR DELETE USING (guest_id = auth.uid())

-- User presence policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'Allow public read user_presence') THEN
    CREATE POLICY "Allow public read user_presence" ON public.user_presence FOR SELECT USING (true);
    RAISE NOTICE 'Created policy: Allow public read user_presence';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read user_presence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'Allow public insert user_presence') THEN
    CREATE POLICY "Allow public insert user_presence" ON public.user_presence FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public insert user_presence';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public insert user_presence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'Allow public update user_presence') THEN
    CREATE POLICY "Allow public update user_presence" ON public.user_presence FOR UPDATE USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policy: Allow public update user_presence';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public update user_presence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_presence' AND policyname = 'Allow public delete user_presence') THEN
    CREATE POLICY "Allow public delete user_presence" ON public.user_presence FOR DELETE USING (true);
    RAISE NOTICE 'Created policy: Allow public delete user_presence';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public delete user_presence';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 5. REALTIME PUBLICATION
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'throws') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.throws;
    RAISE NOTICE 'Added throws to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'throws is already in supabase_realtime publication';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_presence') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
    RAISE NOTICE 'Added user_presence to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'user_presence is already in supabase_realtime publication';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'individual_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.individual_profiles;
    RAISE NOTICE 'Added individual_profiles to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'individual_profiles is already in supabase_realtime publication';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 6. VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════

-- Verify tables exist
SELECT table_name AS "Existing Tables"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('guests', 'throws', 'user_presence')
ORDER BY table_name;

-- Verify indexes exist
SELECT indexname AS "Existing Indexes"
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_throws_created_at',
    'idx_throws_target_country',
    'idx_throws_object',
    'idx_throws_guest_id',
    'idx_guests_id',
    'idx_user_presence_last_seen',
    'idx_user_presence_guest_id'
  )
ORDER BY indexname;

-- Verify RLS is enabled
SELECT
  tablename AS "Table",
  rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('guests', 'throws', 'user_presence')
ORDER BY tablename;

-- Verify policies exist
SELECT
  tablename AS "Table",
  policyname AS "Policy Name",
  permissive AS "Permissive",
  cmd AS "Command"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('guests', 'throws', 'user_presence')
ORDER BY tablename, policyname;

-- Verify realtime publication membership
SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  pubname AS "Publication"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('throws', 'user_presence')
ORDER BY tablename;
