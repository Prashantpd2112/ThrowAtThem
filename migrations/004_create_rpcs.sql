-- ──────────────────────────────────────────────────────────────
-- ThrowAtThem Migration 004: RPCs for scalable counting
-- ──────────────────────────────────────────────────────────────
-- Creates the database functions (RPCs) that replace client-side
-- counting of throws with server-side atomic counters.
--
-- Key requirements met:
--   • Single PostgreSQL transaction (plpgsql function body is atomic)
--   • app_stats.total_throws incremented for EVERY throw
--   • Atomic UPDATE SET column = column + 1 (never SELECT +1 in JS)
--   • profile_object_counts upserted via INSERT ... ON CONFLICT DO UPDATE
--   • Custom emojis supported (p_object is passed as-is, never interpreted)
--   • No SELECT count(*) inside the RPC
--   • No JavaScript counting
--   • Automatic rollback on any failure (implicit plpgsql savepoint)
--
-- Safe to run multiple times — uses CREATE OR REPLACE and IF NOT EXISTS.
-- Paste this entire file into your Supabase Dashboard SQL Editor.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 0. ENSURE app_stats TABLE EXISTS
-- ══════════════════════════════════════════════════════════════
-- Global application-level counters. A single row stores aggregate
-- stats that would otherwise require COUNT(*) over the throws table.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_stats (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
  total_throws BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure the singleton row exists (idempotent)
INSERT INTO public.app_stats (id, total_throws)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 0b. ENSURE individual_profiles.total_throws HAS A DEFAULT
-- ══════════════════════════════════════════════════════════════
-- Required so that `UPDATE SET total_throws = total_throws + 1`
-- never encounters NULL even if a row was inserted without a default.
-- (ALTER COLUMN SET DEFAULT does not retroactively change existing rows.)
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Set default only if column exists and doesn't already have one
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'individual_profiles'
      AND column_name = 'total_throws'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE public.individual_profiles
    ALTER COLUMN total_throws SET DEFAULT 0;
  END IF;

  -- Ensure any existing NULL values are set to 0
  UPDATE public.individual_profiles
  SET total_throws = 0
  WHERE total_throws IS NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 0c. ENSURE profile_object_counts.count HAS A DEFAULT
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_object_counts'
      AND column_name = 'count'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE public.profile_object_counts
    ALTER COLUMN count SET DEFAULT 0;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 1. submit_throw RPC (REVISED)
-- ══════════════════════════════════════════════════════════════
-- Runs as a single PostgreSQL transaction thanks to plpgsql's
-- automatic function-body atomicity.
--
-- If ANY statement inside fails, ALL changes are rolled back.
-- No partial updates are possible.
--
-- Atomic increment pattern used throughout:
--   UPDATE table SET column = column + 1
-- This is safe under concurrent access because PostgreSQL's
-- UPDATE acquires a row-level lock and the increment is a
-- single atomic operation on the server.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_throw(
  p_guest_id UUID,
  p_nickname TEXT,
  p_thrower_country TEXT,
  p_target_country TEXT,
  p_object TEXT,
  p_reason TEXT DEFAULT '',
  p_target_profile_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_throw_id UUID;
BEGIN
  -- ── A) Insert the throw record ──
  INSERT INTO public.throws (
    guest_id,
    nickname,
    thrower_country,
    target_country,
    object,
    reason,
    target_profile_id
  ) VALUES (
    p_guest_id,
    p_nickname,
    p_thrower_country,
    p_target_country,
    p_object,
    COALESCE(p_reason, ''),
    p_target_profile_id
  )
  RETURNING id INTO v_throw_id;

  -- ── B) Increment app_stats.total_throws for EVERY throw ──
  --    (both profile-targeted and world throws)
  UPDATE public.app_stats
  SET total_throws = total_throws + 1,
      updated_at = NOW()
  WHERE id = 1;

  -- ── C) If targeting a profile, increment per-profile counters ──
  IF p_target_profile_id IS NOT NULL THEN
    -- Increment the profile's total_throws counter (atomic)
    UPDATE public.individual_profiles
    SET total_throws = total_throws + 1
    WHERE id = p_target_profile_id;

    -- ── D) Upsert the per-object counter for this profile ──
    INSERT INTO public.profile_object_counts
    (profile_id, object, count)
    VALUES (p_target_profile_id, p_object, 1)
    ON CONFLICT (profile_id, object)
    DO UPDATE
    SET count = profile_object_counts.count + 1;
  END IF;

  -- ── Return the new throw ID ──
  RETURN jsonb_build_object('id', v_throw_id);
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 2. get_total_throw_count RPC (REVISED)
-- ══════════════════════════════════════════════════════════════
-- Now reads from app_stats.total_throws, which counts ALL throws
-- (both profile-targeted and world throws).
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_total_throw_count()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT total_throws
  FROM public.app_stats
  WHERE id = 1;
$$;

-- ══════════════════════════════════════════════════════════════
-- 3. get_profile_throw_counts RPC (unchanged)
-- ══════════════════════════════════════════════════════════════
-- Returns profile_id → total_throws mapping for all profiles.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_profile_throw_counts()
RETURNS TABLE(profile_id UUID, total_throws BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id AS profile_id, COALESCE(total_throws, 0)::BIGINT AS total_throws
  FROM public.individual_profiles;
$$;

-- ══════════════════════════════════════════════════════════════
-- 4. VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════
-- Run these separately to confirm everything was created:
--
--   SELECT proname FROM pg_proc
--   WHERE proname IN ('submit_throw', 'get_total_throw_count', 'get_profile_throw_counts')
--   ORDER BY proname;
--
-- Test app_stats row exists:
--   SELECT * FROM app_stats;
--
-- Test submit_throw (replace UUIDs with actual values):
--   SELECT submit_throw(
--     '00000000-0000-0000-0000-000000000001'::UUID,
--     'TestUser',
--     'US',
--     'IN',
--     'tomato',
--     'Test throw',
--     '00000000-0000-0000-0000-000000000002'::UUID
--   );
--
-- Test get_total_throw_count:
--   SELECT get_total_throw_count();
--
-- Test get_profile_throw_counts:
--   SELECT * FROM get_profile_throw_counts();
-- ══════════════════════════════════════════════════════════════
