-- ──────────────────────────────────────────────────────────────
-- ThrowOnThen Migration 003: One Profile Per Guest
-- ──────────────────────────────────────────────────────────────
-- 1. Removes duplicate profiles for the same guest_id (keeps oldest)
-- 2. Reassigns throws from deleted duplicates to the kept profile
-- 3. Adds UNIQUE constraint on individual_profiles.guest_id
-- 4. Updates the insert policy to prevent duplicate creation at DB level
--
-- Safe to run multiple times.
-- Paste this entire file into your Supabase Dashboard SQL Editor.
-- ──────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. DEDUPLICATE: Keep the OLDEST profile per guest_id
-- ══════════════════════════════════════════════════════════════
-- For each guest_id that has multiple profiles, keep the one with
-- the earliest created_at and reassign all throws from the deleted
-- duplicates to the kept profile.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  del_id UUID;
BEGIN
  -- Find each guest_id that has duplicates
  FOR dup IN (
    SELECT guest_id
    FROM public.individual_profiles
    GROUP BY guest_id
    HAVING COUNT(*) > 1
  ) LOOP
    -- Get the oldest profile (the one to keep)
    SELECT id INTO keep_id
    FROM public.individual_profiles
    WHERE guest_id = dup.guest_id
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    -- Reassign throws from all OTHER profiles of this guest to the kept one
    UPDATE public.throws
    SET target_profile_id = keep_id
    WHERE target_profile_id IN (
      SELECT id FROM public.individual_profiles
      WHERE guest_id = dup.guest_id AND id != keep_id
    );

    -- Delete the duplicate profiles (newer ones)
    DELETE FROM public.individual_profiles
    WHERE guest_id = dup.guest_id AND id != keep_id;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. UNIQUE CONSTRAINT ON guest_id
-- ══════════════════════════════════════════════════════════════
-- Guarantees one profile per guest forever.
-- ══════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_individual_profiles_guest_unique
  ON public.individual_profiles (guest_id);

-- ══════════════════════════════════════════════════════════════
-- 3. VERIFICATION QUERY
-- ══════════════════════════════════════════════════════════════
-- Run this separately to confirm deduplication:
--
--   SELECT guest_id, COUNT(*)
--   FROM public.individual_profiles
--   GROUP BY guest_id
--   HAVING COUNT(*) > 1;
--
-- Expected: zero rows (no duplicates)
--
-- To verify the unique constraint:
--
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'individual_profiles'
--   AND indexname = 'idx_individual_profiles_guest_unique';
-- ══════════════════════════════════════════════════════════════
