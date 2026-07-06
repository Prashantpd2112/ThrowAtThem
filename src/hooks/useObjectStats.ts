"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { CountryObjectStats, ObjectDistribution, TimePeriod } from "@/lib/types";
import { getObjectById } from "@/data/objects";

export function useObjectStats() {
  const [objectStatsMap, setObjectStatsMap] = useState<Record<string, CountryObjectStats>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchObjectStats = useCallback(async (period: TimePeriod) => {
    if (!isSupabaseConfigured) {
      setObjectStatsMap({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Single aggregation query: group by target_country AND object
      let query = supabase
        .from("throws")
        .select("target_country, object");

      if (period === "daily") {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", dayAgo);
      } else if (period === "weekly") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", weekAgo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as { target_country: string; object: string }[];

      // Group: country_code -> object_id -> count
      const countryObjectCounts: Record<string, Record<string, number>> = {};

      rows.forEach((row) => {
        if (!countryObjectCounts[row.target_country]) {
          countryObjectCounts[row.target_country] = {};
        }
        countryObjectCounts[row.target_country][row.object] =
          (countryObjectCounts[row.target_country][row.object] || 0) + 1;
      });

      // Build the map
      const statsMap: Record<string, CountryObjectStats> = {};

      Object.entries(countryObjectCounts).forEach(([countryCode, objectCounts]) => {
        const objects: ObjectDistribution[] = Object.entries(objectCounts)
          .map(([objId, count]) => {
            const obj = getObjectById(objId);
            return {
              object_id: objId,
              object_name: obj?.name || objId,
              object_emoji: obj?.emoji || "❓",
              count,
            };
          })
          .sort((a, b) => b.count - a.count); // descending by count

        const totalThrows = objects.reduce((sum, o) => sum + o.count, 0);
        const mostUsed = objects.length > 0 ? objects[0] : null;

        statsMap[countryCode] = {
          country_code: countryCode,
          objects,
          most_used_object: mostUsed,
          total_throws: totalThrows,
        };
      });

      setObjectStatsMap(statsMap);
    } catch (err) {
      console.error("Failed to fetch object stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchObjectStats("all_time");
  }, [fetchObjectStats]);

  // No realtime subscription here. Object breakdowns now refresh only when
  // the user manually triggers a refresh (refresh button, browser reload,
  // or remount). Other features keep their own realtime subscriptions.

  return {
    objectStatsMap,
    isLoading,
    fetchObjectStats,
  };
}
