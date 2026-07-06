"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Navigation } from "@/components/world/Navigation";
import { WorldMap } from "@/components/world/WorldMap";
import { LiveFeed } from "@/components/world/LiveFeed";
import { Leaderboard } from "@/components/world/Leaderboard";
import { CountryPopup } from "@/components/world/CountryPopup";
import { ThrowAnimation, triggerThrowAnimation } from "@/components/world/ThrowAnimation";
import { useGuest } from "@/hooks/useGuest";
import { useThrows } from "@/hooks/useThrows";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";
import { supabase, DbThrow } from "@/lib/supabase";

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
  const [onlineCount, setOnlineCount] = useState(42);
  const [highlightedCountry, setHighlightedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const throwBtnRef = useRef<HTMLButtonElement>(null);

  // Redirect if no guest
  useEffect(() => {
    if (isLoaded && !guest) {
      router.replace("/");
    }
  }, [isLoaded, guest, router]);

  // Fetch heat data
  useEffect(() => {
    const fetchHeatData = async () => {
      try {
        const { data, error } = await supabase
          .from("throws")
          .select("target_country");
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data as DbThrow[]).forEach((t) => {
          counts[t.target_country] = (counts[t.target_country] || 0) + 1;
        });
        setHeatData(counts);
      } catch {
        // silently handle
      }
    };
    fetchHeatData();
    const interval = setInterval(fetchHeatData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Simulate online count
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.max(10, prev + Math.floor(Math.random() * 6) - 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    clearGuest();
    router.replace("/");
  }, [clearGuest, router]);

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
          // Highlight as suggestion only, don't auto-select
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
      if (!guest || !selectedCountry) return;
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

      const success = await submitThrow(guest.id, guest.nickname, guest.country, selectedCountry, objectId, reason);
      setIsThrowing(false);

      if (success && selectedCountry) {
        setHeatData((prev) => ({ ...prev, [selectedCountry]: (prev[selectedCountry] || 0) + 1 }));
      }
    },
    [guest, selectedCountry, submitThrow]
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

      {/* Header - fixed height, shrink-0 prevents stretching */}
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
            {/* Map container - feels like one rounded unit */}
            <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white/70 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div ref={mapRef} className="absolute inset-0">
                <WorldMap
                  heatData={heatData}
                  selectedCountry={selectedCountry}
                  highlightedCountry={highlightedCountry}
                  onCountryClick={handleCountryClick}
                  onBackgroundClick={() => setSelectedCountry(null)}
                />
              </div>

            </div>

            {/* BOTTOM BAR — Throw panel compact horizontal under the map */}
            <div className="shrink-0">
              <div className="rounded-2xl bg-white/85 backdrop-blur-sm border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Throw objects */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0 mr-1">Throw</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: "tomato", emoji: "🍅", name: "Tomato" },
                        { id: "snowball", emoji: "⛄", name: "Snowball" },
                        { id: "flower", emoji: "🌸", name: "Flower" },
                        { id: "pizza", emoji: "🍕", name: "Pizza" },
                        { id: "rock", emoji: "🪨", name: "Rock" },
                        { id: "love", emoji: "💖", name: "Love" },
                        { id: "fireball", emoji: "🔥", name: "Fireball" },
                        { id: "money", emoji: "💸", name: "Money" },
                      ].map((obj) => {
                        const active = selectedObject === obj.id;
                        return (
                          <button
                            key={obj.id}
                            onClick={() => setSelectedObject(obj.id)}
                            title={obj.name}
                            className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-200 border ${
                              active
                                ? "bg-gradient-to-br from-orange-500 to-pink-500 border-transparent shadow-md scale-105"
                                : "bg-white border-[#E5E7EB] hover:border-orange-300 hover:bg-orange-50"
                            }`}
                          >
                            <span className="leading-none">{obj.emoji}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-10 bg-gray-200" />

                  {/* Right: reason + throw button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 60))}
                      placeholder='Reason (optional)'
                      maxLength={60}
                      disabled={!selectedCountry}
                      className="h-10 w-32 md:w-44 px-3 rounded-full bg-white border border-[#E5E7EB] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                    />
                    <motion.button
                      ref={throwBtnRef}
                      whileTap={{ scale: 0.95 }}
                      disabled={!selectedCountry || isThrowing}
                      onClick={() => handleThrow(selectedObject, reason)}
                      className="h-10 px-4 md:px-5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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

      {/* Mobile leaderboard/feed - below the map */}
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