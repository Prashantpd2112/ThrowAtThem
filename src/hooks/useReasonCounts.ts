"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { TimePeriod } from "@/lib/types";

/**
 * Lightweight per-country reason count hook.
 * Returns a map: countryCode -> number of throws with a non-empty reason.
 * Used by the leaderboard to display "Reasons N ▼" pills without
 * triggering N realtime subscriptions.
 */
export function useReasonCounts(period: TimePeriod, countryCodes: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCounts({});
      return;
    }
    if (countryCodes.length === 0) {
      setCounts({});
      return;
    }

    setIsLoading(true);
    try {
      const result: Record<string, number> = {};

      // Build a single query covering all country codes via .in() — much
      // more efficient than N separate round-trips.
      let query = supabase
        .from("throws")
        .select("target_country")
        .not("reason", "is", null)
        .neq("reason", "");

      if (period === "daily") {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", since);
      } else if (period === "weekly") {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", since);
      }

      query = query.in("target_country", countryCodes);

      const { data, error } = await query;
      if (error) throw error;

      (data || []).forEach((row: { target_country: string }) => {
        result[row.target_country] = (result[row.target_country] || 0) + 1;
      });

      // Ensure every country has a key (default 0)
      countryCodes.forEach((code) => {
        if (!(code in result)) result[code] = 0;
      });

      setCounts(result);
    } catch (err) {
      console.warn("Failed to fetch reason counts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, countryCodes.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // No realtime subscription here. Reason counts now refresh only when
  // the user manually triggers a refresh (refresh button, browser reload,
  // or remount). Other features keep their own realtime subscriptions.

  return { counts, isLoading, refetch: fetchCounts };
}
