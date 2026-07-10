"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRecentThrows, subscribeToThrows, supabase } from "@/lib/supabase";
import { getObjectById } from "@/data/objects";
import { getFlagEmoji } from "@/hooks/useProfiles";

// ── Types ──
interface LiveEvent {
  id: string;
  nickname: string;
  object: string;
  targetName: string;
  reason: string;
  throwerCountry: string;
}

// ── Profile name cache ──
const profileNameCache = new Map<string, string>();

async function resolveProfileNames(profileIds: string[]): Promise<void> {
  const uncached = profileIds.filter((id) => !profileNameCache.has(id));
  if (uncached.length === 0) return;
  try {
    const { data, error } = await supabase
      .from("individual_profiles")
      .select("id, nickname")
      .in("id", uncached);
    if (error || !data) return;
    for (const profile of data) {
      profileNameCache.set(profile.id, profile.nickname);
    }
  } catch {
    // silently handle
  }
}

function getCachedProfileName(profileId: string): string | null {
  return profileNameCache.get(profileId) || null;
}

// Keep latest 100 events in memory for backward scrolling
const MAX_EVENTS = 100;

// ── Opacity ──
// In auto-live mode, the newest messages are at 100% and fade progressively
// toward the top. In user-scroll mode, every message is fully opaque.
function messageOpacity(index: number, total: number, autoMode: boolean): number {
  if (!autoMode) return 1;
  if (total <= 1) return 1;
  const fromBottom = total - 1 - index; // 0 = oldest (top)
  // Gradient over the last ~10 positions — matches ~1 viewport height
  const steps = [1.0, 0.95, 0.90, 0.80, 0.70, 0.55, 0.40, 0.22, 0.10, 0.0];
  if (fromBottom >= steps.length) return 0;
  return steps[fromBottom];
}

// ── Component ──
export function LiveFeedOverlay({
  isOpen,
  disabled,
}: {
  isOpen: boolean;
  disabled?: boolean;
}) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(true);        // live vs scroll
  const [newThrowCount, setNewThrowCount] = useState(0);  // counter for "N new" badge
  const scrollRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const autoModeRef = useRef(true);   // mirrored for use in onScroll without re-render
  const newCountRef = useRef(0);

  // ── Detect user scroll ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 40;
    if (nearBottom) {
      // User returned to the live position — resume auto mode
      if (!autoModeRef.current) {
        autoModeRef.current = true;
        setAutoMode(true);
        setNewThrowCount(0);
        newCountRef.current = 0;
      }
    } else {
      // User scrolled away from the bottom — pause auto mode
      if (autoModeRef.current) {
        autoModeRef.current = false;
        setAutoMode(false);
      }
    }
  }, []);

  // ── Subscribe once on mount ──
  useEffect(() => {
    if (disabled) {
      setIsLoading(false);
      return;
    }

    fetchRecentThrows(MAX_EVENTS)
      .then(async (data) => {
        const profileIds = data
          .map((t) => t.target_profile_id)
          .filter((id): id is string => id !== null);
        if (profileIds.length > 0) {
          await resolveProfileNames(profileIds);
        }
        const loaded = data.map((t) => ({
          id: t.id,
          nickname: t.nickname,
          object: getObjectById(t.object).emoji,
          targetName: t.target_profile_id
            ? getCachedProfileName(t.target_profile_id) || t.target_profile_id.substring(0, 8)
            : "someone",
          reason: t.reason,
          throwerCountry: t.thrower_country,
        }));
        setEvents(loaded.reverse());
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    unsubRef.current = subscribeToThrows(
      async (newThrow) => {
        if (newThrow.target_profile_id) {
          await resolveProfileNames([newThrow.target_profile_id]);
        }
        const entry: LiveEvent = {
          id: newThrow.id,
          nickname: newThrow.nickname,
          object: getObjectById(newThrow.object).emoji,
          targetName: newThrow.target_profile_id
            ? getCachedProfileName(newThrow.target_profile_id) || newThrow.target_profile_id.substring(0, 8)
            : "someone",
          reason: newThrow.reason,
          throwerCountry: newThrow.thrower_country,
        };
        setEvents((prev) => {
          const next = [...prev, entry];
          // Keep only the last MAX_EVENTS
          if (next.length > MAX_EVENTS) return next.slice(next.length - MAX_EVENTS);
          return next;
        });

        // If user is browsing history, bump the counter
        if (!autoModeRef.current) {
          newCountRef.current += 1;
          setNewThrowCount(newCountRef.current);
        }
      },
      () => {}
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, [disabled]);

  // ── Auto-scroll in live mode ──
  useEffect(() => {
    if (!isOpen || !scrollRef.current || !autoMode) return;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, [events.length, isOpen, autoMode]);

  // ── Reset state when feed opens/closes ──
  useEffect(() => {
    if (isOpen) {
      setAutoMode(true);
      autoModeRef.current = true;
      setNewThrowCount(0);
      newCountRef.current = 0;
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="live-overlay"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
        >
          {/* Scrollable feed — stops above the Live button area so button stays clickable */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="absolute left-0 right-0 top-0 bottom-12 overflow-y-auto overflow-x-hidden scrollbar-none px-4 pt-2 pointer-events-auto"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-green-500/60 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-white/20">Waiting for activity...</p>
              </div>
            ) : (
              <div className="min-h-full">
                <AnimatePresence mode="popLayout" initial={false}>
                  {events.map((evt, i) => {
                    const op = messageOpacity(i, events.length, autoMode);
                    return (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: op, x: 0 }}
                        exit={{ opacity: 0, x: 8, transition: { duration: 0.3 } }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex items-start gap-2 pb-0 mb-3"
                        style={{ opacity: op }}
                      >
                        {/* Country flag */}
                        <span className="shrink-0 text-lg leading-none mt-0.5 w-6 text-center">
                          {evt.throwerCountry ? getFlagEmoji(evt.throwerCountry) : ""}
                        </span>

                        {/* Text column — reason indents under the username */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-snug text-white">
                            <span className="font-bold">{evt.nickname}</span>
                            <span className="mx-1 text-base leading-none">{evt.object}</span>
                            <span className="text-white/30 mx-1">→</span>
                            <span className="font-semibold text-white/80">{evt.targetName}</span>
                          </p>
                          {evt.reason && (
                            <p className="text-[11px] leading-snug text-white/45 mt-1">
                              {evt.reason}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── "N New" badge — appears when user is browsing history ── */}
          <div className="pointer-events-auto">
          <AnimatePresence>
            {!autoMode && newThrowCount > 0 && (
              <motion.button
                key="new-throw-badge"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  // Scroll to bottom and resume live mode
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      top: scrollRef.current.scrollHeight,
                      behavior: "smooth",
                    });
                  }
                }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 h-7 px-3 rounded-full bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 text-[11px] font-semibold shadow-lg hover:bg-green-500/30 transition-colors cursor-pointer"
              >
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
                </span>
                {newThrowCount} New Throw{newThrowCount !== 1 ? "s" : ""}
              </motion.button>
            )}
          </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}