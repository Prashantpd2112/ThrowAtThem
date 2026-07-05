"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThrowEntry } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { supabase, DbThrow } from "@/lib/supabase";
import { getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";

export function LiveFeed() {
  const [throws, setThrows] = useState<ThrowEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentThrows();
    const interval = setInterval(fetchRecentThrows, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentThrows = async () => {
    try {
      const { data, error } = await supabase
        .from("throws")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;

      const enriched = (data as DbThrow[]).map((t) => {
        const country = getCountryByCode(t.target_country);
        const obj = getObjectById(t.object);
        return {
          id: t.id,
          guest_id: t.guest_id,
          nickname: t.nickname,
          thrower_country: t.thrower_country,
          target_country: t.target_country,
          country_name: country?.name || t.target_country,
          object: obj?.emoji || "❓",
          reason: t.reason,
          created_at: t.created_at,
        };
      });
      setThrows(enriched);
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-wt-border dark:border-white/5">
        <h3 className="text-xs font-bold text-wt-text dark:text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Live Feed
        </h3>
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
          {throws.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-wt-orange rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          </div>
        ) : throws.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">No throws yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Be the first! 🎯</p>
          </div>
        ) : (
          <AnimatePresence>
            {throws.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-wt-blue to-wt-purple flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {entry.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-wt-text dark:text-gray-200 leading-snug">
                    <span className="font-semibold text-wt-orange">{entry.nickname}</span>
                    {" "}{entry.object}{" "}
                    <span className="text-wt-muted font-medium">→</span>{" "}
                    <span className="font-medium text-wt-blue">{entry.country_name}</span>
                  </p>
                  {entry.reason && (
                    <p className="text-[10px] text-wt-muted mt-px italic truncate">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                </div>
                <span className="text-[9px] text-wt-muted/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
