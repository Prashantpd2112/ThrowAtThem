"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIndividualLeaderboard } from "@/hooks/useIndividualLeaderboard";
import type { TimePeriod, IndividualLeaderboardEntry } from "@/lib/types";

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "Week" },
  { value: "all_time", label: "All" },
];

// ── Helpers ──

function avatarPlaceholder(nickname: string): string {
  const emojis = ["👤", "🌟", "💫", "✨", "🎯", "🌈", "🔥", "💎", "⭐", "🪐"];
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return emojis[Math.abs(hash) % emojis.length];
}

function formatCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// ── Rank Display ──

function RankDisplay({ rank, transparent }: { rank: number; transparent: boolean }) {
  if (rank === 1) return <span className="text-xs leading-none shrink-0 w-6 text-center">🥇</span>;
  if (rank === 2) return <span className="text-xs leading-none shrink-0 w-6 text-center">🥈</span>;
  if (rank === 3) return <span className="text-xs leading-none shrink-0 w-6 text-center">🥉</span>;
  return (
    <span className={`text-[10px] font-semibold tabular-nums shrink-0 w-6 text-center ${
      transparent ? "text-white/40" : "text-gray-400"
    }`}>
      #{rank}
    </span>
  );
}

// ── Single Leaderboard Row ──

function LeaderboardRow({
  entry,
  rank,
  objectStats,
  reasons,
  transparent,
  expandedDropdown,
  onReasonClick,
  onThrowsClick,
}: {
  entry: IndividualLeaderboardEntry;
  rank: number;
  objectStats: { objects: { object_id: string; object_name: string; object_emoji: string; count: number }[]; total_throws: number } | null;
  reasons: Array<{ reason: string; created_at: string }> | null;
  transparent: boolean;
  expandedDropdown: { profileId: string; type: "reason" | "throws" } | null;
  onReasonClick: () => void;
  onThrowsClick: () => void;
}) {
  const isReasonOpen = expandedDropdown?.profileId === entry.profile_id && expandedDropdown?.type === "reason";
  const isThrowsOpen = expandedDropdown?.profileId === entry.profile_id && expandedDropdown?.type === "throws";
  const reasonCount = reasons?.length || 0;
  const hasObjects = objectStats && objectStats.objects.length > 0;
  const mostThrownEmoji = hasObjects ? objectStats.objects[0].object_emoji : "📦";

  return (
    <div>
      {/* ── Row ── */}
      <div
        className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-colors duration-150 ${
          transparent
            ? "hover:bg-white/[0.06]"
            : "hover:bg-gray-50"
        } ${isReasonOpen || isThrowsOpen ? (transparent ? "bg-white/[0.04]" : "bg-gray-50") : ""}`}
        style={{ minHeight: "60px" }}
      >
        {/* Rank */}
        <RankDisplay rank={rank} transparent={transparent} />

        {/* Avatar */}
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-500/20 ring-1 ring-white/10 flex items-center justify-center">
          {entry.profile_image ? (
            <img
              src={entry.profile_image}
              alt={entry.nickname}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs leading-none">{avatarPlaceholder(entry.nickname)}</span>
          )}
        </div>

        {/* Name + Profession */}
        <div className="flex-1 min-w-0 leading-tight">
          <div className={`text-xs font-semibold truncate ${
            transparent ? "text-white/90" : "text-gray-900"
          }`}>
            {entry.nickname}
          </div>
          {entry.profession && (
            <div className={`text-[10px] truncate leading-none mt-0.5 ${
              transparent ? "text-white/45" : "text-gray-500"
            }`}>
              {entry.profession}
            </div>
          )}
          {!entry.profession && entry.country && (
            <div className={`text-[9px] truncate leading-none mt-0.5 ${
              transparent ? "text-white/35" : "text-gray-400"
            }`}>
              {entry.country}
            </div>
          )}
        </div>

        {/* Reason Button — always visible */}
        <button
          onClick={(e) => { e.stopPropagation(); onReasonClick(); }}
          className={`shrink-0 inline-flex items-center justify-center gap-0.5 px-2 h-7 rounded-full text-[10px] font-semibold transition-all duration-150 ${
            isReasonOpen
              ? transparent
                ? "bg-orange-500/30 text-orange-200 ring-1 ring-orange-400/30"
                : "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
              : transparent
                ? "bg-white/15 text-white/80 hover:bg-white/20 hover:text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          }`}
          aria-label={reasonCount > 0 ? `${reasonCount} reasons` : "No reasons"}
        >
          <span className="text-base leading-none">💬</span>
          <span className="tabular-nums">{reasonCount}</span>
        </button>

        {/* Throws Button — always visible, shows most-thrown emoji + total count */}
        <button
          onClick={(e) => { e.stopPropagation(); onThrowsClick(); }}
          className={`shrink-0 inline-flex items-center justify-center gap-0.5 px-2 h-7 rounded-full text-[10px] font-semibold transition-all duration-150 ${
            isThrowsOpen
              ? transparent
                ? "bg-orange-500/30 text-orange-200 ring-1 ring-orange-400/30"
                : "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
              : transparent
                ? "bg-white/15 text-white/80 hover:bg-white/20 hover:text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          }`}
          aria-label={`${entry.count} total throws`}
        >
          <span className="text-base leading-none">{mostThrownEmoji}</span>
          <span className="tabular-nums">{formatCompact(entry.count)}</span>
        </button>
      </div>

      {/* ── Dropdown Content ── */}
      <AnimatePresence initial={false}>
        {isReasonOpen && reasonCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`ml-9 mr-2 mb-1.5 rounded-lg overflow-hidden ${
              transparent ? "bg-white/[0.04]" : "bg-gray-50 border border-gray-100"
            }`}>
              <div className="max-h-[160px] overflow-y-auto scrollbar-none py-1">
                {reasons!.map((r, i) => (
                  <div
                    key={i}
                    className={`px-2.5 py-1 text-[10px] leading-relaxed ${
                      transparent ? "text-white/70 border-b border-white/[0.04]" : "text-gray-600 border-b border-gray-100"
                    } ${i === reasons!.length - 1 ? "border-b-0" : ""}`}
                  >
                    <span className="text-[8px] font-medium opacity-50 mr-1">
                      {reasons!.length - i}.
                    </span>
                    {r.reason}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {isThrowsOpen && hasObjects && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`ml-9 mr-2 mb-1.5 rounded-lg overflow-hidden ${
              transparent ? "bg-white/[0.04]" : "bg-gray-50 border border-gray-100"
            }`}>
              <div className="max-h-[160px] overflow-y-auto scrollbar-none py-1">
                {objectStats!.objects.map((obj, i) => (
                  <div
                    key={obj.object_id}
                    className={`flex items-center justify-between px-2.5 py-1 ${
                      transparent ? "text-white/70 border-b border-white/[0.04]" : "text-gray-600 border-b border-gray-100"
                    } ${i === objectStats!.objects.length - 1 ? "border-b-0" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm leading-none shrink-0">{obj.object_emoji}</span>
                      <span className="text-[10px] font-medium truncate">{obj.object_name}</span>
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums shrink-0 ml-2 ${
                      transparent ? "text-white/80" : "text-gray-800"
                    }`}>
                      {obj.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Loading Skeleton ──

function LoadingSkeleton({ transparent }: { transparent: boolean }) {
  return (
    <div className="px-2 py-2 space-y-1">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-1.5 px-1.5 py-1.5">
          <div className={`w-6 h-4 rounded ${transparent ? "bg-white/[0.08]" : "bg-gray-200"}`} />
          <div className={`w-7 h-7 rounded-full ${transparent ? "bg-white/[0.08]" : "bg-gray-200"}`} />
          <div className="flex-1 space-y-1">
            <div className={`h-2.5 rounded w-24 ${transparent ? "bg-white/[0.08]" : "bg-gray-200"}`} />
            <div className={`h-2 rounded w-14 ${transparent ? "bg-white/[0.06]" : "bg-gray-100"}`} />
          </div>
          <div className={`h-5 rounded w-10 ${transparent ? "bg-white/[0.08]" : "bg-gray-200"}`} />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──

function EmptyState({ transparent }: { transparent: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
        transparent ? "bg-white/[0.06]" : "bg-orange-50"
      }`}>
        <span className="text-xl">🏆</span>
      </div>
      <p className={`text-xs font-semibold mb-1 ${transparent ? "text-white/80" : "text-gray-900"}`}>
        No throws yet
      </p>
      <p className={`text-[10px] max-w-[180px] ${transparent ? "text-white/35" : "text-gray-500"}`}>
        Select a profile and throw something fun their way!
      </p>
    </div>
  );
}

// ── Main Leaderboard Component ──

export function Leaderboard({ transparent }: { transparent?: boolean } = {}) {
  const {
    individualLeaderboard,
    objectStatsMap,
    reasonsMap,
    isLoading,
    activePeriod,
    fetchData,
  } = useIndividualLeaderboard();

  const [expandedDropdown, setExpandedDropdown] = useState<{ profileId: string; type: "reason" | "throws" } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top when period changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activePeriod]);

  const handlePeriod = useCallback((p: TimePeriod) => {
    fetchData(p);
  }, [fetchData]);

  // Open Reason dropdown — closes Throws and other profiles
  const openReason = useCallback((profileId: string) => {
    setExpandedDropdown((prev) => {
      if (prev?.profileId === profileId && prev?.type === "reason") return null;
      return { profileId, type: "reason" };
    });
  }, []);

  // Open Throws dropdown — closes Reason and other profiles
  const openThrows = useCallback((profileId: string) => {
    setExpandedDropdown((prev) => {
      if (prev?.profileId === profileId && prev?.type === "throws") return null;
      return { profileId, type: "throws" };
    });
  }, []);

  // Memoize the sorted entries
  const displayedEntries = useMemo(() => {
    return individualLeaderboard.slice(0, 50);
  }, [individualLeaderboard]);

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl ${
      transparent
        ? ""
        : "bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
    }`}>
      {/* ── Compact Header ── */}
      <div className={`shrink-0 flex items-center justify-between px-3 py-2 ${
        transparent ? "" : "border-b border-gray-100"
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">🏆</span>
          <h3 className={`text-[10px] font-bold tracking-wide ${
            transparent ? "text-white/80" : "text-gray-800"
          }`}>
            LEADERBOARD
          </h3>
        </div>

        {/* Period Pills */}
        <div className={`flex gap-0.5 rounded-md p-0.5 ${
          transparent ? "bg-white/[0.06]" : "bg-gray-100"
        }`}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriod(p.value)}
              className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all duration-150 ${
                activePeriod === p.value
                  ? transparent
                    ? "bg-orange-500/30 text-orange-300"
                    : "bg-white text-gray-900 shadow-sm"
                  : transparent
                    ? "text-white/40 hover:text-white/70"
                    : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable List ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-none"
      >
        {isLoading ? (
          <LoadingSkeleton transparent={!!transparent} />
        ) : displayedEntries.length === 0 ? (
          <EmptyState transparent={!!transparent} />
        ) : (
          <div className="px-1 py-1 space-y-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayedEntries.map((entry, i) => {
                const rank = i + 1;
                const stats = objectStatsMap[entry.profile_id] || null;
                const reasons = reasonsMap[entry.profile_id] || null;
                return (
                  <motion.div
                    key={entry.profile_id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <LeaderboardRow
                      entry={entry}
                      rank={rank}
                      objectStats={stats}
                      reasons={reasons}
                      transparent={!!transparent}
                      expandedDropdown={expandedDropdown}
                      onReasonClick={() => openReason(entry.profile_id)}
                      onThrowsClick={() => openThrows(entry.profile_id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {displayedEntries.length > 0 && (
        <div className={`shrink-0 text-center border-t py-1.5 ${
          transparent ? "border-white/[0.06] text-white/25" : "border-gray-100 text-gray-400"
        }`}>
          <span className="text-[8px] font-medium">
            {displayedEntries.length} profile{displayedEntries.length !== 1 ? "s" : ""} ranked
          </span>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
