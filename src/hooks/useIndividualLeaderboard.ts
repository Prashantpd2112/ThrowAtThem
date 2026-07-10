"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured, subscribeToThrows } from "@/lib/supabase";
import { IndividualLeaderboardEntry, IndividualObjectStats, ObjectDistribution, TimePeriod } from "@/lib/types";
import { getObjectById } from "@/data/objects";

export function useIndividualLeaderboard() {
  const [individualLeaderboard, setIndividualLeaderboard] = useState<IndividualLeaderboardEntry[]>([]);
  const [objectStatsMap, setObjectStatsMap] = useState<Record<string, IndividualObjectStats>>({});
  const [reasonCounts, setReasonCounts] = useState<Record<string, number>>({});
  const [reasonsMap, setReasonsMap] = useState<Record<string, Array<{reason: string; created_at: string}>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("all_time");
  const unsubRef = useRef<(() => void) | null>(null);

  const computeLeaderboard = useCallback(
    (
      rows: Array<{ target_profile_id: string; object: string; reason: string | null; created_at: string }>,
      profiles: Array<{ id: string; nickname: string; profile_image: string; profession: string; country: string }>
    ) => {
      // Build a map of profile_id -> profile info
      const profileMap: Record<string, { nickname: string; profile_image: string; profession: string; country: string }> = {};
      profiles.forEach((p) => {
        profileMap[p.id] = { nickname: p.nickname, profile_image: p.profile_image, profession: p.profession, country: p.country };
      });

      // Group throws by profile
      const profileCounts: Record<string, number> = {};
      const profileObjects: Record<string, Record<string, number>> = {};
      const profileReasons: Record<string, number> = {};

      // Collect individual reasons per profile
      const profileReasonsList: Record<string, Array<{reason: string; created_at: string}>> = {};

      rows.forEach((t) => {
        const pid = t.target_profile_id;
        profileCounts[pid] = (profileCounts[pid] || 0) + 1;

        // Object counts per profile
        if (!profileObjects[pid]) profileObjects[pid] = {};
        profileObjects[pid][t.object] = (profileObjects[pid][t.object] || 0) + 1;

        // Reason counts per profile
        if (t.reason && t.reason.trim() !== "") {
          profileReasons[pid] = (profileReasons[pid] || 0) + 1;
          if (!profileReasonsList[pid]) profileReasonsList[pid] = [];
          profileReasonsList[pid].push({ reason: t.reason, created_at: t.created_at });
        }
      });

      // Sort reasons newest first
      Object.keys(profileReasonsList).forEach((pid) => {
        profileReasonsList[pid].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Build leaderboard entries
      const entries: IndividualLeaderboardEntry[] = Object.entries(profileCounts)
        .map(([pid, count]) => {
          const profile = profileMap[pid];
          return {
            profile_id: pid,
            nickname: profile?.nickname || "Unknown",
            profile_image: profile?.profile_image || "",
            profession: profile?.profession || "",
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
      setReasonsMap(profileReasonsList);
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
          .select("id, nickname, profile_image, profession, country");

        if (profilesError) throw profilesError;

        computeLeaderboard(
          (throwsData || []) as Array<{ target_profile_id: string; object: string; reason: string | null; created_at: string }>,
          (profilesData || []) as Array<{ id: string; nickname: string; profile_image: string; profession: string; country: string }>
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

  // ── Realtime subscription for live leaderboard updates ──
  // When a new throw aimed at an individual comes in, increment
  // the count in the local leaderboard state so it updates instantly.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    unsubRef.current = subscribeToThrows((newThrow) => {
      if (!newThrow.target_profile_id) return;

      const pid = newThrow.target_profile_id;

      setIndividualLeaderboard((prev) => {
        // Find the profile in the current leaderboard
        const existing = prev.find((e) => e.profile_id === pid);
        if (existing) {
          // Increment count and re-sort
          const updated = prev.map((e) =>
            e.profile_id === pid ? { ...e, count: e.count + 1 } : e
          );
          return updated.sort((a, b) => b.count - a.count);
        }
        // Profile not in leaderboard yet — trigger a background refetch
        // to pick up the new profile with its first throw
        fetchData(activePeriod);
        return prev;
      });

      // Also update reasons list (prepend new reason)
      setReasonsMap((prev) => {
        const existing = prev[pid];
        if (!existing) return prev;
        const newReason = newThrow.reason?.trim() || "";
        if (!newReason) return prev;
        return {
          ...prev,
          [pid]: [{ reason: newReason, created_at: new Date().toISOString() }, ...existing],
        };
      });

      // Also update object stats map (increment if we have data for this profile)
      setObjectStatsMap((prev) => {
        const existing = prev[pid];
        if (!existing) return prev;
        const obj = getObjectById(newThrow.object);
        const updatedObjects = existing.objects.map((o) =>
          o.object_id === newThrow.object
            ? { ...o, count: o.count + 1 }
            : o
        );
        // If the object wasn't in the list, add it
        if (!existing.objects.find((o) => o.object_id === newThrow.object)) {
          updatedObjects.push({
            object_id: newThrow.object,
            object_name: obj?.name || newThrow.object,
            object_emoji: obj?.emoji || "❓",
            count: 1,
          });
        }
        return {
          ...prev,
          [pid]: {
            ...existing,
            objects: updatedObjects.sort((a, b) => b.count - a.count),
            most_used_object: updatedObjects[0] || null,
            total_throws: existing.total_throws + 1,
          },
        };
      });
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, [fetchData, activePeriod]);

  const changePeriod = useCallback((period: TimePeriod) => {
    setActivePeriod(period);
  }, []);

  return {
    individualLeaderboard,
    objectStatsMap,
    reasonCounts,
    reasonsMap,
    isLoading,
    activePeriod,
    fetchData: changePeriod,
    refreshData: fetchData,
  };
}
