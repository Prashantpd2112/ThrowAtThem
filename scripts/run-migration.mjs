#!/usr/bin/env node

/**
 * Migration: Add `target_profile_id` column to the `throws` table.
 *
 * Usage:
 *   1. Get your Supabase service_role key from Dashboard → Settings → API
 *   2. Run:  SUPABASE_SERVICE_KEY=your_key_here node scripts/run-migration.mjs
 *
 * If you don't have the service_role key, paste this SQL into
 * your Supabase Dashboard SQL Editor instead:
 *
 *   ALTER TABLE public.throws
 *   ADD COLUMN IF NOT EXISTS target_profile_id UUID
 *   REFERENCES public.individual_profiles(id) ON DELETE SET NULL;
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL not set in .env.local");
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY env var not set.");
  console.error("   Get it from: Supabase Dashboard → Settings → API → service_role key");
  console.error("   Then run: SUPABASE_SERVICE_KEY=your_key node scripts/run-migration.mjs");
  process.exit(1);
}

// Extract project ref from URL (e.g. https://xxxxx.supabase.co → xxxxx)
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
console.log(`🔧 Project ref: ${projectRef}`);

const SQL = `
  ALTER TABLE public.throws
  ADD COLUMN IF NOT EXISTS target_profile_id UUID
  REFERENCES public.individual_profiles(id) ON DELETE SET NULL;
`;

async function run() {
  try {
    // Use the Supabase Management API SQL endpoint
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: SQL }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      // If management API fails (personal access token required), fall back
      // to direct Supabase REST with service_role key
      if (res.status === 401 || res.status === 403) {
        console.log("⚠️  Management API requires a personal access token.");
        console.log("   Trying direct REST API with service_role key...");

        // Direct REST approach using pg managed endpoint
        const pgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SERVICE_KEY,
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "Prefer": "params=single-object",
            },
            body: JSON.stringify({ query: SQL }),
          }
        );

        console.log(`ℹ️  REST API response: ${pgRes.status}`);
        const pgText = await pgRes.text();
        console.log(pgText);

        if (!pgRes.ok) {
          console.log("\n❌ Could not run migration via REST API.");
          console.log("\n👉 Please run this SQL in your Supabase Dashboard SQL Editor:");
          console.log("\n   " + SQL.trim() + "\n");
          process.exit(1);
        }
      } else {
        throw new Error(`API error ${res.status}: ${text}`);
      }
    }

    console.log("✅ Migration completed successfully!");
    console.log(`   Added target_profile_id column to throws table`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.log("\n👉 Please run this SQL in your Supabase Dashboard SQL Editor:");
    console.log("\n   " + SQL.trim() + "\n");
    process.exit(1);
  }
}

run();
