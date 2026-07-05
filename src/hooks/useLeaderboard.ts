"use client";

import { useState, useCallback } from "react";
import { supabase, DbThrow } from "@/lib/supabase";
import { LeaderboardEntry, ObjectLeaderboardEntry, TimePeriod } from "@/lib/types";
import { getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";

export function useLeaderboard() {
  const [countryLeaderboard, setCountryLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [objectLeaderboard, setObjectLeaderboard] = useState<ObjectLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("all_time");

  const fetchLeaderboard = useCallback(async (period: TimePeriod = "all_time") => {
    setIsLoading(true);
    setError(null);
    setActivePeriod(period);

    try {
      let query = supabase.from("throws").select("target_country, object");

      if (period === "daily") {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", dayAgo);
      } else if (period === "weekly") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", weekAgo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Country counts
      const countryCounts: Record<string, number> = {};
      const objectCounts: Record<string, number> = {};

      (data as DbThrow[]).forEach((t) => {
        countryCounts[t.target_country] = (countryCounts[t.target_country] || 0) + 1;
        objectCounts[t.object] = (objectCounts[t.object] || 0) + 1;
      });

      const countries: LeaderboardEntry[] = Object.entries(countryCounts)
        .map(([code, count]) => {
          const country = getCountryByCode(code);
          return {
            country_name: country?.name || code,
            country_code: code,
            flag: country?.flag || "🏳",
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const objects: ObjectLeaderboardEntry[] = Object.entries(objectCounts)
        .map(([id, count]) => {
          const obj = getObjectById(id);
          return {
            object: obj?.name || id,
            count,
            emoji: obj?.emoji || "❓",
          };
        })
        .sort((a, b) => b.count - a.count);

      setCountryLeaderboard(countries);
      setObjectLeaderboard(objects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    } finally {
      setIsLoading(false);
    }
  // getCountryByCode and getObjectById are module-level imports, not state/props
  // so they don't need to be in the dependency array
  }, []);

  return {
    countryLeaderboard,
    objectLeaderboard,
    isLoading,
    error,
    activePeriod,
    fetchLeaderboard,
  };
}
