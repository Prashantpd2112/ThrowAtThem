import { createClient, SupabaseClient, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// Auto-incrementing counter to generate unique channel names
let channelCounter = 0;
function nextChannelName(prefix: string): string {
  channelCounter += 1;
  return `${prefix}-${channelCounter}-${Date.now()}`;
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

export type DbGuest = {
  id: string;
  nickname: string;
  country: string;
  created_at: string;
};

export type DbUserPresence = {
  id: string;
  guest_id: string;
  nickname: string;
  country: string;
  last_seen: string;
  created_at: string;
};

// ── Safe Client Access ──
function getClient(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }
  return supabaseInstance;
}

// ── Guest Operations ──
export const upsertGuest = async (guest: { id: string; nickname: string; country: string }) => {
  const client = getClient();
  const { data: existing } = await client
    .from("guests")
    .select("id")
    .eq("id", guest.id)
    .single();

  if (existing) {
    const { error } = await client
      .from("guests")
      .update({ nickname: guest.nickname, country: guest.country })
      .eq("id", guest.id);
    if (error) throw error;
  } else {
    const { error } = await client
      .from("guests")
      .insert(guest);
    if (error) throw error;
  }
};

export const getGuestById = async (id: string): Promise<DbGuest | null> => {
  const client = getClient();
  const { data, error } = await client
    .from("guests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DbGuest;
};

// ── Throw Operations ──
export const insertThrow = async (throwData: {
  guest_id: string;
  nickname: string;
  thrower_country: string;
  target_country: string;
  object: string;
  reason: string;
}): Promise<boolean> => {
  const client = getClient();
  const { error } = await client.from("throws").insert({
    guest_id: throwData.guest_id,
    nickname: throwData.nickname,
    thrower_country: throwData.thrower_country,
    target_country: throwData.target_country,
    object: throwData.object,
    reason: throwData.reason || "",
  });
  if (error) throw error;
  return true;
};

export const fetchRecentThrows = async (limit = 50): Promise<DbThrow[]> => {
  const client = getClient();
  const { data, error } = await client
    .from("throws")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as DbThrow[];
};

export const fetchHeatData = async (): Promise<Record<string, number>> => {
  const client = getClient();
  const { data, error } = await client
    .from("throws")
    .select("target_country");
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data as DbThrow[]).forEach((t) => {
    counts[t.target_country] = (counts[t.target_country] || 0) + 1;
  });
  return counts;
};

// ── User Presence Operations ──
export const upsertPresence = async (presence: {
  guest_id: string;
  nickname: string;
  country: string;
}) => {
  const client = getClient();
  const { error } = await client.from("user_presence").upsert(
    {
      guest_id: presence.guest_id,
      nickname: presence.nickname,
      country: presence.country,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "guest_id" }
  );
  if (error) throw error;
};

export const removePresence = async (guestId: string) => {
  const client = getClient();
  const { error } = await client
    .from("user_presence")
    .delete()
    .eq("guest_id", guestId);
  if (error) throw error;
};

export const fetchOnlineUsers = async (): Promise<DbUserPresence[]> => {
  const client = getClient();
  const staleThreshold = new Date(Date.now() - 70 * 1000).toISOString(); // 70 seconds
  const { data, error } = await client
    .from("user_presence")
    .select("*")
    .gt("last_seen", staleThreshold);
  if (error) throw error;
  return (data || []) as DbUserPresence[];
};

// ── Country Statistics ──
export const getCountryStats = async (countryCode: string) => {
  const client = getClient();
  const { data: throws, error } = await client
    .from("throws")
    .select("*")
    .eq("target_country", countryCode)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const data = (throws || []) as DbThrow[];
  const totalThrows = data.length;

  const objectCounts: Record<string, number> = {};
  data.forEach((t) => {
    objectCounts[t.object] = (objectCounts[t.object] || 0) + 1;
  });
  const mostUsedObject = Object.entries(objectCounts).sort((a, b) => b[1] - a[1])[0];

  const recentReasons = data.slice(0, 10).map((t) => ({
    reason: t.reason || "",
    nickname: t.nickname,
    object: t.object,
  }));

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
  const client = getClient();
  let query = client.from("throws").select("target_country, object") as any;

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

// ── Realtime Subscriptions ──
// Each call creates a UNIQUE channel name so multiple subscriptions never collide.

export function createThrowsSubscription(
  callback: (throwData: DbThrow) => void,
  onError?: (error: Error) => void
): () => void {
  const client = getClient();
  const channelName = nextChannelName("throws");
  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "throws",
      },
      (payload: RealtimePostgresChangesPayload<DbThrow>) => {
        const newThrow = payload.new as DbThrow;
        if (newThrow && newThrow.id) {
          callback(newThrow);
        }
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" && onError) {
        onError(new Error("Realtime subscription failed"));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

export function createPresenceSubscription(
  callback: () => void,
  onError?: (error: Error) => void
): () => void {
  const client = getClient();
  const channelName = nextChannelName("presence");
  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_presence",
      },
      () => {
        callback();
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" && onError) {
        onError(new Error("Presence subscription failed"));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

// Legacy aliases for backward compatibility — same functionality, unique channels each call
export const subscribeToThrows = createThrowsSubscription;
export const subscribeToPresence = createPresenceSubscription;

// ── Mock Client (for when Supabase is not configured) ──
function createMockSupabase(): SupabaseClient {
  const mockResponse = (data: any = []) => ({
    data,
    error: null,
    count: 0,
    status: 200,
    statusText: "OK",
  });

  const mockQuery: any = {
    select: () => mockQuery,
    from: () => mockQuery,
    eq: () => mockQuery,
    gte: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    upsert: () => Promise.resolve(mockResponse()),
    single: () => Promise.resolve(mockResponse(null)),
    then: (resolve: any) => resolve(mockResponse([])),
  };

  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === "then") return undefined;
      if (prop === "from") return () => mockQuery;
      if (prop === "channel") return () => ({ on: () => ({ subscribe: () => {} }) });
      if (prop === "removeChannel") return () => {};
      if (prop === "removeAllChannels") return () => {};
      return () => mockQuery;
    },
  });
}

// ── Exports ──
export const supabase = isConfigured ? getClient() : createMockSupabase();

export const getSupabaseClient = () => {
  if (!isConfigured) {
    console.warn("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
    return createMockSupabase();
  }
  return getClient();
};

export const isSupabaseConfigured = isConfigured;