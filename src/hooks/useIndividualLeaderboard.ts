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
        // [1] Fetch profiles sorted by pre-computed total_throws
        //     No COUNT(*) — total_throws is atomically maintained by the submit_throw RPC.
        const { data: profilesData, error: profilesError } = await supabase
          .from("individual_profiles")
          .select("id, nickname, profile_image, profession, country, total_throws")
          .gt("total_throws", 0)
          .order("total_throws", { ascending: false })
          .limit(50);

        if (profilesError) throw profilesError;

        // [2] Fetch object breakdowns from profile_object_counts
        //     This replaces the old pattern of fetching ALL throws and counting in JS.
        const { data: objCountsData, error: objError } = await supabase
          .from("profile_object_counts")
          .select("profile_id, object, count");

        if (objError) throw objError;

        // [3] Fetch reasons from throws — actual data, not counting
        let reasonsQuery = supabase
          .from("throws")
          .select("target_profile_id, reason, created_at")
          .not("target_profile_id", "is", null)
          .not("reason", "is", null)
          .neq("reason", "")
          .order("created_at", { ascending: false });

        if (period === "daily") {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          reasonsQuery = reasonsQuery.gte("created_at", dayAgo);
        } else if (period === "weekly") {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          reasonsQuery = reasonsQuery.gte("created_at", weekAgo);
        }

        const { data: reasonsData, error: reasonsError } = await reasonsQuery;
        if (reasonsError) throw reasonsError;

        // ── Build leaderboard entries from individual_profiles ──
        const entries: IndividualLeaderboardEntry[] = (profilesData || []).map((p: any) => ({
          profile_id: p.id,
          nickname: p.nickname,
          profile_image: p.profile_image || "",
          profession: p.profession || "",
          count: p.total_throws || 0,
          country: p.country || "",
        }));

        // ── Build object stats map from profile_object_counts ──
        const profileObjCounts: Record<string, Record<string, number>> = {};
        (objCountsData || []).forEach((oc: any) => {
          if (!profileObjCounts[oc.profile_id]) profileObjCounts[oc.profile_id] = {};
          profileObjCounts[oc.profile_id][oc.object] = (profileObjCounts[oc.profile_id][oc.object] || 0) + oc.count;
        });

        const statsMap: Record<string, IndividualObjectStats> = {};
        Object.entries(profileObjCounts).forEach(([pid, objCounts]) => {
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
          statsMap[pid] = {
            profile_id: pid,
            objects,
            most_used_object: objects.length > 0 ? objects[0] : null,
            total_throws: totalThrows,
          };
        });

        // ── Build reasons map from throws data ──
        const profileReasonsList: Record<string, Array<{reason: string; created_at: string}>> = {};
        const profileReasons: Record<string, number> = {};
        (reasonsData || []).forEach((t: any) => {
          const pid = t.target_profile_id;
          if (!pid) return;
          if (!profileReasonsList[pid]) profileReasonsList[pid] = [];
          profileReasonsList[pid].push({ reason: t.reason, created_at: t.created_at });
          profileReasons[pid] = (profileReasons[pid] || 0) + 1;
        });

        setIndividualLeaderboard(entries);
        setObjectStatsMap(statsMap);
        setReasonCounts(profileReasons);
        setReasonsMap(profileReasonsList);
      } catch (err) {
        console.error("Failed to fetch individual leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial fetch on mount and when period changes
  useEffect(() => {
    fetchData(activePeriod);
  }, [activePeriod, fetchData]);

  // ── Realtime subscription for live leaderboard updates ──
  // When a new throw aimed at an individual comes in, increment
  // the in-memory counters so the UI updates instantly without refetching.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    unsubRef.current = subscribeToThrows((newThrow) => {
      if (!newThrow.target_profile_id) return;

      const pid = newThrow.target_profile_id;

      setIndividualLeaderboard((prev) => {
        const existing = prev.find((e) => e.profile_id === pid);
        if (existing) {
          const updated = prev.map((e) =>
            e.profile_id === pid ? { ...e, count: e.count + 1 } : e
          );
          return updated.sort((a, b) => b.count - a.count);
        }
        // Profile not in leaderboard yet — trigger a background refetch
        fetchData(activePeriod);
        return prev;
      });

      // Update reasons list
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

      // Update object stats map
      setObjectStatsMap((prev) => {
        const existing = prev[pid];
        if (!existing) return prev;
        const obj = getObjectById(newThrow.object);
        const updatedObjects = existing.objects.map((o) =>
          o.object_id === newThrow.object
            ? { ...o, count: o.count + 1 }
            : o
        );
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
