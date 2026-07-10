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
export type SupabaseThrow = {
  id: string;
  guest_id: string;
  nickname: string;
  thrower_country: string;
  target_country: string;
  target_profile_id: string | null;
  object: string;
  reason: string;
  created_at: string;
};

export type DbIndividualProfile = {
  id: string;
  guest_id: string;
  nickname: string;
  profile_image: string;
  profession: string;
  country: string;
  city: string;
  bio: string;
  social_link: string;
  likes: number;
  views: number;
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

/**
 * Ensures a guest row exists in the database for the given local guest data.
 * If the guest already exists (by id), it updates nickname/country.
 * If not, it inserts a new row.
 * This is a synchronous await — the caller MUST await this before doing any
 * operation that references guest_id as a foreign key.
 * Returns true on success, throws on failure.
 */
export const ensureGuestExists = async (guest: { id: string; nickname: string; country: string }): Promise<boolean> => {
  const client = getClient();
  // First check if the guest row already exists
  const { data: existing, error: lookupError } = await client
    .from("guests")
    .select("id")
    .eq("id", guest.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    // Guest exists — just update nickname/country in case they changed
    const { error: updateError } = await client
      .from("guests")
      .update({ nickname: guest.nickname, country: guest.country })
      .eq("id", guest.id);
    if (updateError) {
      throw updateError;
    }
    return true;
  }

  // Guest doesn't exist — insert it
  const { error: insertError } = await client
    .from("guests")
    .insert(guest);
  if (insertError) {
    // Code 23505 = unique violation (duplicate key). This happens when a
    // concurrent ensureGuestExists call inserted the same guest_id first.
    // Treat this as success — the guest row now exists.
    if (insertError.code === '23505') {
      return true;
    }
    throw insertError;
  }
  return true;
};

export const upsertGuest = async (guest: { id: string; nickname: string; country: string }) => {
  const client = getClient();
  // Use maybeSingle() instead of single() — single() throws 406/PGRST116
  // when no rows match, which is expected for a new guest that hasn't
  // been synced to Supabase yet.
  const { data: existing, error: lookupError } = await client
    .from("guests")
    .select("id")
    .eq("id", guest.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const { error } = await client
      .from("guests")
      .update({ nickname: guest.nickname, country: guest.country })
      .eq("id", guest.id);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await client
      .from("guests")
      .insert(guest);
    if (error) {
      // 23505 = unique violation — happens when two concurrent
      // upsertGuest calls both try to insert the same guest.
      // Treat as success — the row now exists.
      if (error.code === "23505") return;
      throw error;
    }
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
  target_profile_id?: string | null;
}): Promise<boolean> => {
  const client = getClient();
  const record: Record<string, any> = {
    guest_id: throwData.guest_id,
    nickname: throwData.nickname,
    thrower_country: throwData.thrower_country,
    target_country: throwData.target_country,
    object: throwData.object,
    reason: throwData.reason || "",
  };
  if (throwData.target_profile_id) {
    record.target_profile_id = throwData.target_profile_id;
  }
  console.log('[DEBUG insertThrow] final record payload:', JSON.stringify(record));
  const { error } = await client.from("throws").insert(record);
  if (error) {
    console.log('[DEBUG insertThrow] Supabase error:', error);
  } else {
    console.log('[DEBUG insertThrow] SUCCESS - target_profile_id in payload:', record.target_profile_id || 'MISSING');
  }
  if (error) {
    throw error;
  }
  return true;
};

export const fetchRecentThrows = async (limit = 50): Promise<SupabaseThrow[]> => {
  const client = getClient();
  const { data, error } = await client
    .from("throws")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as SupabaseThrow[];
};

// Returns the total number of throws stored in the database (all-time).
// Uses a HEAD-only count query so no row data is transferred.
export const fetchTotalThrowCount = async (): Promise<number> => {
  const client = getClient();
  const { count, error } = await client
    .from("throws")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return typeof count === "number" ? count : 0;
};

// ── Profile Throw Rankings ──

export const fetchProfileThrowCounts = async (): Promise<Record<string, number>> => {
  const client = getClient();
  const { data, error } = await client
    .from("throws")
    .select("target_profile_id")
    .not("target_profile_id", "is", null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data as { target_profile_id: string }[]).forEach((t) => {
    if (t.target_profile_id) {
      counts[t.target_profile_id] = (counts[t.target_profile_id] || 0) + 1;
    }
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
  if (error) {
    throw error;
  }
};

export const removePresence = async (guestId: string) => {
  const client = getClient();
  const { error } = await client
    .from("user_presence")
    .delete()
    .eq("guest_id", guestId);
  if (error) {
    throw error;
  }
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

// ── Individual Profile Operations ──

export const insertProfile = async (profile: {
  guest_id: string;
  nickname: string;
  profile_image: string;
  profession: string;
  country: string;
  city: string;
  bio: string;
  social_link: string;
}): Promise<string> => {
  const client = getClient();
  const { data, error } = await client
    .from("individual_profiles")
    .insert(profile)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
};

// Check if a profile already exists for this guest
// Returns the profile if found, null otherwise.
export const fetchProfileByGuestId = async (guestId: string): Promise<DbIndividualProfile | null> => {
  const client = getClient();
  const { data, error } = await client
    .from("individual_profiles")
    .select("*")
    .eq("guest_id", guestId)
    .maybeSingle();
  if (error) throw error;
  return data as DbIndividualProfile | null;
};

export const fetchProfiles = async (): Promise<DbIndividualProfile[]> => {
  const client = getClient();
  const { data, error } = await client
    .from("individual_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DbIndividualProfile[];
};

// Check if a profile already exists with the same name + country + profession
// Returns the matching profile if found, null otherwise.
export const fetchProfileByUniqueFields = async (fields: {
  nickname: string;
  country: string;
  profession: string;
}): Promise<DbIndividualProfile | null> => {
  const client = getClient();
  const { data, error } = await client
    .from("individual_profiles")
    .select("*")
    .eq("nickname", fields.nickname)
    .eq("country", fields.country)
    .eq("profession", fields.profession)
    .maybeSingle();
  if (error) throw error;
  return data as DbIndividualProfile | null;
};

export function createProfilesSubscription(
  callback: (profile: DbIndividualProfile, event: "INSERT" | "UPDATE" | "DELETE") => void,
  onError?: (error: Error) => void
): () => void {
  const client = getClient();
  const channelName = nextChannelName("profiles");
  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "individual_profiles",
      },
      (payload: RealtimePostgresChangesPayload<DbIndividualProfile>) => {
        if (payload.eventType === "INSERT" && payload.new) {
          callback(payload.new as DbIndividualProfile, "INSERT");
        } else if (payload.eventType === "UPDATE" && payload.new) {
          callback(payload.new as DbIndividualProfile, "UPDATE");
        } else if (payload.eventType === "DELETE" && payload.old) {
          callback(payload.old as DbIndividualProfile, "DELETE");
        }
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" && onError) {
        onError(new Error("Profiles subscription failed"));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

// ── Realtime Subscriptions ──
// Each call creates a UNIQUE channel name so multiple subscriptions never collide.

export function createThrowsSubscription(
  callback: (throwData: SupabaseThrow) => void,
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
      (payload: RealtimePostgresChangesPayload<SupabaseThrow>) => {
        const newThrow = payload.new as SupabaseThrow;
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