"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThrowEntry } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { fetchRecentThrows, subscribeToThrows, isSupabaseConfigured, fetchTotalThrowCount } from "@/lib/supabase";
import { getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";

// Compact number formatter: 845 -> "845", 1250 -> "1.2K", 12500 -> "12.5K",
// 1250000 -> "1.2M", etc. Keeps one decimal when below 10× the next unit.
function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 1000) return String(Math.floor(n));
  const units: { v: number; s: string }[] = [
    { v: 1_000_000_000, s: "B" },
    { v: 1_000_000, s: "M" },
    { v: 1_000, s: "K" },
  ];
  for (const { v, s } of units) {
    if (n >= v) {
      const scaled = n / v;
      const display = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
      // Trim a trailing ".0" (e.g. "2.0K" -> "2K")
      return (Number.isInteger(display) ? String(display) : display.toFixed(1)) + s;
    }
  }
  return String(Math.floor(n));
}

export function LiveFeed() {
  const [throws, setThrows] = useState<ThrowEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  // Real total of every throw in the database. null = not yet fetched.
  const [totalThrows, setTotalThrows] = useState<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Fetch the real total count in parallel with the recent throws list.
    // This is a one-time load — the badge will NOT update in realtime.
    fetchTotalThrowCount()
      .then((count) => {
        setTotalThrows(count);
      })
      .catch(() => {
        // Keep the previous value on failure; initial null will render as "0 throws".
      });

    fetchRecentThrows(50)
      .then((data) => {
        const enriched = data.map((t) => {
          const country = getCountryByCode(t.target_country);
          const throwerCountry = getCountryByCode(t.thrower_country);
          const obj = getObjectById(t.object);
          return {
            id: t.id,
            player_id: t.guest_id,
            nickname: t.nickname,
            thrower_country: t.thrower_country,
            target_country: t.target_country,
            country_name: country?.name || t.target_country,
            thrower_country_name: throwerCountry?.name || null,
            thrower_flag: throwerCountry?.flag || null,
            object: obj?.emoji || "❓",
            reason: t.reason,
            created_at: t.created_at,
          };
        });
        setThrows(enriched);
      })
      .catch(() => {
        // Silently handle initial fetch error
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Subscribe to realtime throws
    unsubscribeRef.current = subscribeToThrows(
      (newThrow) => {
        const country = getCountryByCode(newThrow.target_country);
        const throwerCountry = getCountryByCode(newThrow.thrower_country);
        const obj = getObjectById(newThrow.object);
        const entry: ThrowEntry = {
          id: newThrow.id,
          player_id: newThrow.guest_id,
          nickname: newThrow.nickname,
          thrower_country: newThrow.thrower_country,
          target_country: newThrow.target_country,
          country_name: country?.name || newThrow.target_country,
          thrower_country_name: throwerCountry?.name || null,
          thrower_flag: throwerCountry?.flag || null,
          object: obj?.emoji || "❓",
          reason: newThrow.reason,
          created_at: newThrow.created_at,
        };
        setThrows((prev) => [entry, ...prev].slice(0, 50));
        // Increment the total badge by 1 for every realtime insert.
        // We use the functional updater so two events fired in the same
        // tick still both get counted, regardless of stale closure values.
        setTotalThrows((prevTotal) => (prevTotal == null ? 1 : prevTotal + 1));
      },
      (err) => {
        setRealtimeError("Live connection lost. Reconnecting...");
        console.warn("LiveFeed realtime error:", err);
        // Clear error after a few seconds
        setTimeout(() => setRealtimeError(null), 5000);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
          </span>
          Live Feed
        </h3>
        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {formatCompactNumber(totalThrows ?? 0)} throws
        </span>
      </div>

      {/* Realtime connection status */}
      {realtimeError && (
        <div className="shrink-0 px-4 py-1.5 bg-yellow-50 border-b border-yellow-100">
          <p className="text-[10px] font-medium text-yellow-700 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />
            {realtimeError}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="flex gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-500 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">Loading throws...</span>
          </div>
        ) : throws.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center mb-3">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">No throws yet</p>
            <p className="text-xs text-gray-500 mt-1">Click a country and throw something!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {throws.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.25) }}
                className={`feed-entry flex gap-2.5 p-2 ${entry.reason ? "items-start" : "items-center"}`}
              >
                {/* Flag (or fallback initial avatar) */}
                {entry.thrower_flag ? (
                  <span
                    className="shrink-0 text-[28px] leading-none mr-0.5 select-none"
                    aria-hidden="true"
                  >
                    {entry.thrower_flag}
                  </span>
                ) : (
                  <span className="shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white text-[11px] font-bold flex items-center justify-center mr-0.5">
                    {entry.nickname.charAt(0).toUpperCase()}
                  </span>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug text-gray-800">
                    <span className="font-bold text-orange-500">{entry.nickname}</span>
                    <span className="mx-1.5 text-base leading-none">{entry.object}</span>
                    <span className="text-gray-300">→</span>
                    <span className="ml-1 font-semibold">{entry.country_name}</span>
                  </p>
                  {entry.reason && (
                    <p className="text-[10px] text-gray-500 italic mt-1 truncate">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className={`text-[9px] text-gray-400 font-medium shrink-0 ${entry.reason ? "mt-0.5" : ""}`}>
                  {formatRelativeTime(entry.created_at)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}