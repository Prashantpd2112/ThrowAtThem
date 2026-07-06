"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, subscribeToThrows, isSupabaseConfigured } from "@/lib/supabase";
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
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const activePeriodRef = useRef<TimePeriod>(period);

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

  // Keep ref in sync so realtime can re-fetch with the current period
  useEffect(() => {
    activePeriodRef.current = period;
  }, [period]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: re-fetch counts when any new throw lands
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = subscribeToThrows(
      (newThrow) => {
        // Only re-fetch if the new throw has a reason and targets a country
        // in our current list (optimisation to avoid extra work).
        if (
          newThrow.reason &&
          newThrow.reason.trim() !== "" &&
          countryCodes.includes(newThrow.target_country)
        ) {
          // Cheap, local increment for instant feedback
          setCounts((prev) => {
            const current = prev[newThrow.target_country] || 0;
            return { ...prev, [newThrow.target_country]: current + 1 };
          });
        }
      },
      (err) => {
        console.warn("ReasonCounts realtime error:", err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCodes.join("|")]);

  return { counts, isLoading, refetch: fetchCounts };
}