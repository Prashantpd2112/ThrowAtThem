"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useObjectStats } from "@/hooks/useObjectStats";
import { useReasons } from "@/hooks/useReasons";
import { useReasonCounts } from "@/hooks/useReasonCounts";
import { TimePeriod } from "@/lib/types";

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "Week" },
  { value: "all_time", label: "All" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function ReasonsPanel({ countryCode }: { countryCode: string }) {
  const { reasons, isLoading } = useReasons(countryCode);

  return (
    <div className="pl-10 pr-3 pb-2 pt-1">
      <div
        className="bg-gray-50 rounded-lg border border-gray-100 p-1.5 space-y-1 overflow-y-auto"
        style={{ maxHeight: "96px" }}
      >
        {isLoading ? (
          <div className="text-center py-2">
            <p className="text-[10px] text-gray-400 max-md:text-white/40">Loading...</p>
          </div>
        ) : reasons.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-[10px] text-gray-400 max-md:text-white/40">No reasons yet</p>
          </div>
        ) : (
          reasons.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1.5 p-1 bg-white rounded-md border border-gray-50"
            >
              <span className="text-sm leading-none shrink-0">{r.object_emoji}</span>
              <span className="flex-1 text-[10px] text-gray-700 truncate" title={r.reason}>
                {r.reason}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Leaderboard() {
  const {
    countryLeaderboard,
    objectLeaderboard,
    isLoading: isLeaderboardLoading,
    activePeriod,
    fetchLeaderboard,
    refreshLeaderboard,
  } = useLeaderboard();

  const { objectStatsMap, isLoading: isObjectStatsLoading, fetchObjectStats } = useObjectStats();

  // Stable list of country codes currently visible in the leaderboard
  const countryCodes = useMemo(
    () => countryLeaderboard.map((c) => c.country_code),
    [countryLeaderboard]
  );

  const { counts: reasonCounts, refetch: refetchReasonCounts } = useReasonCounts(
    activePeriod,
    countryCodes
  );

  const [activeTab, setActiveTab] = useState<"countries" | "objects">("countries");

  // Single source of truth for the expanded dropdown across the entire leaderboard.
  // Only ONE dropdown can be open at a time. Storing both the country and the type
  // guarantees mutual exclusivity: opening a new one automatically closes the old one.
  const [expanded, setExpanded] = useState<{
    countryCode: string;
    type: "objects" | "reasons";
  } | null>(null);

  // Manual refresh state for the refresh button
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePeriodChange = useCallback(
    (period: TimePeriod) => {
      // Collapse any open dropdown so it doesn't linger on stale data.
      setExpanded(null);
      fetchLeaderboard(period);
      fetchObjectStats(period);
    },
    [fetchLeaderboard, fetchObjectStats]
  );

  const handleTabChange = useCallback((tab: "countries" | "objects") => {
    setActiveTab(tab);
    // Switching tabs closes any open dropdown.
    setExpanded(null);
  }, []);

  const toggleObject = useCallback((countryCode: string) => {
    setExpanded((prev) =>
      prev && prev.countryCode === countryCode && prev.type === "objects"
        ? null
        : { countryCode, type: "objects" }
    );
  }, []);

  const toggleReason = useCallback((countryCode: string) => {
    setExpanded((prev) =>
      prev && prev.countryCode === countryCode && prev.type === "reasons"
        ? null
        : { countryCode, type: "reasons" }
    );
  }, []);

  // Manual refresh handler — fetches the latest data from Supabase for the
  // currently active period. Disabled while a refresh is already running to
  // avoid duplicate requests. On failure, keeps existing data and shows a
  // small non-intrusive error toast.
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Fire all four fetches in parallel; each updates its own piece of state.
      // If any one fails we surface the error but the others have still
      // completed and updated their respective slices.
      const results = await Promise.allSettled([
        refreshLeaderboard(activePeriod),
        fetchObjectStats(activePeriod),
        refetchReasonCounts(),
      ]);

      const firstError = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;

      if (firstError) {
        const message =
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Failed to refresh leaderboard";
        setErrorToast(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setErrorToast(null), 3000);
      }
    } catch (err) {
      // Defensive: Promise.allSettled should never reject, but guard anyway.
      const message =
        err instanceof Error ? err.message : "Failed to refresh leaderboard";
      setErrorToast(message);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshLeaderboard, fetchObjectStats, refetchReasonCounts, activePeriod]);

  // Use the manual refresh indicator (spinner) when the user has clicked the
  // button; fall back to the loading state for the initial fetch / period change.
  const showSpinner = isRefreshing || isLeaderboardLoading || isObjectStatsLoading;

  return (
    <div className="relative bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-gray-100 max-md:border-b-white/10">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 max-md:text-white/90">
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
                    : "text-gray-500 hover:text-gray-800 max-md:text-white/60 max-md:hover:text-white/90"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
      </div>

      {/* Type Tabs + manual refresh */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => handleTabChange("countries")}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
              activeTab === "countries"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 bg-gray-100 max-md:text-white/60 max-md:bg-white/10 max-md:hover:text-white/90"
            }`}
          >
            🇺🇳 Countries
          </button>
          <button
            onClick={() => handleTabChange("objects")}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
              activeTab === "objects"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 bg-gray-100 max-md:text-white/60 max-md:bg-white/10 max-md:hover:text-white/90"
            }`}
          >
            🎯 Objects
          </button>
        </div>
        {/* Manual refresh toolbar icon — far right of the Countries/Objects row.
            No button background: icon only, subtle hover, spins while
            refreshing, disabled while a refresh is in flight. */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh leaderboard"
          title="Refresh leaderboard"
          className={`p-0 m-0 bg-transparent border-0 text-gray-400 transition-colors duration-200 hover:text-gray-700 max-md:text-white/50 max-md:hover:text-white/80 ${
            isRefreshing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <motion.span
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isRefreshing
                ? { repeat: Infinity, duration: 0.9, ease: "linear" }
                : { duration: 0 }
            }
            className="inline-flex items-center justify-center leading-none"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* 3/4 circular arc, clockwise, with a triangle arrowhead at the end */}
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </motion.span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {showSpinner && countryLeaderboard.length === 0 && objectLeaderboard.length === 0 ? (
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
            <p className="text-xs font-semibold text-gray-800 max-md:text-white/85">No rankings yet</p>
            <p className="text-[10px] text-gray-500 mt-0.5 max-md:text-white/50">Be the first to throw!</p>
          </div>
        ) : activeTab === "countries" ? (
          countryLeaderboard.map((entry, i) => {
            const stats = objectStatsMap[entry.country_code];
            const mostUsed = stats?.most_used_object;
            const isObjectOpen =
              expanded?.countryCode === entry.country_code && expanded.type === "objects";
            const isReasonOpen =
              expanded?.countryCode === entry.country_code && expanded.type === "reasons";
            const reasonCount = reasonCounts[entry.country_code] || 0;

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
                      <span className="text-[10px] font-bold text-gray-400 max-md:text-white/50">#{i + 1}</span>
                    )}
                  </div>
                  <span className="text-base leading-none">{entry.flag}</span>
                  <span className="flex-1 text-[11px] font-semibold text-gray-800 truncate max-md:text-white/85">
                    {entry.country_name}
                  </span>

                  {/* Object dropdown trigger: 🍅 55 throws ▼ */}
            <button
              onClick={() => toggleObject(entry.country_code)}
              className="flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md hover:bg-gray-100 transition-colors max-md:hover:bg-white/10"
                    aria-label={isObjectOpen ? "Hide object breakdown" : "Show object breakdown"}
                  >
                    {mostUsed && (
                      <span className="text-sm leading-none" title={mostUsed.object_name}>
                        {mostUsed.object_emoji}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-orange-500 tabular-nums">
                      {entry.count}
                    </span>
                    <motion.span
                      animate={{ rotate: isObjectOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[9px] text-gray-400 leading-none"
                    >
                      ▼
                    </motion.span>
                  </button>

                  {/* Reason dropdown trigger: Reasons 3 ▼ */}
                  <button
                    onClick={() => toggleReason(entry.country_code)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors max-md:bg-white/10 max-md:border-white/10 max-md:hover:bg-white/15"
                    aria-label={isReasonOpen ? "Hide reasons" : "Show reasons"}
                  >
                    <span className="text-[9px] font-semibold text-gray-500 max-md:text-white/60">
                      {reasonCount === 1 ? "Reason" : "Reasons"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-700 tabular-nums max-md:text-white/80">
                      {reasonCount}
                    </span>
                    <motion.span
                      animate={{ rotate: isReasonOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[9px] text-gray-400 leading-none"
                    >
                      ▼
                    </motion.span>
                  </button>
                </motion.div>

                {/* Object breakdown dropdown */}
                <AnimatePresence initial={false}>
                  {isObjectOpen && stats && (
                    <motion.div
                      key={`objects-${entry.country_code}`}
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
                            <span className="flex-1 text-[10px] text-gray-600 capitalize max-md:text-white/60">
                              {obj.object_name}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-800 tabular-nums max-md:text-white/80">
                              {obj.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reasons dropdown */}
                <AnimatePresence initial={false}>
                  {isReasonOpen && (
                    <motion.div
                      key={`reasons-${entry.country_code}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <ReasonsPanel countryCode={entry.country_code} />
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
            <p className="text-xs font-semibold text-gray-800 max-md:text-white/85">No objects used yet</p>
            <p className="text-[10px] text-gray-500 mt-0.5 max-md:text-white/50">Start throwing to see stats!</p>
          </div>
        ) : (
          objectLeaderboard.map((entry, i) => (
            <motion.div
              key={`${entry.object}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="feed-entry flex items-center gap-2 p-2"
            >
              <div className="w-6 flex items-center justify-center">
                {i < 3 ? (
                  <span className="text-sm">{MEDALS[i]}</span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 max-md:text-white/50">#{i + 1}</span>
                )}
              </div>
              <span className="text-base leading-none">{entry.emoji}</span>                  <span className="flex-1 text-[11px] font-semibold text-gray-800 capitalize max-md:text-white/85">
                {entry.object}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-orange-500">{entry.count}</span>
                <span className="text-[9px] text-gray-400 max-md:text-white/50">used</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Non-intrusive error toast for failed refresh attempts.
          Sits in the bottom-right of the leaderboard card and auto-dismisses. */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            key="leaderboard-error-toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            className="absolute bottom-2 right-2 z-10 max-w-[80%] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 shadow-sm"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[10px] font-semibold truncate">
              {errorToast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}