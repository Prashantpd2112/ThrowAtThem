"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useIndividualLeaderboard } from "@/hooks/useIndividualLeaderboard";
import type { TimePeriod } from "@/lib/types";

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "Week" },
  { value: "all_time", label: "All" },
];

export function Leaderboard({ transparent }: { transparent?: boolean } = {}) {
  const { countryLeaderboard, isLoading: isCountryLoading, activePeriod, fetchLeaderboard } = useLeaderboard();
  const { individualLeaderboard, isLoading: isIndividualLoading, fetchData: fetchIndividual } = useIndividualLeaderboard();
  const [activeTab, setActiveTab] = useState<"countries" | "individuals">("individuals");

  const loading = isCountryLoading || isIndividualLoading;

  const handlePeriod = useCallback((p: TimePeriod) => {
    fetchLeaderboard(p);
    fetchIndividual(p);
  }, [fetchLeaderboard, fetchIndividual]);

  return (
    <div className={`relative ${transparent ? "" : "bg-white rounded-2xl border border-[#E5E7EB]"} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className={`text-xs font-bold ${transparent ? "text-white" : "text-gray-800"}`}>🏆 Leaderboard</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => handlePeriod(p.value)} className={`text-[10px] px-2 py-1 rounded-md ${transparent ? "text-white/80" : "text-gray-600 bg-gray-100"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab("individuals")} className={`px-3 py-1 rounded-md text-[10px] font-semibold ${activeTab === "individuals" ? "bg-orange-500 text-white" : transparent ? "bg-transparent text-white/60" : "bg-transparent text-gray-500"}`}>
            Individuals
          </button>
          <button onClick={() => setActiveTab("countries")} className={`px-3 py-1 rounded-md text-[10px] font-semibold ${activeTab === "countries" ? "bg-orange-500 text-white" : transparent ? "bg-transparent text-white/60" : "bg-transparent text-gray-500"}`}>
            Countries
          </button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className={`py-4 text-center text-sm ${transparent ? "text-white/60" : "text-gray-500"}`}>Loading…</div>
          ) : activeTab === "individuals" ? (
            individualLeaderboard.slice(0, 20).map((p, i) => (
              <div key={p.profile_id} className={`flex items-center gap-2 p-2 rounded-md ${transparent ? "hover:bg-white/10" : "hover:bg-black/5"} ${transparent ? "text-white" : ""}`}>
                <div className="w-6 text-sm">{i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}</div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">{p.profile_image ? <img src={p.profile_image} alt={p.nickname} className="w-full h-full object-cover" /> : '👤'}</div>
                <div className="flex-1 text-sm font-semibold">{p.nickname}</div>
                <div className={`text-sm font-bold tabular-nums ${transparent ? "text-orange-400" : "text-orange-500"}`}>{p.count}</div>
              </div>
            ))
          ) : (
            countryLeaderboard.slice(0, 20).map((c, i) => (
              <div key={c.country_code} className={`flex items-center gap-2 p-2 rounded-md ${transparent ? "hover:bg-white/10" : "hover:bg-black/5"} ${transparent ? "text-white" : ""}`}>
                <div className="w-6 text-sm">{i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}</div>
                <div className="w-6 text-lg">{c.flag}</div>
                <div className="flex-1 text-sm font-semibold">{c.country_name}</div>
                <div className={`text-sm font-bold tabular-nums ${transparent ? "text-orange-400" : "text-orange-500"}`}>{c.count}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
