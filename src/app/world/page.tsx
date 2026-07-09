"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Navigation } from "@/components/world/Navigation";
import FullscreenLeaderboard from "@/components/world/FullscreenLeaderboard";

import { LiveFeed } from "@/components/world/LiveFeed";
import { Leaderboard } from "@/components/world/Leaderboard";
import { SpaceBackground } from "@/components/world/SpaceBackground";
import { ThrowAnimation, triggerThrowAnimation } from "@/components/world/ThrowAnimation";
import { useGuest } from "@/hooks/useGuest";
import { useThrows } from "@/hooks/useThrows";
import { THROWABLE_OBJECTS, getObjectById } from "@/data/objects";
import {
  upsertPresence,
  removePresence,
  fetchOnlineUsers,
  subscribeToPresence,
  isSupabaseConfigured,
  ensureGuestExists,
  insertProfile,
  fetchProfileByGuestId,
} from "@/lib/supabase";
import type { ThrowableObject } from "@/lib/types";

import { IndividualView } from "@/components/individual/IndividualView";
import { CreateButton } from "@/components/individual/CreateButton";
import { CreateProfileModal } from "@/components/individual/CreateProfileModal";

import type { ProfileWithFallback } from "@/hooks/useProfiles";

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

const ITEM_SIZE = 32;        // px — fixed hit-target / button frame (keeps layout stable)
const BASE_EMOJI = 22;       // px — base emoji size (slightly smaller so tall emojis fit)
const PEAK_EMOJI = 34;       // px — peak emoji size at the cursor (still fits in item frame)
const DOT_SIZE = 8;          // px — selected indicator dot
const DOT_GAP = 14;          // px — extra vertical room for the dot (used in container height calc)
const RANGE_PX = 80;         // px — how far the magnification wave reaches either side

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
            bottom: -12,
            transform: "translateX(-50%)",
            backgroundColor: "#FFFFFF",
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
    const gapPx = 24; // reduced gap to match smaller items (~1.5rem)
    const step = (ITEM_SIZE + gapPx) * 3.5; // ~3–4 items
    el.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  const handleScrollLeft = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const gapPx = 24; // reduced gap to match smaller items (~1.5rem)
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
          className="flex items-end gap-6 overflow-x-auto overflow-y-hidden scrollbar-none h-full pl-6 pb-4"
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
  const [isThrowing, setIsThrowing] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string>("tomato");
  const [reason, setReason] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<ProfileWithFallback | null>(null);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [showSelectIndividualAlert, setShowSelectIndividualAlert] = useState(false);
  const throwBtnRef = useRef<HTMLButtonElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null);

  // Redirect if no guest
  useEffect(() => {
    if (isLoaded && !guest) {
      router.replace("/");
    }
  }, [isLoaded, guest, router]);

  const openLeaderboard = () => setLeaderboardOpen(true);
  const closeLeaderboard = () => setLeaderboardOpen(false);

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



  // Auto-dismiss the select-individual alert after 2 seconds
  useEffect(() => {
    if (!showSelectIndividualAlert) return;
    const t = setTimeout(() => setShowSelectIndividualAlert(false), 2000);
    return () => clearTimeout(t);
  }, [showSelectIndividualAlert]);

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



  const handleProfileSelect = useCallback((profile: ProfileWithFallback | null) => {
    console.log('[DEBUG handleProfileSelect] profile:', profile?.id, 'isDummy:', profile?.isDummy, 'nickname:', profile?.nickname);
    setSelectedPerson(profile);
    if (profile) {
      setSelectedCountry(profile.country);
    } else {
      setSelectedCountry(null);
    }
  }, []);

  const handleCreateProfile = useCallback(async (data: {
    nickname: string;
    profile_image: string;
    profession: string;
    country: string;
  }) => {
    if (!guest) return;
    setIsCreatingProfile(true);
    try {
      // Check if this guest already has a profile — prevent duplicates
      const existing = await fetchProfileByGuestId(guest.id);
      if (existing) {
        console.log('[CreateProfile] Guest already has a profile:', existing.id, '— selecting existing');
        setShowCreateModal(false);
        handleProfileSelect(existing);
        return;
      }

      const id = await insertProfile({
        guest_id: guest.id,
        nickname: data.nickname,
        profile_image: data.profile_image,
        profession: data.profession,
        country: data.country,
        city: "",
        bio: "",
        social_link: "",
      });
      if (id) {
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error("Failed to create profile:", err);
    }
    setIsCreatingProfile(false);
  }, [guest]);

  const handleThrow = useCallback(
    async (objectId: string, reason: string) => {
      if (!guest || isThrowing) return;

      // Check if we have a target (person's country)
      const target = selectedPerson?.country || selectedCountry;
      if (!target) {
        setShowSelectIndividualAlert(true);
        return;
      }

      setIsThrowing(true);

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

      // DEBUG: Check what selectedPerson looks like right now
      console.log('[DEBUG handleThrow] selectedPerson:', selectedPerson?.id, 'isDummy:', selectedPerson?.isDummy, 'nickname:', selectedPerson?.nickname);

      // Only pass target_profile_id for real (non-dummy) profiles —
      // dummy profile IDs don't exist in the Supabase table and would
      // cause a foreign key violation, silently failing the throw.
      const targetProfileId = selectedPerson && !selectedPerson.isDummy ? selectedPerson.id : undefined;
      console.log('[DEBUG handleThrow] targetProfileId:', targetProfileId);
      console.log('[DEBUG handleThrow] calling submitThrow with targetProfileId:', targetProfileId);
      const success = await submitThrow(guest.id, guest.nickname, guest.country, target, objectId, reason, targetProfileId);
      setIsThrowing(false);

      if (success && target) {
        setReason("");
      }
    },
    [guest, selectedCountry, selectedPerson, submitThrow, isThrowing]
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

  if (leaderboardOpen) {
    return (
      <div className="min-h-screen md:h-screen flex flex-col bg-[#03040A] overflow-hidden">
        <SpaceBackground />
        <Navigation
          nickname={guest.nickname}
          countryFlag={"🌍"}
          onlineCount={onlineCount}
          onLogout={handleLogout}
          showBackButton={true}
          onBackFromLeaderboard={closeLeaderboard}
        />

        <div className="flex-1 relative">
          <FullscreenLeaderboard />
        </div>
      </div>
    );
  }
  const hasTarget = Boolean(selectedPerson?.country || selectedCountry);

  return (
    <div className="min-h-screen md:h-screen flex flex-col bg-[#03040A] overflow-y-auto md:overflow-hidden">
      {/* Space background - fixed behind everything */}
      <SpaceBackground />

      {/* Fixed throw animation layer - always on top */}
      <ThrowAnimation />

      {/* ────────────────────────────────────────────────── */}
      {/* MOBILE: first screen = 100dvh                       */}
      {/* Nav → Search → Map (flex:1) → Throw (bottom)       */}
      {/* ────────────────────────────────────────────────── */}
      <div className="relative md:hidden flex flex-col" style={{ height: "100dvh" }}>
        {/* Nav */}
        <div className="shrink-0">
          <Navigation
            nickname={guest.nickname}
            countryFlag={"🌍"}
            onlineCount={onlineCount}
            onLogout={handleLogout}
          />
        </div>



        {/* Connection banner */}
        {presenceError && (
          <div className="shrink-0 px-4 py-1 bg-yellow-50 border-b border-yellow-100">
            <p className="text-[10px] font-medium text-yellow-700 text-center">
              {presenceError} — data will still sync
            </p>
          </div>
        )}

        {/* Controls row: Back, Leaderboard, Create */}
        <div className="relative z-20 shrink-0 px-4 pt-1 pb-0.5">
          <div className="flex items-center justify-between gap-2">
            {selectedPerson ? (
              <motion.button
                onClick={() => handleProfileSelect(null)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                </svg>
              </motion.button>
            ) : (
              <>
                <button
                  onClick={openLeaderboard}
                  className="flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200 text-sm text-white/90 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
                    <path d="M5 8a3 3 0 003 3" />
                    <path d="M19 8a3 3 0 01-3 3" />
                    <path d="M9 15h6" />
                    <path d="M12 15v4" />
                    <path d="M7 19h10" />
                  </svg>
                  <span>Leaderboard</span>
                </button>
                <CreateButton onClick={() => setShowCreateModal(true)} />
              </>
            )}
          </div>
        </div>

        {/* Content — Individual View */}
        <div className="flex-1 min-h-0 mx-4 mt-1 mb-0 overflow-hidden relative">
          <IndividualView
            selectedProfile={selectedPerson}
            onSelectProfile={handleProfileSelect}
            selectedProfileIndex={selectedProfileIndex}
          />
          {showSelectIndividualAlert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            >
              <div className="bg-transparent border-2 border-red-500 text-red-500 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg select-none">Select individual to throw</div>
            </motion.div>
          )}
        </div>

        {/* Throw panel — pinned to bottom */}
        <div className="shrink-0 px-4 pt-3 pb-3">
          <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.18)] p-3">
            <div className="flex flex-col gap-3">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <DockObjectPicker
                  objects={THROWABLE_OBJECTS}
                  selectedId={selectedObject}
                  onSelect={setSelectedObject}
                />
              </div>
              <div className="flex items-center gap-2 w-full">
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
                    if (e.key === "Enter" && hasTarget && !isThrowing) {
                      e.preventDefault();
                      handleThrow(selectedObject, reason);
                    }
                  }}
                  placeholder="Reason (optional)"
                  maxLength={50}
                  disabled={!hasTarget}
                  className="h-10 flex-1 min-w-0 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sm text-white/90 placeholder-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.12)] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 disabled:opacity-50"
                />
                <motion.button
                  ref={throwBtnRef}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleThrow(selectedObject, reason)}
                  disabled={!hasTarget}
                  className={`h-10 px-5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow flex items-center gap-1.5 shrink-0 ${
                    !hasTarget ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
                  }`}
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

      {/* ────────────────────────────────────────────────── */}
      {/* DESKTOP: existing grid layout                       */}
      {/* ────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-col flex-1 min-h-0">
        <div className="shrink-0">
          <Navigation
            nickname={guest.nickname}
            countryFlag={"🌍"}
            onlineCount={onlineCount}
            onLogout={handleLogout}
          />
        </div>

        {/* Connection banner */}
        {presenceError && (
          <div className="shrink-0 px-4 py-1 bg-yellow-50 border-b border-yellow-100">
            <p className="text-[10px] font-medium text-yellow-700 text-center">
              {presenceError} — data will still sync
            </p>
          </div>
        )}

        {/* Controls row: Back, Leaderboard, Create */}
        <div className="shrink-0 px-3 md:px-4 pt-2 pb-0">
          <div className="flex items-center justify-between gap-2">
            {selectedPerson ? (
              <motion.button
                onClick={() => handleProfileSelect(null)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                </svg>
              </motion.button>
            ) : (
              <>
                <button
                  onClick={openLeaderboard}
                  className="flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200 text-sm text-white/90 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
                    <path d="M5 8a3 3 0 003 3" />
                    <path d="M19 8a3 3 0 01-3 3" />
                    <path d="M9 15h6" />
                    <path d="M12 15v4" />
                    <path d="M7 19h10" />
                  </svg>
                  <span>Leaderboard</span>
                </button>
                <CreateButton onClick={() => setShowCreateModal(true)} />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 px-3 md:px-4 pt-3 pb-3 md:pb-4">
          <div className="h-full grid grid-cols-12 gap-3 md:gap-4">
            {/* LEFT — Leaderboard */}
            <div className="col-span-3 min-h-0">
              <div className="w-full min-h-0">
                <Leaderboard />
              </div>
            </div>

            {/* CENTER — Map + Throw */}
            <div className="col-span-6 min-h-0 flex flex-col gap-3 md:gap-4">
              {/* Content — Individual View */}
              <div className="flex-1 min-h-0 overflow-hidden relative">
                <IndividualView
                  selectedProfile={selectedPerson}
                  onSelectProfile={handleProfileSelect}
                  selectedProfileIndex={selectedProfileIndex}
                />
                {showSelectIndividualAlert && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
                  >
                    <div className="bg-red-600 text-white rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg select-none">
                      Select individual to throw
                    </div>
                  </motion.div>
                )}
              </div>

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
                    <div className="flex items-center gap-2">
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
                          if (e.key === "Enter" && hasTarget && !isThrowing) {
                            e.preventDefault();
                            handleThrow(selectedObject, reason);
                          }
                        }}
                        placeholder="Reason (optional)"
                        maxLength={50}
                        disabled={!hasTarget}
                        className="h-10 w-44 min-w-0 px-4 rounded-full bg-white border border-[#E5E7EB] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                      />
                      <motion.button
                        ref={throwBtnRef}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleThrow(selectedObject, reason)}
                        disabled={!hasTarget}
                        className={`h-10 px-5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow flex items-center gap-1.5 ${
                          !hasTarget ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
                        }`}
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
            <div className="col-span-3 min-h-0">
              <div className="w-full min-h-0">
                <LiveFeed />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile below-fold leaderboard moved to fullscreen via the leaderboard button */}

      {/* Create Profile Modal */}
      <CreateProfileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProfile}
        isSubmitting={isCreatingProfile}
      />
    </div>
  );
}
