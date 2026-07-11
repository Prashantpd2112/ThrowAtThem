-- ──────────────────────────────────────────────────────────────
-- ThrowAtThem Migration 005: RLS Policy for profile_object_counts
-- ──────────────────────────────────────────────────────────────
-- The profile_object_counts table has RLS enabled (default in modern
-- Supabase projects) but NO SELECT policy was created during the
-- Phase 1 migration. This causes the anon key to receive 0 rows
-- from any SELECT query, even though the table contains data.
--
-- This follows the exact same pattern as all other public tables:
--   - guests    → "Allow public read guests"
--   - throws    → "Allow public read throws"
--   - individual_profiles → "Allow public read individual_profiles"
--   - user_presence → "Allow public read user_presence"
--
-- Safe to run multiple times — uses IF NOT EXISTS.
-- Paste this entire file into your Supabase Dashboard SQL Editor.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. ENABLE RLS (safe if already enabled)
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'profile_object_counts' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.profile_object_counts ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on: profile_object_counts';
  ELSE
    RAISE NOTICE 'RLS already enabled on: profile_object_counts';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. ALLOW PUBLIC SELECT
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_object_counts'
      AND policyname = 'Allow public read profile_object_counts'
  ) THEN
    CREATE POLICY "Allow public read profile_object_counts"
      ON public.profile_object_counts
      FOR SELECT
      USING (true);
    RAISE NOTICE 'Created policy: Allow public read profile_object_counts';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read profile_object_counts';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. VERIFICATION
-- ══════════════════════════════════════════════════════════════
-- Run these separately to confirm:
--
--   SELECT * FROM public.profile_object_counts LIMIT 5;
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE tablename = 'profile_object_counts';
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename = 'profile_object_counts';
-- ══════════════════════════════════════════════════════════════
