"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TimePeriod } from "@/lib/types";

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "Week" },
  { value: "all_time", label: "All" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const {
    countryLeaderboard,
    objectLeaderboard,
    isLoading,
    activePeriod,
    fetchLeaderboard,
  } = useLeaderboard();

  const [activeTab, setActiveTab] = useState<"countries" | "objects">("countries");

  useEffect(() => {
    fetchLeaderboard(activePeriod);
  }, [activePeriod, fetchLeaderboard]);

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-wt-border dark:border-white/5">
        <h3 className="text-xs font-bold text-wt-text dark:text-white">🏆 Leaderboard</h3>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => fetchLeaderboard(period.value)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                activePeriod === period.value
                  ? "bg-white dark:bg-white/10 text-wt-orange shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-wt-text dark:hover:text-gray-200"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 px-3 pt-2 pb-1">
        <button
          onClick={() => setActiveTab("countries")}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
            activeTab === "countries"
              ? "bg-wt-orange text-white"
              : "text-wt-muted hover:text-wt-text dark:hover:text-gray-300 bg-gray-100 dark:bg-white/5"
          }`}
        >
          Countries
        </button>
        <button
          onClick={() => setActiveTab("objects")}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
            activeTab === "objects"
              ? "bg-wt-orange text-white"
              : "text-wt-muted hover:text-wt-text dark:hover:text-gray-300 bg-gray-100 dark:bg-white/5"
          }`}
        >
          Objects
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-6">
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
        ) : activeTab === "countries" && countryLeaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-xs text-wt-muted">No data yet</p>
          </div>
        ) : activeTab === "countries" ? (
          countryLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.country_code}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              <span className="w-4 text-center text-[10px] font-bold text-wt-muted">
                {i < 3 ? MEDALS[i] : `#${i + 1}`}
              </span>
              <span className="text-sm">{entry.flag}</span>
              <span className="flex-1 text-[11px] font-medium text-wt-text dark:text-gray-200 truncate">
                {entry.country_name}
              </span>
              <span className="text-[11px] font-bold text-wt-orange">{entry.count}</span>
            </motion.div>
          ))
        ) : objectLeaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-xs text-wt-muted">No data yet</p>
          </div>
        ) : (
          objectLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.object}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              <span className="w-4 text-center text-[10px] font-bold text-wt-muted">
                {i < 3 ? MEDALS[i] : `#${i + 1}`}
              </span>
              <span className="text-sm">{entry.emoji}</span>
              <span className="flex-1 text-[11px] font-medium text-wt-text dark:text-gray-200">
                {entry.object}
              </span>
              <span className="text-[11px] font-bold text-wt-orange">{entry.count}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
