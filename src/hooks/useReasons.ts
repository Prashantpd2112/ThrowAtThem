"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, subscribeToThrows, isSupabaseConfigured } from "@/lib/supabase";
import { getObjectById } from "@/data/objects";

export interface ReasonEntry {
  id: string;
  reason: string;
  object_emoji: string;
  object_name: string;
  created_at: string;
}

export function useReasons(countryCode: string | null) {
  const [reasons, setReasons] = useState<ReasonEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const countryRef = useRef<string | null>(countryCode);

  // Keep ref in sync
  useEffect(() => {
    countryRef.current = countryCode;
  }, [countryCode]);

  const fetchTotalCount = useCallback(async (code: string) => {
    if (!isSupabaseConfigured || !code) {
      setTotalCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from("throws")
        .select("id", { count: "exact", head: true })
        .eq("target_country", code)
        .not("reason", "is", null)
        .neq("reason", "");
      if (error) throw error;
      setTotalCount(count || 0);
    } catch (err) {
      console.warn("Failed to fetch reason count:", err);
    }
  }, []);

  const fetchReasons = useCallback(async (code: string) => {
    if (!isSupabaseConfigured || !code) {
      setReasons([]);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("throws")
        .select("id, reason, object, created_at")
        .eq("target_country", code)
        .not("reason", "is", null)
        .neq("reason", "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const rows = (data || []) as { id: string; reason: string; object: string; created_at: string }[];

      const mapped: ReasonEntry[] = rows.map((row) => {
        const obj = getObjectById(row.object);
        return {
          id: row.id,
          reason: row.reason,
          object_emoji: obj?.emoji || "❓",
          object_name: obj?.name || row.object,
          created_at: row.created_at,
        };
      });

      setReasons(mapped);
    } catch (err) {
      console.error("Failed to fetch reasons:", err);
      setReasons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when country changes
  useEffect(() => {
    if (countryCode) {
      fetchReasons(countryCode);
      fetchTotalCount(countryCode);
    } else {
      setReasons([]);
      setTotalCount(0);
    }
  }, [countryCode, fetchReasons, fetchTotalCount]);

  // Subscribe to realtime throws for this country
  useEffect(() => {
    if (!isSupabaseConfigured || !countryCode) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = subscribeToThrows(
      (newThrow) => {
        // Only update if the throw targets the current country and has a reason
        if (
          newThrow.target_country === countryRef.current &&
          newThrow.reason &&
          newThrow.reason.trim() !== ""
        ) {
          const obj = getObjectById(newThrow.object);
          const newEntry: ReasonEntry = {
            id: newThrow.id,
            reason: newThrow.reason,
            object_emoji: obj?.emoji || "❓",
            object_name: obj?.name || newThrow.object,
            created_at: newThrow.created_at,
          };

          setReasons((prev) => {
            // Add new reason at the top, keep max 10
            const updated = [newEntry, ...prev].slice(0, 10);
            return updated;
          });

          setTotalCount((prev) => prev + 1);
        }
      },
      (err) => {
        console.warn("Reasons realtime error:", err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  return {
    reasons,
    totalCount,
    isLoading,
    fetchReasons,
  };
}
