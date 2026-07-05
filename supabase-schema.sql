-- ── WorldThrow Database Schema ──
-- Run this SQL in your Supabase project SQL editor

-- 1. Guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Throws table
CREATE TABLE IF NOT EXISTS throws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  thrower_country TEXT NOT NULL DEFAULT '',
  target_country TEXT NOT NULL,
  object TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_throws_created_at ON throws(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_throws_target_country ON throws(target_country);
CREATE INDEX IF NOT EXISTS idx_throws_object ON throws(object);
CREATE INDEX IF NOT EXISTS idx_throws_guest_id ON throws(guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_id ON guests(id);

-- 4. Enable Row Level Security (optional, safe for public app)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE throws ENABLE ROW LEVEL SECURITY;

-- 5. Public access policies (allow anyone to read/write)
CREATE POLICY "Allow public read guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert guests" ON guests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read throws" ON throws FOR SELECT USING (true);
CREATE POLICY "Allow public insert throws" ON throws FOR INSERT WITH CHECK (true);
