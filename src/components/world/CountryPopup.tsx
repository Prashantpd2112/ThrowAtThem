"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";
import { getCountryStats } from "@/lib/supabase";
import { CountryStats } from "@/lib/types";

interface CountryPopupProps {
  countryCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function CountryPopup({ countryCode, isOpen, onClose }: CountryPopupProps) {
  const [stats, setStats] = useState<CountryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const country = countryCode ? getCountryByCode(countryCode) : null;

  useEffect(() => {
    if (countryCode && isOpen) {
      setIsLoading(true);
      getCountryStats(countryCode)
        .then((data) => setStats(data as unknown as CountryStats))
        .catch(() => {
          setStats(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setStats(null);
    }
  }, [countryCode, isOpen]);

  if (!country) return null;

  const mostUsedObj = stats?.most_used_object?.object
    ? getObjectById(stats.most_used_object.object)
    : null;

  const activityColors = {
    low: "#4CAF50",
    medium: "#FF9800",
    high: "#FF5722",
    very_high: "#f44336",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-5xl block mb-2">{country.flag}</span>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
            {country.name}
          </h2>
          <span className="text-xs text-gray-400">{countryCode}</span>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-wt-orange rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        ) : stats ? (
          <div className="mt-6 space-y-5">
            {/* Activity Level */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" 
                 style={{ backgroundColor: `${activityColors[stats.activity_level]}15` }}>
              <span className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: activityColors[stats.activity_level] }} />
              <span className="text-sm font-semibold capitalize" 
                    style={{ color: activityColors[stats.activity_level] }}>
                {stats.activity_level.replace("_", " ")} activity
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-wt-orange">{stats.total_throws}</p>
                <p className="text-xs text-gray-500">Total Throws</p>
              </div>
              <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-wt-blue">{stats.weekly_count}</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </div>

            {/* Most Used Object */}
            {mostUsedObj && (
              <div className="bg-gradient-to-r from-wt-orange/5 to-wt-pink/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2 font-semibold">Most Used Object</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">{mostUsedObj.emoji}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{mostUsedObj.name}</span>
                  <span className="text-sm text-gray-400">({stats.most_used_object.count}x)</span>
                </div>
              </div>
            )}

            {/* Stats Bars */}
            <div className="space-y-2">
              <StatBar
                label="Daily"
                value={stats.daily_count}
                max={stats.weekly_count || 1}
                color="#FF9800"
              />
              <StatBar
                label="Weekly"
                value={stats.weekly_count}
                max={stats.total_throws || 1}
                color="#4A90D9"
              />
            </div>

            {/* Recent Reasons */}
            {stats.recent_reasons.filter((r) => r.reason).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2 text-left">Recent Reasons</p>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {stats.recent_reasons
                    .filter((r) => r.reason)
                    .slice(0, 5)
                    .map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5">
                        <span className="font-semibold text-wt-orange">{r.nickname}</span>
                        <span className="text-gray-400">said</span>
                        <span className="italic">&ldquo;{r.reason}&rdquo;</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 py-4">
            <p className="text-gray-400 text-sm">No statistics available yet.</p>
            <p className="text-2xl mt-2">💫</p>
            <p className="text-xs text-gray-400 mt-2">Be the first to throw something!</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
