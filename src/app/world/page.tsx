"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Navigation } from "@/components/world/Navigation";
import { WorldMap } from "@/components/world/WorldMap";
import { LiveFeed } from "@/components/world/LiveFeed";
import { Leaderboard } from "@/components/world/Leaderboard";
import { CountryPopup } from "@/components/world/CountryPopup";
import { ThrowAnimation, triggerThrowAnimation } from "@/components/world/ThrowAnimation";
import { useGuest } from "@/hooks/useGuest";
import { useThrows } from "@/hooks/useThrows";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import { THROWABLE_OBJECTS, getObjectById } from "@/data/objects";
import {
  fetchHeatData,
  upsertPresence,
  removePresence,
  fetchOnlineUsers,
  subscribeToThrows,
  subscribeToPresence,
  isSupabaseConfigured,
  ensureGuestExists,
} from "@/lib/supabase";
import type { ThrowableObject } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
// DockObjectPicker — REAL macOS Dock-style object selector.
//
// Implementation notes:
// • Each button has a FIXED size; only the inner emoji's `scale`
//   and `fontSize` change. This means the Throw Panel, input box,
//   throw button, divider and spacing NEVER move.
// • We use a single `mouseX` motion value updated in the mouse
//   handler with no React state. Each item subscribes via
//   `useTransform` and pipes the result through `useSpring`, so
//   magnification follows the cursor continuously and feels
//   exactly like the macOS Dock — smooth, spring-based, no
//   per-pointer-move React re-renders, no jitter.
// • The selected object shows a small gray indicator dot under
//   the emoji (the macOS Dock "open app" indicator). There is no
//   background, no border, no shadow, no gradient anywhere.
// ──────────────────────────────────────────────────────────────

type DockObjectPickerProps = {
  objects: ThrowableObject[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const ITEM_SIZE = 44;        // px — fixed hit-target / button frame (keeps layout stable)
const BASE_EMOJI = 33;       // px — base emoji size (slightly smaller so tall emojis fit)
const PEAK_EMOJI = 49;       // px — peak emoji size at the cursor (still fits in item frame)
const DOT_SIZE = 8;          // px — selected indicator dot
const DOT_GAP = 12;          // px — extra vertical room for the dot (used in container height calc)
const RANGE_PX = 110;        // px — how far the magnification wave reaches either side

// Single item, self-contained, no parent re-renders.
function DockItem({
  obj,
  mouseX,
  selected,
  onClick,
}: {
  obj: ThrowableObject;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  selected: boolean;
  onClick: () => void;
}) {
  // Ref so the transform can read the item's center without re-rendering
  // (set imperatively by the parent after layout / on resize).
  const ref = useRef<HTMLButtonElement>(null);

  // distance in px (signed) from the cursor to this item's center
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return 0;
    // We need the cursor in the same coordinate space as the bounds rect;
    // mouseX is already in viewport coordinates (we'll set it that way).
    return val - (bounds.x + bounds.width / 2);
  });

  // Magnification: 1.0 at and beyond RANGE_PX, peaks at 0px distance.
  // Smooth cosine-style falloff so neighbours become slightly larger
  // and the wave feels natural.
  const widthSync = useTransform(distance, [-RANGE_PX, 0, RANGE_PX], [
    BASE_EMOJI,
    PEAK_EMOJI,
    BASE_EMOJI,
  ]);

  // Spring so the scale follows the mouse smoothly, never jitters,
  // and never causes layout shifts.
  const syncFontSize = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      title={obj.name}
      type="button"
      style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
      className="relative flex items-center justify-center bg-transparent border-0 outline-none p-0 shrink-0 cursor-pointer"
    >
      <motion.span
        aria-hidden
        className="leading-none select-none inline-block"
        style={{
          fontSize: syncFontSize,
          lineHeight: 1,
        }}
      >
        {obj.emoji}
      </motion.span>
      {selected && (
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            left: "50%",
            bottom: -10,
            transform: "translateX(-50%)",
            backgroundColor: "#333333",
          }}
        />
      )}
    </button>
  );
}

// Edge chevron used on BOTH sides of the picker. Fades in when there
// is hidden content on that side. Clicking it smoothly scrolls the
// picker ~3–4 items in the indicated direction. Manual scrolling
// (trackpad, Shift+wheel, drag) is unaffected.
function ScrollIndicator({
  visible,
  direction,
  onClick,
}: {
  visible: boolean;
  direction: "left" | "right";
  onClick?: () => void;
}) {
  const isLeft = direction === "left";
  return (
    <motion.button
      type="button"
      aria-label={isLeft ? "Scroll objects to the left" : "Scroll objects to the right"}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClick}
      // Pointer events are gated by the parent's fade — when invisible,
      // the button cannot be clicked, so it never intercepts wheel/drag.
      style={{ pointerEvents: visible ? "auto" : "none" }}
      className={`absolute ${isLeft ? "left-1.5" : "right-1.5"} top-1/2 -translate-y-1/2 cursor-pointer p-0 bg-transparent border-0 outline-none focus:outline-none`}
    >
      <div
        className="flex items-center justify-center rounded-full bg-gray-800/75 shadow-[0_2px_6px_rgba(0,0,0,0.18)] backdrop-blur-[2px]"
        style={{ width: 22, height: 22 }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/90"
        >
          {isLeft ? (
            <polyline points="15 6 9 12 15 18" />
          ) : (
            <polyline points="9 6 15 12 9 18" />
          )}
        </svg>
      </div>
    </motion.button>
  );
}

function DockObjectPicker({ objects, selectedId, onSelect }: DockObjectPickerProps) {
  // mouseX is a SHARED motion value. We update it directly in the handler
  // (no React state), so pointer moves are GPU-friendly and never cause
  // a re-render of this list.
  const mouseX = useMotionValue<number>(Number.POSITIVE_INFINITY);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track mouse position in viewport space (matches getBoundingClientRect).
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      mouseX.set(e.clientX);
    },
    [mouseX]
  );

  const handleMouseLeave = useCallback(() => {
    // Park the cursor far away so the spring returns every item to BASE_EMOJI.
    mouseX.set(Number.POSITIVE_INFINITY);
  }, [mouseX]);

  // Scroll the picker ~3–4 items in either direction. We use the first
  // item's actual rendered width (ITEM_SIZE + gap) so the offset stays
  // correct even if the gap or item size changes in the future.
  const handleScrollRight = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const gapPx = 36; // matches gap-9 (2.25rem)
    const step = (ITEM_SIZE + gapPx) * 3.5; // ~3–4 items
    el.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  const handleScrollLeft = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const gapPx = 36; // matches gap-9 (2.25rem)
    const step = (ITEM_SIZE + gapPx) * 3.5; // ~3–4 items
    el.scrollBy({ left: -step, behavior: "smooth" });
  }, []);

  // ── Scroll indicator state ──
  // Only re-renders on scroll / resize, never on pointer move.
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      // 2px of slack so sub-pixel rounding doesn't keep the chevron visible.
      const overflow = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setCanScrollRight(overflow > 2);
      setCanScrollLeft(el.scrollLeft > 2);
    };

    update();

    el.addEventListener("scroll", update, { passive: true });

    // Re-check on resize and when the objects prop changes (length may differ).
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Also re-check after a tick to catch fonts/layout settling.
    const t = setTimeout(update, 50);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      clearTimeout(t);
    };
  }, [objects]);

  // Keep the container height stable and tall enough for the selected dot.
  // The button itself is ITEM_SIZE tall; we add room below for the dot.
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex-1 min-w-0 overflow-hidden"
      style={{ height: ITEM_SIZE + DOT_SIZE + DOT_GAP + 2, minHeight: ITEM_SIZE + DOT_SIZE + DOT_GAP + 2 }}
    >
      <div
        ref={scrollRef}
        className="flex items-end gap-9 overflow-x-auto overflow-y-hidden scrollbar-none h-full pl-6 pb-4"
      >
        {objects.map((obj) => (
          <DockItem
            key={obj.id}
            obj={obj}
            mouseX={mouseX}
            selected={selectedId === obj.id}
            onClick={() => onSelect(obj.id)}
          />
        ))}
      </div>
      <ScrollIndicator visible={canScrollLeft} direction="left" onClick={handleScrollLeft} />
      <ScrollIndicator visible={canScrollRight} direction="right" onClick={handleScrollRight} />
    </div>
  );
}

export default function WorldPage() {
  const router = useRouter();
  const { guest, isLoaded, clearGuest } = useGuest();
  const { submitThrow } = useThrows();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryPopupCode, setCountryPopupCode] = useState<string | null>(null);
  const [showCountryPopup, setShowCountryPopup] = useState(false);
  const [isThrowing, setIsThrowing] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string>("tomato");
  const [reason, setReason] = useState("");
  const [heatData, setHeatData] = useState<Record<string, number>>({});
  const [onlineCount, setOnlineCount] = useState(0);
  const [highlightedCountry, setHighlightedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [showMapAlert, setShowMapAlert] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const throwBtnRef = useRef<HTMLButtonElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null);
  const throwsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Redirect if no guest
  useEffect(() => {
    if (isLoaded && !guest) {
      router.replace("/");
    }
  }, [isLoaded, guest, router]);

  // ── User Presence (online tracking) ──
  useEffect(() => {
    if (!isLoaded || !guest || !isSupabaseConfigured) return;

    // Mark user online — first ensure the guest row exists in Supabase
    const markOnline = async () => {
      try {
        // CRITICAL: Ensure the guest row exists in the DB BEFORE referencing it
        // as a foreign key in user_presence. Without this, the upsert fails
        // with FK violation 23503 when the async upsertGuest hasn't completed yet.
        const guestOk = await ensureGuestExists(guest);

        await upsertPresence({
          guest_id: guest.id,
          nickname: guest.nickname,
          country: guest.country,
        });
        setPresenceError(null);
      } catch (err) {
        const errInfo = err instanceof Error ? err.message : String(err);
        setPresenceError(`Sync issue: ${errInfo}`);
      }
    };

    markOnline();

    // Heartbeat every 30 seconds — ensures presence stays fresh
    heartbeatRef.current = setInterval(async () => {
      try {
        // Re-ensure guest exists before heartbeat upsert (safety net)
        await ensureGuestExists(guest);
        await upsertPresence({
          guest_id: guest.id,
          nickname: guest.nickname,
          country: guest.country,
        });
      } catch (err) {
        // Heartbeat errors are non-critical — silently ignore
      }
    }, 30000);

    // Fetch initial online count
    const updateOnlineCount = async () => {
      try {
        const users = await fetchOnlineUsers();
        setOnlineCount(users.length);
      } catch {
        // Silently handle
      }
    };
    updateOnlineCount();

    // Subscribe to presence changes
    presenceUnsubscribeRef.current = subscribeToPresence(
      async () => {
        try {
          const users = await fetchOnlineUsers();
          setOnlineCount(users.length);
        } catch {
          // Silently handle
        }
      },
      () => {}
    );

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (presenceUnsubscribeRef.current) {
        presenceUnsubscribeRef.current();
      }
      // Remove presence when leaving
      removePresence(guest.id).catch(() => {});
    };
  }, [isLoaded, guest]);

  // ── Heat Data with Realtime Updates ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadHeatData = async () => {
      try {
        const data = await fetchHeatData();
        setHeatData(data);
      } catch {
        // silently handle
      }
    };

    loadHeatData();

    // Subscribe to new throws to update heat data in realtime
    throwsUnsubscribeRef.current = subscribeToThrows(
      (newThrow) => {
        setHeatData((prev) => ({
          ...prev,
          [newThrow.target_country]: (prev[newThrow.target_country] || 0) + 1,
        }));
      },
      () => {}
    );

    return () => {
      if (throwsUnsubscribeRef.current) {
        throwsUnsubscribeRef.current();
      }
    };
  }, []);

  // Auto-dismiss the map alert after 2 seconds
  useEffect(() => {
    if (!showMapAlert) return;
    const timer = setTimeout(() => setShowMapAlert(false), 2000);
    return () => clearTimeout(timer);
  }, [showMapAlert]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    if (guest && isSupabaseConfigured) {
      try {
        await removePresence(guest.id);
      } catch {
        // silently handle
      }
    }
    clearGuest();
    router.replace("/");
  }, [clearGuest, guest, router]);

  const handleCountryClick = useCallback((code: string) => {
    setSelectedCountry((prev) => (prev === code ? null : code));
  }, []);

  const handleSearchCountry = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        const normalized = query.toLowerCase().trim();
        const found = getCountryByCode(query.toUpperCase()) || getCountryByCode(query);
        if (found) {
          setHighlightedCountry(found.code);
        } else {
          const foundByName = COUNTRIES.find(
            (c) => c.name.toLowerCase().includes(normalized) || c.code.toLowerCase() === normalized
          );
          if (foundByName) {
            setHighlightedCountry(foundByName.code);
          } else {
            setHighlightedCountry(null);
          }
        }
      } else {
        setHighlightedCountry(null);
      }
    },
    []
  );

  const handleSearchConfirm = useCallback(
    (query: string) => {
      const normalized = query.toLowerCase().trim();
      const found = getCountryByCode(query.toUpperCase()) || getCountryByCode(query);
      if (found) {
        setSelectedCountry(found.code);
        setHighlightedCountry(null);
        setSearchQuery("");
        return;
      }
      const foundByName = COUNTRIES.find(
        (c) => c.name.toLowerCase().includes(normalized) || c.code.toLowerCase() === normalized
      );
      if (foundByName) {
        setSelectedCountry(foundByName.code);
        setHighlightedCountry(null);
        setSearchQuery("");
      }
    },
    []
  );

  const handleThrow = useCallback(
    async (objectId: string, reason: string) => {
      if (!guest || isThrowing) return;
      if (!selectedCountry) {
        setShowMapAlert(true);
        return;
      }
      setIsThrowing(true);

      const mapEl = mapRef.current;
      const btnEl = throwBtnRef.current;
      let startX = window.innerWidth * 0.5;
      let startY = window.innerHeight * 0.7;
      let targetX = window.innerWidth * 0.4;
      let targetY = window.innerHeight * 0.3;

      if (btnEl) {
        const r = btnEl.getBoundingClientRect();
        startX = r.left + r.width / 2;
        startY = r.top + r.height / 2;
      }
      if (mapEl) {
        const r = mapEl.getBoundingClientRect();
        targetX = r.left + r.width / 2;
        targetY = r.top + r.height / 3;
      }

      const obj = getObjectById(objectId);
      if (obj) {
        triggerThrowAnimation(obj.emoji, startX, startY, targetX, targetY, obj.particleColor);
      }

      // CRITICAL: Ensure the guest row exists in Supabase before inserting
      // a throw that references guest_id as a foreign key.
      try {
        await ensureGuestExists(guest);
      } catch {
        setIsThrowing(false);
        return;
      }

      const success = await submitThrow(guest.id, guest.nickname, guest.country, selectedCountry, objectId, reason);
      setIsThrowing(false);

      if (success && selectedCountry) {
        setHeatData((prev) => ({ ...prev, [selectedCountry]: (prev[selectedCountry] || 0) + 1 }));
        setReason("");
      }
    },
    [guest, selectedCountry, submitThrow, isThrowing]
  );

  if (!isLoaded || !guest) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B1120]">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-2 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-orange-500 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <p className="text-sm text-white/60">Preparing the world...</p>
        </motion.div>
      </div>
    );
  }

  const guestCountry = getCountryByCode(guest.country);
  const targetCountry = selectedCountry ? getCountryByCode(selectedCountry) : null;

  return (
    <div className="h-screen flex flex-col ambient-bg grid-bg overflow-hidden">
      {/* Fixed throw animation layer - always on top */}
      <ThrowAnimation />

      {/* Header */}
      <div className="shrink-0">
        <Navigation
          nickname={guest.nickname}
          countryFlag={guestCountry?.flag || "🌍"}
          onlineCount={onlineCount}
          selectedCountryName={targetCountry?.name || null}
          selectedCountryFlag={targetCountry?.flag || null}
          onSearchCountry={handleSearchCountry}
          onSearchConfirm={handleSearchConfirm}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile search */}
      <div className="md:hidden shrink-0 px-4 pt-3 pb-1">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchCountry(e.target.value)}
            placeholder="Search countries..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white border border-[#E5E7EB] text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {/* Connection status banner */}
      {presenceError && (
        <div className="shrink-0 px-4 py-1 bg-yellow-50 border-b border-yellow-100">
          <p className="text-[10px] font-medium text-yellow-700 text-center">
            {presenceError} — data will still sync
          </p>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="flex-1 min-h-0 px-3 md:px-4 pt-3 pb-3 md:pb-4">
        <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* LEFT — Leaderboard */}
          <div className="hidden md:flex md:col-span-3 min-h-0">
            <div className="w-full min-h-0">
              <Leaderboard />
            </div>
          </div>

          {/* CENTER — Map + Bottom Throw Bar */}
          <div className="col-span-1 md:col-span-6 min-h-0 flex flex-col gap-3 md:gap-4">
            <div className="flex-1 min-h-0 rounded-2xl border border-[#E5E7EB] bg-white/70 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden">
              {/* Map title header strip */}
              <div className="shrink-0 flex items-center justify-center border-b border-[#E5E7EB]/60 px-4 py-2.5">
                <span className="text-[22px] font-bold text-[#2D3748] tracking-[0.3px] leading-none">
                  🌍 World Map
                </span>
              </div>
              {/* Map */}
              <div ref={mapRef} className="flex-1 relative min-h-0">
                <div className="absolute inset-0">
                  <WorldMap
                    heatData={heatData}
                    selectedCountry={selectedCountry}
                    highlightedCountry={highlightedCountry}
                    onCountryClick={handleCountryClick}
                    onBackgroundClick={() => setSelectedCountry(null)}
                  />
                </div>
                {showMapAlert && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  >
                    <div className="bg-black/65 backdrop-blur-sm text-red-400 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg select-none">
                      Select a country to throw
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* BOTTOM BAR — Throw panel */}
            <div className="shrink-0">
              <div className="rounded-2xl bg-white/85 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <DockObjectPicker
                      objects={THROWABLE_OBJECTS}
                      selectedId={selectedObject}
                      onSelect={setSelectedObject}
                    />
                  </div>

                  <div className="hidden md:block w-px h-10 bg-gray-200" />

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[\r\n]+/g, " ");
                          if (value.length <= 50) {
                            setReason(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && selectedCountry && !isThrowing) {
                            e.preventDefault();
                            handleThrow(selectedObject, reason);
                          }
                        }}
                        placeholder="Reason (optional)"
                        maxLength={50}
                        disabled={!selectedCountry}
                        className="h-10 w-32 md:w-44 px-3 rounded-full bg-white border border-[#E5E7EB] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                      />
                    </div>
                    <motion.button
                      ref={throwBtnRef}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleThrow(selectedObject, reason)}
                      className="h-10 px-4 md:px-5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow flex items-center gap-1.5"
                    >
                      {isThrowing ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"
                          />
                          <span>Throwing…</span>
                        </>
                      ) : (
                        <>
                          <span>Throw!</span>
                          <span className="text-base leading-none">🚀</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Live Feed */}
          <div className="hidden md:flex md:col-span-3 min-h-0">
            <div className="w-full min-h-0">
              <LiveFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile leaderboard/feed */}
      <div className="md:hidden shrink-0 px-3 pb-3 grid grid-cols-2 gap-3">
        <Leaderboard />
        <LiveFeed />
      </div>

      {/* Country Popup */}
      <CountryPopup
        isOpen={showCountryPopup}
        countryCode={countryPopupCode}
        onClose={() => setShowCountryPopup(false)}
      />
    </div>
  );
}