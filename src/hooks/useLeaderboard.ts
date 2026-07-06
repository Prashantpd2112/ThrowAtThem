"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { LeaderboardEntry, ObjectLeaderboardEntry, TimePeriod, CountryThrow } from "@/lib/types";
import { getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";

export function useLeaderboard() {
  const [countryLeaderboard, setCountryLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [objectLeaderboard, setObjectLeaderboard] = useState<ObjectLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("all_time");

  const computeLeaderboard = useCallback((rows: Array<{ target_country: string; object: string; reason: string | null; nickname: string | null; created_at: string }>) => {
    const countryCounts: Record<string, number> = {};
    const countryThrows: Record<string, CountryThrow[]> = {};
    const objectCounts: Record<string, number> = {};

    rows.forEach((t) => {
      countryCounts[t.target_country] = (countryCounts[t.target_country] || 0) + 1;
      objectCounts[t.object] = (objectCounts[t.object] || 0) + 1;

      if (!countryThrows[t.target_country]) {
        countryThrows[t.target_country] = [];
      }
      const obj = getObjectById(t.object);
      countryThrows[t.target_country].push({
        id: `${t.target_country}-${countryThrows[t.target_country].length}`,
        username: t.nickname || "Anonymous",
        reason: t.reason || "",
        object_name: obj?.name || t.object,
        object_emoji: obj?.emoji || "❓",
        created_at: t.created_at,
      });
    });

    const countries: LeaderboardEntry[] = Object.entries(countryCounts)
      .map(([code, count]) => {
        const country = getCountryByCode(code);
        return {
          country_name: country?.name || code,
          country_code: code,
          flag: country?.flag || "🏳",
          count,
          throws: countryThrows[code] || [],
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
  }, []);

  // Real fetch function — fetches leaderboard data for a given period.
  // Returns a promise that resolves on success or rejects on failure so callers
  // (e.g. the manual refresh button) can react to errors.
  const fetchLeaderboard = useCallback(
    async (period: TimePeriod): Promise<void> => {
      if (!isSupabaseConfigured) {
        setCountryLeaderboard([]);
        setObjectLeaderboard([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("throws")
          .select("target_country, object, reason, nickname, created_at");

        if (period === "daily") {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", dayAgo);
        } else if (period === "weekly") {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", weekAgo);
        }

        const { data, error } = await query;
        if (error) throw error;

        computeLeaderboard((data || []) as Array<{ target_country: string; object: string; reason: string | null; nickname: string | null; created_at: string }>);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [computeLeaderboard]
  );

  // Initial fetch on mount and whenever the active period changes.
  // (No realtime subscription — the leaderboard only refreshes manually
  // via the refresh button, on browser reload, or on remount.)
  useEffect(() => {
    fetchLeaderboard(activePeriod).catch(() => {
      // Error already captured in hook state; swallow to keep effect clean.
    });
  }, [activePeriod, fetchLeaderboard]);

  const changePeriod = useCallback((period: TimePeriod) => {
    setActivePeriod(period);
  }, []);

  return {
    countryLeaderboard,
    objectLeaderboard,
    isLoading,
    error,
    activePeriod,
    fetchLeaderboard: changePeriod,
    refreshLeaderboard: fetchLeaderboard,
  };
}