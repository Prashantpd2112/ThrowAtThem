"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useObjectStats } from "@/hooks/useObjectStats";
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

  const { objectStatsMap, fetchObjectStats } = useObjectStats();

  const [activeTab, setActiveTab] = useState<"countries" | "objects">("countries");
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const handlePeriodChange = useCallback(
    (period: TimePeriod) => {
      fetchLeaderboard(period);
      fetchObjectStats(period);
    },
    [fetchLeaderboard, fetchObjectStats]
  );

  const toggleExpand = useCallback((countryCode: string) => {
    setExpandedCountry((prev) => (prev === countryCode ? null : countryCode));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <span>🏆</span> Leaderboard
        </h3>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all duration-200 ${
                activePeriod === period.value
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Tabs */}
      <div className="shrink-0 flex gap-1.5 px-4 pt-3 pb-2">
        <button
          onClick={() => setActiveTab("countries")}
          className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
            activeTab === "countries"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 bg-gray-100"
          }`}
        >
          🇺🇳 Countries
        </button>
        <button
          onClick={() => setActiveTab("objects")}
          className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
            activeTab === "objects"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 bg-gray-100"
          }`}
        >
          🎯 Objects
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-500 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          </div>
        ) : activeTab === "countries" && countryLeaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center mb-2">
              <span className="text-xl">🏆</span>
            </div>
            <p className="text-xs font-semibold text-gray-800">No rankings yet</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Be the first to throw!</p>
          </div>
        ) : activeTab === "countries" ? (
          countryLeaderboard.map((entry, i) => {
            const stats = objectStatsMap[entry.country_code];
            const mostUsed = stats?.most_used_object;
            const isExpanded = expandedCountry === entry.country_code;

            return (
              <div key={entry.country_code}>
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="feed-entry flex items-center gap-2 p-2"
                >
                  <div className="w-6 flex items-center justify-center">
                    {i < 3 ? (
                      <span className="text-sm">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                    )}
                  </div>
                  <span className="text-base leading-none">{entry.flag}</span>
                  <span className="flex-1 text-[11px] font-semibold text-gray-800 truncate">
                    {entry.country_name}
                  </span>
                  <div className="flex items-center gap-1">
                    {mostUsed && (
                      <span className="text-sm leading-none" title={mostUsed.object_name}>
                        {mostUsed.object_emoji}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-orange-500">{entry.count}</span>
                    <span className="text-[9px] text-gray-400">throws</span>
                    <button
                      onClick={() => toggleExpand(entry.country_code)}
                      className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[10px] text-gray-400 leading-none"
                      >
                        ▼
                      </motion.span>
                    </button>
                  </div>
                </motion.div>

                {/* Expandable object breakdown */}
                <AnimatePresence initial={false}>
                  {isExpanded && stats && (
                    <motion.div
                      key={`expand-${entry.country_code}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pl-10 pr-3 pb-2 pt-1 space-y-0.5">
                        {stats.objects.map((obj) => (
                          <div
                            key={obj.object_id}
                            className="flex items-center gap-2 py-0.5"
                          >
                            <span className="text-sm w-5 text-center">{obj.object_emoji}</span>
                            <span className="flex-1 text-[10px] text-gray-600 capitalize">
                              {obj.object_name}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-800 tabular-nums">
                              {obj.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : objectLeaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center mb-2">
              <span className="text-xl">🎯</span>
            </div>
            <p className="text-xs font-semibold text-gray-800">No objects used yet</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Start throwing to see stats!</p>
          </div>
        ) : (
          objectLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.object}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="feed-entry flex items-center gap-2 p-2"
            >
              <div className="w-6 flex items-center justify-center">
                {i < 3 ? (
                  <span className="text-sm">{MEDALS[i]}</span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                )}
              </div>
              <span className="text-base leading-none">{entry.emoji}</span>
              <span className="flex-1 text-[11px] font-semibold text-gray-800 capitalize">
                {entry.object}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-orange-500">{entry.count}</span>
                <span className="text-[9px] text-gray-400">used</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}