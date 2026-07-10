-- ── ThrowOnThen Database Schema Migration ──
-- Run this SQL in your Supabase project SQL editor
-- or via: psql -d your-connection-string -f migrations/001_create_tables.sql

-- 1. Guests table (for persisting guest users in Supabase)
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

-- 3. User presence table for online tracking
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  country TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_throws_created_at ON throws(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_throws_target_country ON throws(target_country);
CREATE INDEX IF NOT EXISTS idx_throws_object ON throws(object);
CREATE INDEX IF NOT EXISTS idx_throws_guest_id ON throws(guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_id ON guests(id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_guest_id ON user_presence(guest_id);

-- 5. Enable Row Level Security (optional, safe for public app)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE throws ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- 6. Public access policies (allow anyone to read/write)
CREATE POLICY "Allow public read guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert guests" ON guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update guests" ON guests FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read throws" ON throws FOR SELECT USING (true);
CREATE POLICY "Allow public insert throws" ON throws FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read user_presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_presence" ON user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_presence" ON user_presence FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete user_presence" ON user_presence FOR DELETE USING (true);

-- 7. Enable Realtime for the throws table
-- Execute the following in the Supabase Dashboard -> Database -> Replication:
-- Ensure the "throws" table has Realtime enabled.
-- Alternatively, run:
ALTER PUBLICATION supabase_realtime ADD TABLE throws;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;