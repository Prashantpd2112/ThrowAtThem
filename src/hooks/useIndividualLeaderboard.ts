"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { IndividualLeaderboardEntry, IndividualObjectStats, ObjectDistribution, TimePeriod } from "@/lib/types";
import { getObjectById } from "@/data/objects";

export function useIndividualLeaderboard() {
  const [individualLeaderboard, setIndividualLeaderboard] = useState<IndividualLeaderboardEntry[]>([]);
  const [objectStatsMap, setObjectStatsMap] = useState<Record<string, IndividualObjectStats>>({});
  const [reasonCounts, setReasonCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("all_time");

  const computeLeaderboard = useCallback(
    (
      rows: Array<{ target_profile_id: string; object: string; reason: string | null; created_at: string }>,
      profiles: Array<{ id: string; nickname: string; profile_image: string; country: string }>
    ) => {
      // Build a map of profile_id -> profile info
      const profileMap: Record<string, { nickname: string; profile_image: string; country: string }> = {};
      profiles.forEach((p) => {
        profileMap[p.id] = { nickname: p.nickname, profile_image: p.profile_image, country: p.country };
      });

      // Group throws by profile
      const profileCounts: Record<string, number> = {};
      const profileObjects: Record<string, Record<string, number>> = {};
      const profileReasons: Record<string, number> = {};

      rows.forEach((t) => {
        const pid = t.target_profile_id;
        profileCounts[pid] = (profileCounts[pid] || 0) + 1;

        // Object counts per profile
        if (!profileObjects[pid]) profileObjects[pid] = {};
        profileObjects[pid][t.object] = (profileObjects[pid][t.object] || 0) + 1;

        // Reason counts per profile
        if (t.reason && t.reason.trim() !== "") {
          profileReasons[pid] = (profileReasons[pid] || 0) + 1;
        }
      });

      // Build leaderboard entries
      const entries: IndividualLeaderboardEntry[] = Object.entries(profileCounts)
        .map(([pid, count]) => {
          const profile = profileMap[pid];
          return {
            profile_id: pid,
            nickname: profile?.nickname || "Unknown",
            profile_image: profile?.profile_image || "",
            count,
            country: profile?.country || "",
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Build object stats map
      const statsMap: Record<string, IndividualObjectStats> = {};
      Object.entries(profileObjects).forEach(([pid, objCounts]) => {
        const objects: ObjectDistribution[] = Object.entries(objCounts)
          .map(([objId, count]) => {
            const obj = getObjectById(objId);
            return {
              object_id: objId,
              object_name: obj?.name || objId,
              object_emoji: obj?.emoji || "❓",
              count,
            };
          })
          .sort((a, b) => b.count - a.count);

        const totalThrows = objects.reduce((sum, o) => sum + o.count, 0);
        const mostUsed = objects.length > 0 ? objects[0] : null;

        statsMap[pid] = {
          profile_id: pid,
          objects,
          most_used_object: mostUsed,
          total_throws: totalThrows,
        };
      });

      setIndividualLeaderboard(entries);
      setObjectStatsMap(statsMap);
      setReasonCounts(profileReasons);
    },
    []
  );

  const fetchData = useCallback(
    async (period: TimePeriod): Promise<void> => {
      if (!isSupabaseConfigured) {
        setIndividualLeaderboard([]);
        setObjectStatsMap({});
        setReasonCounts({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Fetch throws with target_profile_id
        let throwsQuery = supabase
          .from("throws")
          .select("target_profile_id, object, reason, created_at")
          .not("target_profile_id", "is", null);

        if (period === "daily") {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          throwsQuery = throwsQuery.gte("created_at", dayAgo);
        } else if (period === "weekly") {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          throwsQuery = throwsQuery.gte("created_at", weekAgo);
        }

        const { data: throwsData, error: throwsError } = await throwsQuery;
        if (throwsError) throw throwsError;

        // Fetch all profiles for name lookup
        const { data: profilesData, error: profilesError } = await supabase
          .from("individual_profiles")
          .select("id, nickname, profile_image, country");

        if (profilesError) throw profilesError;

        computeLeaderboard(
          (throwsData || []) as Array<{ target_profile_id: string; object: string; reason: string | null; created_at: string }>,
          (profilesData || []) as Array<{ id: string; nickname: string; profile_image: string; country: string }>
        );
      } catch (err) {
        console.error("Failed to fetch individual leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [computeLeaderboard]
  );

  // Initial fetch on mount and when period changes
  useEffect(() => {
    fetchData(activePeriod);
  }, [activePeriod, fetchData]);

  const changePeriod = useCallback((period: TimePeriod) => {
    setActivePeriod(period);
  }, []);

  return {
    individualLeaderboard,
    objectStatsMap,
    reasonCounts,
    isLoading,
    activePeriod,
    fetchData: changePeriod,
    refreshData: fetchData,
  };
}
