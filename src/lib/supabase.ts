import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

if (isConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Export a function-based API that handles missing config gracefully
function getClient(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }
  return supabaseInstance;
}

// ── Database Types ──
export type DbThrow = {
  id: string;
  guest_id: string;
  nickname: string;
  thrower_country: string;
  target_country: string;
  object: string;
  reason: string;
  created_at: string;
};

// ── Throw Operations ──
// Throws are inserted directly from the useThrows hook (client-side)

// ── Country Statistics ──
export const getCountryStats = async (countryCode: string) => {
  if (!isConfigured) {
    return {
      country_code: countryCode,
      total_throws: 0,
      most_used_object: { object: "", count: 0 },
      recent_reasons: [],
      daily_count: 0,
      weekly_count: 0,
      activity_level: "low" as const,
    };
  }

  const client = getClient();
  const { data: throws, error } = await client
    .from("throws")
    .select("*")
    .eq("target_country", countryCode)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const data = (throws || []) as DbThrow[];
  const totalThrows = data.length;

  // Most used object
  const objectCounts: Record<string, number> = {};
  data.forEach((t) => {
    objectCounts[t.object] = (objectCounts[t.object] || 0) + 1;
  });
  const mostUsedObject = Object.entries(objectCounts).sort((a, b) => b[1] - a[1])[0];

  // Recent reasons (last 10)
  const recentReasons = data.slice(0, 10).map((t) => ({
    reason: t.reason || "",
    nickname: t.nickname,
    object: t.object,
  }));

  // Daily and weekly counts
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  const dailyCount = data.filter((t) => now - new Date(t.created_at).getTime() < dayMs).length;
  const weeklyCount = data.filter((t) => now - new Date(t.created_at).getTime() < weekMs).length;

  return {
    country_code: countryCode,
    total_throws: totalThrows,
    most_used_object: mostUsedObject
      ? { object: mostUsedObject[0], count: mostUsedObject[1] }
      : { object: "", count: 0 },
    recent_reasons: recentReasons,
    daily_count: dailyCount,
    weekly_count: weeklyCount,
    activity_level: (weeklyCount > 50 ? "very_high" : weeklyCount > 20 ? "high" : weeklyCount > 5 ? "medium" : "low") as "low" | "medium" | "high" | "very_high",
  };
};

// ── Leaderboard Queries ──
export const getLeaderboard = async (timePeriod: "daily" | "weekly" | "all_time" = "all_time") => {
  if (!isConfigured) {
    return { countryLeaderboard: [], objectLeaderboard: [] };
  }

  const client = getClient();
  let query = client.from("throws").select("target_country, object");

  if (timePeriod === "daily") {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", dayAgo);
  } else if (timePeriod === "weekly") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", weekAgo);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as { target_country: string; object: string }[];

  // Count by country
  const countryCounts: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};

  rows.forEach((t) => {
    countryCounts[t.target_country] = (countryCounts[t.target_country] || 0) + 1;
    objectCounts[t.object] = (objectCounts[t.object] || 0) + 1;
  });

  const countryLeaderboard = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const objectLeaderboard = Object.entries(objectCounts)
    .map(([object, count]) => ({ object, count }))
    .sort((a, b) => b.count - a.count);

  return { countryLeaderboard, objectLeaderboard };
};

// Export for direct use (will throw if not configured at runtime, only called from client)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!isConfigured) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
      );
    }
    const client = getClient();
    return (client as any)[prop];
  },
});

export { getClient as getSupabaseClient };
