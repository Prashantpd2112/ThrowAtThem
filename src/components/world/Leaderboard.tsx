"use client";

import { useState } from "react";
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
              onClick={() => fetchLeaderboard(period.value)}
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
          countryLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.country_code}
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
                <span className="text-[11px] font-bold text-orange-500">{entry.count}</span>
                <span className="text-[9px] text-gray-400">throws</span>
              </div>
            </motion.div>
          ))
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
